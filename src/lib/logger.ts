/**
 * src/lib/logger.ts — Structured, production-grade logging
 *
 * Uses pino for structured JSON logs (ideal for Railway/Render log
 * drains, Datadog, Logtail, etc.).
 *
 * Security:
 *  - Automatic redaction of sensitive paths (passwords, tokens,
 *    cookies, auth headers) — these become "[REDACTED]" in every log
 *  - server-only import prevents accidental client-side use
 *  - Child loggers for per-module context (no global state mutation)
 *
 * Local dev: pretty-printed output via pino-pretty
 * Production: raw JSON (pipe to your log aggregator)
 */
import "server-only";
import pino from "pino";
import { env } from "@/lib/env";

const isDev = env.NODE_ENV === "development";

export const logger = pino({
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,

  formatters: {
    level: (label) => ({ level: label }),
    // Ensure bindings are present in every log line
    bindings: (bindings) => ({
      pid:  bindings.pid,
      host: bindings.hostname,
      app:  "subzero",
    }),
  },

  // Redact sensitive field paths before ANY log write
  // Works recursively on nested objects too
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "resetToken",
      "verificationToken",
      "secret",
      "apiKey",
      "accessToken",
      "accessTokenHash",
      "authorization",
      "cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.resetToken",
      "*.verificationToken",
      "*.secret",
      "*.apiKey",
      "*.accessToken",
      "*.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
      "request.headers.authorization",
      "request.headers.cookie",
    ],
    censor: "[REDACTED]",
  },

  ...(isDev
    ? {
        // Pretty-print in development with readable timestamps
        transport: {
          target:  "pino-pretty",
          options: {
            colorize:        true,
            translateTime:   "HH:MM:ss",
            ignore:          "pid,hostname",
            singleLine:      false,
          },
        },
      }
    : {}),
});

// ── Named child loggers — use these instead of the root logger ────────────────

/** Authentication events: sign-in, sign-up, password reset, email verify */
export const authLogger = logger.child({ module: "auth" });

/** Resource API events: subscriptions, jobs, transactions */
export const apiLogger = logger.child({ module: "api" });

/** AI agent events: scan, cancellation, job execution */
export const agentLogger = logger.child({ module: "agent" });

/** Database events: queries, connection failures */
export const dbLogger = logger.child({ module: "database" });

/** Security events: brute force, rate limits, IDOR attempts */
export const securityLogger = logger.child({ module: "security" });
