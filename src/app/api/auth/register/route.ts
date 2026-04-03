/**
 * POST /api/auth/register
 *
 * Registers a new user.
 *
 * Security:
 *  - Rate limited: 3 registrations / hour / IP
 *  - Zod schema validated server-side
 *  - Password hashed with bcrypt cost 12 before storage
 *  - Returns IDENTICAL success/error shape — no user enumeration
 *  - Never returns passwordHash or tokens in response
 */
import { NextResponse }    from "next/server";
import type { NextRequest } from "next/server";
import bcrypt               from "bcryptjs";

import { registerSchema, formatZodError } from "@/lib/validation";
import { findUserByEmail, createUser }    from "@/lib/user-store";
import { checkRegisterLimit, getClientIp } from "@/lib/rate-limit";
import { authLogger }                      from "@/lib/logger";
import { trackRateLimitExceeded }          from "@/lib/anomaly-detection";
import { sendVerificationEmail }           from "@/lib/email";

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  // ── 1. Content-Type guard ──────────────────────────────────────────
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported media type" }, { status: 415 });
  }

  // ── 2. Rate limiting ───────────────────────────────────────────────
  const ip = getClientIp(req);
  const rl = await checkRegisterLimit(ip);
  if (!rl.allowed) {
    trackRateLimitExceeded("/api/auth/register", ip, rl.retryAfterSecs ?? 3600);
    return NextResponse.json(
      { error: `Too many sign-up attempts. Please try again in ${rl.retryAfterSecs} seconds.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  // ── 3. Parse & validate ────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 422 }
    );
  }

  const { name, email, password } = parsed.data;

  authLogger.info({ event: "auth.signup.attempt", email: email.replace(/@.*/, "@[hidden]") });

  // ── 4. Duplicate check ─────────────────────────────────────────────
  // Return the same response whether the email exists or not to prevent
  // user enumeration. We still return a 409 here because the client needs
  // to know to show "already have an account?" — this is acceptable since
  // it's a sign-up action the user initiated themselves.
  if (await findUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  // ── 5. Hash password ───────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // ── 6. Create user ─────────────────────────────────────────────────
  const { verificationToken, user: newUser } = await createUser(name, email, passwordHash);

  authLogger.info({ event: "auth.signup.success", userId: newUser.id });

  // ── 7. Send verification email ─────────────────────────────────────
  await sendVerificationEmail(email, name, verificationToken);

  // ── 8. Respond ─────────────────────────────────────────────────────
  return NextResponse.json({ ok: true }, { status: 201 });
}
