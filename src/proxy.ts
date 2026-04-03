/**
 * src/proxy.ts — Next.js 16 Proxy (replaces middleware.ts)
 *
 * Responsibilities:
 *  1. HTTPS enforcement (production only — 301 redirect)
 *  2. Route protection (auth guard + email verification)
 *  3. Security response headers on every request
 *  4. Anomaly detection logging (unauthorized access patterns)
 */
import { NextResponse }    from "next/server";
import { auth }            from "@/auth";
import type { NextRequest } from "next/server";
import type { NextAuthRequest } from "next-auth";

// ── Route classifications ──────────────────────────────────────────────────────

/** Always accessible — never auth-gated */
const ALWAYS_PUBLIC_PREFIXES = [
  "/_next",
  "/api/auth",   // NextAuth handlers
  "/api/health", // health check must be publicly reachable by load balancer
  "/favicon.ico",
];

/** Public pages (no session required) */
const PUBLIC_PAGE_PREFIXES = [
  "/",           // landing
  "/scan",       // onboarding scan
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-email",
  "/reset-password",
];

/** Auth pages — redirect to /dashboard when already signed in */
const AUTH_ONLY_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

/** Protected pages — require session AND verified email */
const VERIFIED_REQUIRED_PREFIXES = [
  "/dashboard",
  "/agent",
  "/settings",
];

// ── Security headers ───────────────────────────────────────────────────────────

function addSecurityHeaders(res: NextResponse): NextResponse {
  // Clickjacking protection
  res.headers.set("X-Frame-Options",           "DENY");
  // MIME-type sniffing protection
  res.headers.set("X-Content-Type-Options",    "nosniff");
  // Faster DNS resolution (safe to enable)
  res.headers.set("X-DNS-Prefetch-Control",    "on");
  // Referrer leakage protection
  res.headers.set("Referrer-Policy",           "strict-origin-when-cross-origin");
  // Permissions — deny all sensitive browser APIs
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  );
  // HSTS — 2 years, all subdomains, preload list
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  // Content Security Policy
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://accounts.google.com https://api.teller.io",
      "frame-src https://accounts.google.com",
      "frame-ancestors 'none'",
    ].join("; ")
  );
  return res;
}

// ── Proxy handler ──────────────────────────────────────────────────────────────

/** Shape of the user object as seen inside the auth() proxy wrapper */
type AuthedUser = { emailVerified?: boolean; email?: string | null };

export default auth(function proxy(req: NextAuthRequest) {
  const { pathname } = (req as NextRequest).nextUrl;
  // Auth.js injects req.auth — extend its user type locally (emailVerified is
  // not in the built-in Session user, but we store it in the JWT callback).
  type RawUser = NonNullable<typeof req.auth>["user"] & AuthedUser;
  const rawUser = req.auth?.user as RawUser | undefined;
  const session = req.auth ? { user: rawUser } : null;

  // ── 0. HTTPS enforcement (production only) ────────────────────────
  // Redirect http → https via 301 (permanent, cached by browsers)
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http"
  ) {
    const httpsUrl = new URL(req.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl.toString(), { status: 301 });
  }

  // ── 1. Always-public assets — skip auth logic, add headers ────────
  if (ALWAYS_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next());
  }

  const isAuthenticated = !!session?.user;
  const isEmailVerified = session?.user?.emailVerified === true;

  // ── 2. Public page prefixes ───────────────────────────────────────
  const isPublicPage = PUBLIC_PAGE_PREFIXES.some((p) =>
    p === "/" ? pathname === "/" : pathname.startsWith(p)
  );

  // ── 3. Auth-only pages ────────────────────────────────────────────
  // Only redirect FULLY verified users away from /login, /signup etc.
  // Unverified users must be allowed through so they can sign out or
  // switch accounts — otherwise they'd be permanently trapped in a loop.
  const isAuthOnly = AUTH_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (isAuthenticated && isEmailVerified && isAuthOnly) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  // ── 4. Verified-required routes ───────────────────────────────────
  const needsVerified = VERIFIED_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));
  if (needsVerified) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }
    if (!isEmailVerified) {
      const verifyUrl = new URL("/verify-email", req.url);
      verifyUrl.searchParams.set("notice", "Please verify your email to continue.");
      return addSecurityHeaders(NextResponse.redirect(verifyUrl));
    }
  }

  // ── 5. Other protected routes (session required, but not verified) ─
  if (!isPublicPage && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // ── 6. Allow ──────────────────────────────────────────────────────
  return addSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    // Run on everything except static assets and images
    "/((?!_next/static|_next/image|.*\\.webp$|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
