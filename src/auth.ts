/**
 * src/auth.ts — Auth.js v5 (NextAuth beta) configuration
 *
 * Security properties:
 *  - Passwords compared with bcrypt.compare() — NEVER string equality
 *  - JWT strategy with 7-day maxAge
 *  - Secure, httpOnly, sameSite cookies
 *  - Email-verified guard: unverified users get `emailVerified: false`
 *    in their session token; proxy.ts redirects them accordingly
 *  - No sensitive fields (passwordHash, tokens) ever reach the session
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { findUserByEmail, upsertOAuthUser } from "@/lib/user-store";
import { loginSchema }                      from "@/lib/validation";
import { authLogger }                       from "@/lib/logger";
import {
  trackFailedLogin,
  clearFailedLogins,
} from "@/lib/anomaly-detection";
import { env }                              from "@/lib/env";
import { encrypt }                          from "@/lib/encryption";
import { db }                               from "@/lib/db";

const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── Secrets & trust ──────────────────────────────────────────────
  secret:    env.AUTH_SECRET,
  trustHost: true,

  // ── Session ───────────────────────────────────────────────────────
  session: {
    strategy: "jwt",
    maxAge:   SESSION_DURATION,
    updateAge: 24 * 60 * 60, // reissue JWT once per day
  },

  // ── JWT ───────────────────────────────────────────────────────────
  jwt: {
    maxAge: SESSION_DURATION,
  },

  // ── Cookies ───────────────────────────────────────────────────────
  // Auth.js sets httpOnly automatically; we harden sameSite + secure.
  cookies: {
    sessionToken: {
      name: env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path:     "/",
        secure:   env.NODE_ENV === "production",
      },
    },
  },

  // ── Custom pages ──────────────────────────────────────────────────
  pages: {
    signIn:        "/login",
    signOut:       "/login",
    error:         "/login",
    verifyRequest: "/verify-email",
    newUser:       "/signup",
  },

  // ── Providers ─────────────────────────────────────────────────────
  providers: [
    // ── Credentials ────────────────────────────────────────────────
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // 1. Validate schema (server-side; client validation is UX only)
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const identifier = email.toLowerCase(); // rate-limit key

        // 2. Lookup user — use constant-time path regardless of outcome
        const user = await findUserByEmail(email);

        // 3. Always run bcrypt.compare even when user not found to
        //    prevent timing-based user enumeration attacks.
        const DUMMY_HASH = "$2a$12$dummyhashfortimingequalisation..................."
        const passwordValid = user
          ? await bcrypt.compare(password, user.passwordHash)
          : await bcrypt.compare(password, DUMMY_HASH).then(() => false);

        if (!user || !passwordValid) {
          // Track failure for brute-force detection
          trackFailedLogin(identifier);
          authLogger.warn({
            event:    "auth.signin.failed",
            email:    email.replace(/@.*/, "@[hidden]"),
            reason:   !user ? "user_not_found" : "invalid_password",
          });
          return null;
        }

        // 4. Success — clear failure counter, log event
        clearFailedLogins(identifier);
        authLogger.info({
          event:    "auth.signin.success",
          userId:   user.id,
          provider: "credentials",
        });

        // 5. Return minimal user object — no passwords, no tokens
        return {
          id:            user.id,
          name:          user.name,
          email:         user.email,
          image:         user.image ?? null,
          emailVerified: user.emailVerified,
        };
      },
    }),

    // ── Google OAuth ────────────────────────────────────────────────
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId:     env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                // Request Gmail read access alongside basic profile
                scope: [
                  "openid",
                  "profile",
                  "email",
                  "https://www.googleapis.com/auth/gmail.readonly",
                ].join(" "),
                access_type: "offline", // request refresh token
                prompt:      "consent", // always show consent to get refresh token
              },
            },
            profile(profile) {
              return {
                id:            profile.sub,
                name:          profile.name,
                email:         profile.email,
                image:         profile.picture,
                emailVerified: true,
              };
            },
          }),
        ]
      : []),
  ],

  // ── Events ────────────────────────────────────────────────────────
  events: {
    async signIn({ user, account }) {
      authLogger.info({
        event:    "auth.signin",
        userId:   user.id,
        provider: account?.provider ?? "unknown",
      });
    },
    async signOut(message) {
      // Auth.js v5 JWT-strategy passes { token: JWT } to the signOut event.
      // The type is not exported, so we use a minimal local interface.
      const token = (message as { token?: { sub?: string } }).token;
      authLogger.info({
        event:  "auth.signout",
        userId: token?.sub ?? "unknown",
      });
    },
    async createUser({ user }) {
      authLogger.info({
        event:  "auth.user.created",
        userId: user.id,
        email:  user.email?.replace(/@.*/, "@[hidden]"),
      });
    },
  },

  // ── Callbacks ─────────────────────────────────────────────────────
  callbacks: {
    /**
     * Runs on every sign-in attempt before the JWT is issued.
     * For Google OAuth: upsert the user in Supabase so they always
     * have a database record. Blocks sign-in if the DB write fails.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && profile) {
        try {
          const dbUser = await upsertOAuthUser({
            email:      profile.email!,
            name:       profile.name ?? user.name ?? "Google User",
            image:      profile.picture as string | undefined,
            providerId: profile.sub!,
          });
          user.id    = dbUser.id;
          user.email = dbUser.email;
          user.name  = dbUser.name;
          user.image = dbUser.image ?? undefined;

          // Store encrypted Gmail tokens so scanner can use them later
          if (account.access_token) {
            await db.gmailToken.upsert({
              where:  { userId: dbUser.id },
              create: {
                userId:               dbUser.id,
                encryptedAccessToken:  encrypt(account.access_token),
                encryptedRefreshToken: account.refresh_token ? encrypt(account.refresh_token) : null,
                expiresAt:             account.expires_at ? new Date(account.expires_at * 1000) : null,
                scope:                 account.scope ?? "",
              },
              update: {
                encryptedAccessToken:  encrypt(account.access_token),
                encryptedRefreshToken: account.refresh_token ? encrypt(account.refresh_token) : undefined,
                expiresAt:             account.expires_at ? new Date(account.expires_at * 1000) : null,
                scope:                 account.scope ?? "",
              },
            });
          }

          authLogger.info({ event: "auth.oauth.upsert", userId: dbUser.id, provider: "google" });
        } catch (err) {
          authLogger.error({ event: "auth.oauth.upsert.failed", error: String(err) });
          return false;
        }
      }
      return true;
    },

    /** Persist minimal, non-sensitive fields in the JWT */
    async jwt({ token, user, account }) {
      if (user) {
        token.id      = user.id;
        token.email   = user.email;
        token.name    = user.name;
        token.picture = user.image ?? undefined;
        // OAuth users (Google) are always email-verified
        const isOAuth = account?.provider === "google";
        const u = user as typeof user & { emailVerified?: boolean };
        token["szEmailVerified"] = isOAuth ? true : (u.emailVerified ?? false);
      }
      return token;
    },

    /** Expose only safe fields on the client session */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id    = token.id as string;
        session.user.email = token.email as string;
        session.user.name  = (token.name as string) ?? "";
        session.user.image = (token.picture as string) ?? null;
        // Auth.js types emailVerified as Date internally; we use it as a boolean flag.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).emailVerified = Boolean(token["szEmailVerified"]);
      }
      return session;
    },
  },
});
