/**
 * POST /api/auth/forgot-password
 *
 * Issues a password-reset email.
 *
 * Security:
 *  - Rate limited: 3 / hour per IP AND per email
 *  - ALWAYS returns 200 with same body regardless of whether the email
 *    exists — prevents user enumeration
 *  - Reset token is 256-bit random, stored only as SHA-256 hash
 *  - Token expires in 1 hour
 *  - Old token is overwritten on re-request
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";

import { forgotPasswordSchema } from "@/lib/validation";
import { issuePasswordResetToken, canRequestPasswordReset } from "@/lib/user-store";
import { checkForgotLimit, getClientIp } from "@/lib/rate-limit";
import { authLogger }             from "@/lib/logger";
import { trackRateLimitExceeded } from "@/lib/anomaly-detection";

const SUCCESS_BODY = {
  ok: true,
  message: "If that email is registered, a reset link has been sent.",
};

export async function POST(req: NextRequest) {
  // ── 1. Content-Type guard ──────────────────────────────────────────
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  // ── 2. Rate limiting ───────────────────────────────────────────────
  const ip = getClientIp(req);

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    // Return success to prevent email enumeration via validation errors
    return NextResponse.json(SUCCESS_BODY);
  }

  const { email } = parsed.data;

  const rl = await checkForgotLimit(ip, email);
  if (!rl.allowed) {
    trackRateLimitExceeded("/api/auth/forgot-password", ip, rl.retryAfterSecs ?? 3600);
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${rl.retryAfterSecs} seconds.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  // ── 3. User-store rate limit (per-email resend window) ─────────────
  const storeCheck = await canRequestPasswordReset(email);
  if (!storeCheck.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please try again later.` },
      { status: 429 }
    );
  }

  // ── 4. Issue token (returns null for unknown email) ─────────────────
  authLogger.info({
    event: "auth.password_reset.requested",
    email: email.replace(/@.*/, "@[hidden]"),
  });
  const rawToken = await issuePasswordResetToken(email);

  if (rawToken) {
    authLogger.info({ event: "auth.password_reset.token_issued" });
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/reset-password?token=${rawToken}`;
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n📧  [DEV] Password reset link for ${email}:\n    ${resetUrl}\n`);
    }
    // Production: await sendPasswordResetEmail(email, resetUrl);
  }

  // ── 5. Always return the same response ────────────────────────────
  return NextResponse.json(SUCCESS_BODY);
}
