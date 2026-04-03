/**
 * src/lib/rate-limit.ts
 *
 * In-memory rate limiter using rate-limiter-flexible.
 *
 * Two scopes of rate limiting:
 *  1. IP-based  — for unauthenticated routes (login, register, forgot-password)
 *  2. User-based — for authenticated resource routes
 *     Keyed by session.user.id (more reliable than IP for logged-in users).
 *
 * In production: replace RateLimiterMemory with RateLimiterRedis (Upstash).
 */
import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

// ── Limiter instances ──────────────────────────────────────────────────────────

/** POST /api/auth/signin — 5 attempts / 15 min per IP */
const signInLimiter = new RateLimiterMemory({
  keyPrefix:  "signin_ip",
  points:     5,
  duration:   15 * 60, // seconds
  blockDuration: 15 * 60,
});

/** POST /api/auth/register — 3 attempts / hour per IP */
const registerLimiter = new RateLimiterMemory({
  keyPrefix:  "register_ip",
  points:     3,
  duration:   60 * 60,
  blockDuration: 60 * 60,
});

/** POST /api/auth/forgot-password — 3 / hour per IP */
const forgotIpLimiter = new RateLimiterMemory({
  keyPrefix:  "forgot_ip",
  points:     3,
  duration:   60 * 60,
  blockDuration: 60 * 60,
});

/** POST /api/auth/forgot-password — 3 / hour per email */
const forgotEmailLimiter = new RateLimiterMemory({
  keyPrefix:  "forgot_email",
  points:     3,
  duration:   60 * 60,
  blockDuration: 60 * 60,
});

/** POST /api/auth/verify-email/resend — 3 / hour per email */
const resendLimiter = new RateLimiterMemory({
  keyPrefix:  "resend_email",
  points:     3,
  duration:   60 * 60,
  blockDuration: 60 * 60,
});

/** Authenticated API reads — 60 requests / minute per user id */
const apiLimiter = new RateLimiterMemory({
  keyPrefix:  "api_user",
  points:     60,
  duration:   60,
  blockDuration: 60,
});

/** POST /api/subscriptions — 20 creations / hour per user id */
const subscriptionCreateLimiter = new RateLimiterMemory({
  keyPrefix:  "sub_create_user",
  points:     20,
  duration:   60 * 60,
  blockDuration: 60 * 60,
});

// ── Result type ────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until limit resets (only present when blocked) */
  retryAfterSecs?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function consume(
  limiter: RateLimiterMemory,
  key: string
): Promise<RateLimitResult> {
  try {
    await limiter.consume(key);
    return { allowed: true };
  } catch (err) {
    const res = err as RateLimiterRes;
    return {
      allowed: false,
      retryAfterSecs: Math.ceil(res.msBeforeNext / 1000),
    };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function checkSignInLimit(ip: string): Promise<RateLimitResult> {
  return consume(signInLimiter, ip);
}

export async function checkRegisterLimit(ip: string): Promise<RateLimitResult> {
  return consume(registerLimiter, ip);
}

export async function checkForgotLimit(ip: string, email: string): Promise<RateLimitResult> {
  const [byIp, byEmail] = await Promise.all([
    consume(forgotIpLimiter, ip),
    consume(forgotEmailLimiter, email.toLowerCase()),
  ]);
  // Return whichever is more restrictive
  if (!byIp.allowed) return byIp;
  if (!byEmail.allowed) return byEmail;
  return { allowed: true };
}

export async function checkResendLimit(email: string): Promise<RateLimitResult> {
  return consume(resendLimiter, email.toLowerCase());
}

export async function checkApiLimit(userId: string): Promise<RateLimitResult> {
  return consume(apiLimiter, userId);
}

export async function checkSubscriptionCreateLimit(userId: string): Promise<RateLimitResult> {
  return consume(subscriptionCreateLimiter, userId);
}

/** Extract real client IP from Next.js request headers */
export function getClientIp(req: Request | { headers: Headers }): string {
  const headers = req.headers as Headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
