/**
 * src/lib/user-store.ts
 *
 * All user-related database operations via Prisma + PostgreSQL.
 *
 * Security properties (unchanged from in-memory version):
 *  - Passwords stored as bcrypt hashes (cost factor 12)
 *  - Verification tokens stored as SHA-256 hashes
 *  - Reset tokens stored as SHA-256 hashes
 *  - Tokens expire (verification: 24h, reset: 1h)
 *  - Tokens deleted after single use
 */
import "server-only";
import crypto from "crypto";
import { db } from "./db";
import type { User as PrismaUser } from "../generated/prisma/client";

// ── Re-export the Prisma User type as our canonical User type ─────────────────
export type User = PrismaUser;
export type PublicUser = Pick<User, "id" | "name" | "email" | "emailVerified" | "image">;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Hash a raw token with SHA-256 for safe storage */
export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** Generate a cryptographically secure random hex token */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<User | null> {
  return db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
}

export async function findUserById(id: string): Promise<User | null> {
  return db.user.findUnique({ where: { id } });
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string
): Promise<{ user: User; verificationToken: string }> {
  const rawToken = generateToken();
  const user = await db.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      emailVerified: false,
      verificationTokenHash: hashToken(rawToken),
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });
  return { user, verificationToken: rawToken };
}

export async function updateUser(id: string, patch: Partial<Omit<User, "id" | "createdAt">>): Promise<User | null> {
  return db.user.update({ where: { id }, data: patch });
}

/**
 * Create or update a user from an OAuth provider (e.g. Google).
 * - New users: created with emailVerified:true, no passwordHash
 * - Existing users: name + image updated to stay in sync with provider
 * Always safe to call on every OAuth sign-in.
 */
export async function upsertOAuthUser({
  email,
  name,
  image,
  providerId,
}: {
  email: string;
  name: string;
  image?: string | null;
  providerId: string; // e.g. Google's `sub` field
}): Promise<User> {
  const normalizedEmail = email.toLowerCase().trim();
  return db.user.upsert({
    where: { email: normalizedEmail },
    create: {
      id:            providerId,   // use provider's stable ID for new users
      email:         normalizedEmail,
      name:          name.trim(),
      image:         image ?? null,
      passwordHash:  "",           // OAuth users never have a password
      emailVerified: true,         // Google already verified this email
    },
    update: {
      name:  name.trim(),
      image: image ?? null,
      emailVerified: true,         // keep verified in case they previously signed up by email
    },
  });
}

// ── Email verification ────────────────────────────────────────────────────────

export type VerifyResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "expired" | "already_verified" };

export async function verifyEmail(rawToken: string): Promise<VerifyResult> {
  const tokenHash = hashToken(rawToken);
  const user = await db.user.findFirst({ where: { verificationTokenHash: tokenHash } });
  if (!user) return { ok: false, error: "invalid" };
  if (user.emailVerified) return { ok: false, error: "already_verified" };
  if (!user.verificationTokenExpiry || user.verificationTokenExpiry < new Date()) {
    await db.user.update({
      where: { id: user.id },
      data: { verificationTokenHash: null, verificationTokenExpiry: null },
    });
    return { ok: false, error: "expired" };
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationTokenHash: null,
      verificationTokenExpiry: null,
    },
  });
  return { ok: true };
}

/** Rate limit: max 3 resends per email per hour */
export async function canResendVerification(email: string): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const user = await findUserByEmail(email);
  if (!user) return { allowed: false };
  if (user.emailVerified) return { allowed: false };

  const WINDOW_MS = 60 * 60 * 1000;
  const MAX_RESENDS = 3;
  const now = Date.now();
  const windowStart = user.verificationResendWindowStart?.getTime() ?? 0;

  if (now - windowStart > WINDOW_MS) {
    await db.user.update({
      where: { id: user.id },
      data: { verificationResendCount: 0, verificationResendWindowStart: new Date() },
    });
    return { allowed: true };
  }
  if (user.verificationResendCount >= MAX_RESENDS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - windowStart) };
  }
  return { allowed: true };
}

export async function issueVerificationToken(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user || user.emailVerified) return null;
  const rawToken = generateToken();
  await db.user.update({
    where: { id: user.id },
    data: {
      verificationTokenHash: hashToken(rawToken),
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verificationResendCount: { increment: 1 },
      verificationResendWindowStart: user.verificationResendWindowStart ?? new Date(),
    },
  });
  return rawToken;
}

// ── Password reset ────────────────────────────────────────────────────────────

/** Rate limit: max 3 reset requests per email per hour */
export async function canRequestPasswordReset(email: string): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const user = await findUserByEmail(email);
  if (!user) return { allowed: true }; // Prevent user enumeration — always allow

  const WINDOW_MS = 60 * 60 * 1000;
  const MAX = 3;
  const now = Date.now();
  const windowStart = user.resetResendWindowStart?.getTime() ?? 0;

  if (now - windowStart > WINDOW_MS) {
    await db.user.update({
      where: { id: user.id },
      data: { resetResendCount: 0, resetResendWindowStart: new Date() },
    });
    return { allowed: true };
  }
  if (user.resetResendCount >= MAX) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - windowStart) };
  }
  return { allowed: true };
}

/** Returns raw token (to include in email link) or null if user not found */
export async function issuePasswordResetToken(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const rawToken = generateToken();
  await db.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashToken(rawToken),
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1h
      resetResendCount: { increment: 1 },
      resetResendWindowStart: user.resetResendWindowStart ?? new Date(),
    },
  });
  return rawToken;
}

export type ResetResult =
  | { ok: true; email: string }
  | { ok: false; error: "invalid" | "expired" };

/** Validate token and reset the password (caller must pass bcrypt hash) */
export async function consumePasswordResetToken(
  rawToken: string,
  newPasswordHash: string
): Promise<ResetResult> {
  const tokenHash = hashToken(rawToken);
  const user = await db.user.findFirst({ where: { resetTokenHash: tokenHash } });
  if (!user) return { ok: false, error: "invalid" };
  if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    await db.user.update({
      where: { id: user.id },
      data: { resetTokenHash: null, resetTokenExpiry: null },
    });
    return { ok: false, error: "expired" };
  }
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      resetTokenHash: null,
      resetTokenExpiry: null,
      resetResendCount: 0,
      resetResendWindowStart: null,
    },
  });
  return { ok: true, email: user.email };
}
