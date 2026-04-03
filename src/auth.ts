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

import { findUserByEmail }  from "@/lib/user-store";
import { loginSchema }      from "@/lib/validation";
import { authLogger }       from "@/lib/logger";
import {
  trackFailedLogin,
  clearFailedLogins,
} from "@/lib/anomaly-detection";
import { env }              from "@/lib/env";

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
            // Google accounts are already verified
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
    /** Persist minimal, non-sensitive fields in the JWT */
    async jwt({ token, user }) {
      if (user) {
        token.id      = user.id;
        token.email   = user.email;
        token.name    = user.name;
        token.picture = user.image ?? undefined;
        // Auth.js JWT.emailVerified is typed as Date — use a custom key for our boolean.
        const u = user as typeof user & { emailVerified?: boolean };
        token["szEmailVerified"] = u.emailVerified ?? false;
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
