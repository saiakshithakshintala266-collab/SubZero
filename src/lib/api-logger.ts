/**
 * src/lib/api-logger.ts — Route logging wrapper
 *
 * Wraps any API route handler with:
 *  - Request ID (X-Request-ID header on every response)
 *  - Structured request/response logging via pino
 *  - Duration measurement
 *  - Unhandled error catch-all (returns 500 with requestId)
 *
 * Usage in route files:
 *   export const GET = withApiLogging(async (req, ctx) => { ... }, "subscriptions.list")
 *
 * The route name is a dot-separated path, e.g.:
 *   "subscriptions.list", "subscriptions.get", "auth.register"
 */
import "server-only";
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";
import { apiLogger }       from "@/lib/logger";

type RouteHandler = (
  req:  NextRequest,
  ctx:  { params: Record<string, string> }
) => Promise<NextResponse> | NextResponse;

export function withApiLogging(handler: RouteHandler, routeName: string): RouteHandler {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    const start     = Date.now();
    const requestId = crypto.randomUUID();

    apiLogger.info({
      event:     "api.request",
      requestId,
      route:     routeName,
      method:    req.method,
    });

    try {
      const response = await handler(req, ctx);
      const duration = Date.now() - start;

      const level = response.status >= 500
        ? "error"
        : response.status >= 400
        ? "warn"
        : "info";

      apiLogger[level]({
        event:     level === "info" ? "api.response.success" : "api.response.error",
        requestId,
        route:     routeName,
        method:    req.method,
        status:    response.status,
        duration,
      });

      // Attach request ID to every response for traceability
      response.headers.set("X-Request-ID", requestId);
      return response;

    } catch (err: unknown) {
      const duration = Date.now() - start;

      apiLogger.error({
        event:     "api.error.unhandled",
        requestId,
        route:     routeName,
        method:    req.method,
        duration,
        error:     err instanceof Error ? err.message : "Unknown error",
        // Stack only in development — never expose internals in production
        ...(process.env.NODE_ENV === "development" && err instanceof Error
          ? { stack: err.stack }
          : {}),
      });

      return NextResponse.json(
        { error: "Internal server error", requestId },
        { status: 500 }
      );
    }
  };
}
