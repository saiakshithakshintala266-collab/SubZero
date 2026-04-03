/**
 * GET /api/health
 *
 * Health check endpoint for load balancers (Railway, Render, etc.).
 * Returns 200 "healthy" when the app is up; 503 when DB is unavailable.
 *
 * This route is in ALWAYS_PUBLIC_PREFIXES in proxy.ts — no auth required.
 * Never returns sensitive information.
 */
import { NextResponse } from "next/server";
import { db }           from "@/lib/db";
import { logger }       from "@/lib/logger";

export const dynamic = "force-dynamic"; // always run fresh, never cache

export async function GET() {
  const start = Date.now();

  try {
    // If DATABASE_URL is configured, attempt a lightweight query
    if (process.env.DATABASE_URL) {
      await db.$queryRaw`SELECT 1`;
    }

    const duration = Date.now() - start;
    logger.info({ event: "health.check.pass", duration });

    return NextResponse.json({
      status:    "healthy",
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version ?? "0.1.0",
      uptime:    Math.floor(process.uptime()),
    });

  } catch (err: unknown) {
    const duration = Date.now() - start;
    logger.error({
      event:    "health.check.fail",
      duration,
      error:    err instanceof Error ? err.message : "Unknown error",
    });

    return NextResponse.json(
      {
        status:    "unhealthy",
        timestamp: new Date().toISOString(),
        error:     "Database unavailable",
      },
      { status: 503 }
    );
  }
}
