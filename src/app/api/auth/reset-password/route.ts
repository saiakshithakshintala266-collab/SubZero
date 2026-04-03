/**
 * POST /api/auth/reset-password
 *
 * Resets a user's password using a valid one-time token.
 *
 * Security:
 *  - Token validated as SHA-256 hash lookup (constant-time after lookup)
 *  - Expiry checked — expired tokens return 410 Gone
 *  - Token deleted immediately after use (one-time)
 *  - New password hashed with bcrypt cost 12
 *  - Generic error messages — no user enumeration
 *  - After reset, user must log in again (no auto-sign-in)
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";
import bcrypt               from "bcryptjs";

import { resetPasswordSchema, formatZodError } from "@/lib/validation";
import { consumePasswordResetToken }           from "@/lib/user-store";
import { authLogger }                          from "@/lib/logger";

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 422 });
  }

  const { token, password } = parsed.data;

  // Hash new password before touching the token (so if hashing fails, token is preserved)
  const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Consume token — also updates the passwordHash atomically
  const result = await consumePasswordResetToken(token, newHash);

  if (!result.ok) {
    if (result.error === "expired") {
      authLogger.warn({ event: "auth.password_reset.failed", reason: "expired" });
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 410 }
      );
    }
    authLogger.warn({ event: "auth.password_reset.failed", reason: "invalid" });
    return NextResponse.json(
      { error: "Invalid or expired reset link." },
      { status: 400 }
    );
  }

  authLogger.info({ event: "auth.password_reset.completed" });
  // Password changed successfully → client must sign in again
  return NextResponse.json({ ok: true });
}
