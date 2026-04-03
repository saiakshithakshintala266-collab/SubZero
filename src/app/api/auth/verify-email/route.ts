/**
 * POST /api/auth/verify-email
 *   body: { token: string }
 *   Verifies an email address using a one-time token.
 *
 * POST /api/auth/verify-email/resend
 *   body: { email: string }
 *   Resends the verification email (rate-limited).
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";

import { verifyEmailSchema, forgotPasswordSchema, formatZodError } from "@/lib/validation";
import {
  verifyEmail,
  canResendVerification,
  issueVerificationToken,
} from "@/lib/user-store";
import { checkResendLimit, getClientIp } from "@/lib/rate-limit";
import { authLogger }             from "@/lib/logger";
import { trackRateLimitExceeded } from "@/lib/anomaly-detection";

// ── POST /api/auth/verify-email ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  // Detect resend vs verify based on body shape
  const isResend =
    typeof body === "object" &&
    body !== null &&
    "action" in body &&
    (body as Record<string, unknown>)["action"] === "resend";
  if (isResend) {
    return handleResend(req, body);
  }

  // Verify token
  const parsed = verifyEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid or missing token." }, { status: 422 });
  }

  const result = await verifyEmail(parsed.data.token);

  if (!result.ok) {
    if (result.error === "expired") {
      authLogger.warn({ event: "auth.email.verify.failed", reason: "expired" });
      return NextResponse.json(
        { error: "Verification link has expired. Please request a new one." },
        { status: 410 }
      );
    }
    if (result.error === "already_verified") {
      return NextResponse.json({ ok: true, message: "Email already verified." });
    }
    authLogger.warn({ event: "auth.email.verify.failed", reason: "invalid" });
    return NextResponse.json({ error: "Invalid verification link." }, { status: 400 });
  }

  authLogger.info({ event: "auth.email.verified" });
  return NextResponse.json({ ok: true });
}

// ── Resend handler ─────────────────────────────────────────────────────────────
async function handleResend(req: NextRequest, body: unknown) {
  const ip = getClientIp(req);

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 422 });
  }

  const { email } = parsed.data;

  // Rate limit by IP first
  const rlIp = await checkResendLimit(ip);
  if (!rlIp.allowed) {
    trackRateLimitExceeded("/api/auth/verify-email/resend", ip, rlIp.retryAfterSecs ?? 3600);
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rlIp.retryAfterSecs} seconds.` },
      { status: 429, headers: { "Retry-After": String(rlIp.retryAfterSecs) } }
    );
  }

  // Rate limit by email
  const rlEmail = await checkResendLimit(email);
  if (!rlEmail.allowed) {
    console.warn(`[verify/resend] Rate limit (email) exceeded for ${email}`);
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rlEmail.retryAfterSecs} seconds.` },
      { status: 429, headers: { "Retry-After": String(rlEmail.retryAfterSecs) } }
    );
  }

  // User-store per-email window
  const storeCheck = await canResendVerification(email);
  if (!storeCheck.allowed) {
    const secs = storeCheck.retryAfterMs ? Math.ceil(storeCheck.retryAfterMs / 1000) : 3600;
    return NextResponse.json(
      { error: `Too many requests. Try again in ${secs} seconds.` },
      { status: 429 }
    );
  }

  const rawToken = await issueVerificationToken(email);
  if (rawToken && process.env.NODE_ENV !== "production") {
    const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/verify-email?token=${rawToken}`;
    console.log(`\n📧  [DEV] Resent verification link for ${email}:\n    ${url}\n`);
  }
  // Production: await sendVerificationEmail(email, rawToken)

  // Always return success to prevent enumeration
  return NextResponse.json({ ok: true, message: "Verification email sent if account exists." });
}
