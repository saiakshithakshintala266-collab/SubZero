/**
 * src/lib/env.ts — Server-side environment variable validation
 *
 * Single source of truth for ALL environment variables.
 * Validated at module-load time using Zod — the process crashes
 * immediately on startup if required variables are missing, before
 * any request is served.
 *
 * Rules:
 *  - Import `env` from here — NEVER read process.env directly elsewhere
 *  - This file is SERVER-ONLY (protected by "server-only" import)
 *  - NEXT_PUBLIC_ vars are the only exception (they live in next.config.ts)
 */
import "server-only";
import { z } from "zod";

const envSchema = z.object({
  // ── Runtime ───────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ── Auth (Auth.js / NextAuth v5) ──────────────────────────────────────
  AUTH_SECRET: z
    .string({ error: "AUTH_SECRET is required" })
    .min(32, "AUTH_SECRET must be at least 32 characters"),

  NEXTAUTH_URL: z
    .string()
    .url("NEXTAUTH_URL must be a valid URL")
    .optional(), // auto-detected on Vercel/Railway; required elsewhere

  // ── Google OAuth ──────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ── Database ──────────────────────────────────────────────────────────
  // Use ?sslmode=require in production
  DATABASE_URL: z.string().min(1).optional(),

  // ── Email / SMTP ──────────────────────────────────────────────────────
  EMAIL_SERVER_HOST:     z.string().optional(),
  EMAIL_SERVER_PORT: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().positive())
    .optional(),
  EMAIL_SERVER_USER:     z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM:            z.string().optional(),

  // ── Resend (transactional email) ──────────────────────────────────────
  RESEND_API_KEY: z.string().optional(),

  // ── Teller (bank data API) ────────────────────────────────────────────
  TELLER_API_KEY:          z.string().optional(),
  TELLER_APPLICATION_ID:   z.string().optional(),
  TELLER_SIGNING_SECRET:   z.string().optional(),

  // ── AWS / S3 (audit screenshots & presigned URLs) ─────────────────────
  AWS_ACCESS_KEY_ID:     z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION:            z.string().optional(),
  AWS_S3_BUCKET:         z.string().optional(),

  // ── Logging ───────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error", "silent"])
    .default("info"),

  // ── Application ───────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// Parse at startup — fail loud and fast before serving any request
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error(
    "❌  Invalid environment variables:\n",
    _parsed.error.flatten().fieldErrors
  );
  // In production this kills the process immediately; in dev it surfaces clearly
  throw new Error("Invalid environment configuration — see errors above.");
}

export const env = _parsed.data;
export type Env = typeof env;
