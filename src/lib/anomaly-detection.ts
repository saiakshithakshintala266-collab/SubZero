/**
 * src/lib/anomaly-detection.ts — Security event tracking
 *
 * Tracks failed logins, rate-limit breaches, and unauthorized access
 * attempts. Emits structured security log events at defined thresholds.
 *
 * In production: replace the in-memory Map with Redis so alerting
 * works across all instances and survives restarts.
 */
import "server-only";
import { securityLogger } from "@/lib/logger";

// ── In-memory tracking ────────────────────────────────────────────────────────
// Replace with RedisStore in production multi-instance deployment

interface FailureRecord {
  count:        number;
  firstAttempt: number;
  lastAttempt:  number;
}

const failedLogins = new Map<string, FailureRecord>();

// Clean up stale records every hour to prevent memory growth
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, rec] of failedLogins.entries()) {
    if (rec.lastAttempt < oneHourAgo) failedLogins.delete(key);
  }
}, 60 * 60 * 1000);

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call after every failed login attempt.
 * Emits WARN at 5 failures, ERROR at 10 (brute-force thresholds).
 * Identifier should be email + IP combined for best signal.
 */
export function trackFailedLogin(identifier: string): void {
  const now = Date.now();
  const rec = failedLogins.get(identifier);

  if (rec) {
    rec.count++;
    rec.lastAttempt = now;

    if (rec.count === 5) {
      securityLogger.warn({
        event:      "security.brute_force.detected",
        identifier: identifier.replace(/@.*/, "@[REDACTED]"), // mask email domain
        attempts:   rec.count,
        timespan:   now - rec.firstAttempt,
        severity:   "HIGH",
      });
    } else if (rec.count === 10) {
      securityLogger.error({
        event:      "security.brute_force.critical",
        identifier: identifier.replace(/@.*/, "@[REDACTED]"),
        attempts:   rec.count,
        timespan:   now - rec.firstAttempt,
        severity:   "CRITICAL",
        action:     "MANUAL_REVIEW_REQUIRED",
      });
    } else if (rec.count > 10 && rec.count % 5 === 0) {
      // Escalating alerts every 5 additional attempts
      securityLogger.error({
        event:    "security.brute_force.ongoing",
        attempts: rec.count,
        severity: "CRITICAL",
      });
    }
  } else {
    failedLogins.set(identifier, { count: 1, firstAttempt: now, lastAttempt: now });
  }
}

/**
 * Call after every successful login for the same identifier
 * to reset the failure counter.
 */
export function clearFailedLogins(identifier: string): void {
  failedLogins.delete(identifier);
}

/**
 * Log a rate-limit breach.
 * Call from API routes when a 429 is issued.
 */
export function trackRateLimitExceeded(
  route:      string,
  identifier: string,  // IP or userId — never raw email
  retryAfter: number   // seconds
): void {
  securityLogger.warn({
    event:      "security.rate_limit.exceeded",
    route,
    identifier,
    retryAfter,
    severity:   "MEDIUM",
  });
}

/**
 * Log an unauthorized resource access attempt.
 * Call when a request reaches a protected route without authentication,
 * or when an ownership check fails.
 */
export function trackUnauthorizedAccess(
  route:      string,
  userId:     string | null,
  resourceId: string
): void {
  securityLogger.warn({
    event:      "security.unauthorized_access.attempt",
    route,
    userId:     userId ?? "unauthenticated",
    resourceId,
    severity:   "HIGH",
  });
}

/**
 * Generic unusual-pattern tracker.
 * Use for anything that doesn't fit the above categories.
 */
export function trackUnusualPattern(
  event: string,
  data:  Record<string, unknown>
): void {
  securityLogger.warn({
    event:    `security.unusual.${event}`,
    severity: "MEDIUM",
    ...data,
  });
}
