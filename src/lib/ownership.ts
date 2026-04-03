/**
 * src/lib/ownership.ts
 *
 * Reusable auth + ownership utilities for every API route.
 *
 * Design principles:
 *  - getUserId() extracts the authenticated user's ID from the
 *    server-side JWT session ONLY — never from request body,
 *    URL params, or headers.
 *  - notFound() always returns 404 — never 403 — so callers can
 *    never determine whether a resource exists for another user.
 *  - All helpers are server-side only (no "use client").
 */
import "server-only";
import { auth } from "@/auth";

import { NextResponse } from "next/server";

// ── Response factories ─────────────────────────────────────────────────────────

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Always return 404 — whether the resource doesn't exist OR the
 * requesting user doesn't own it. This prevents existence probing.
 */
export function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function badRequest(message = "Bad request"): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unprocessable(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 422 });
}

export function tooManyRequests(retryAfterSecs: number): NextResponse {
  return NextResponse.json(
    { error: `Too many requests. Please try again in ${retryAfterSecs} seconds.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSecs) } }
  );
}

// ── Auth extraction ────────────────────────────────────────────────────────────

interface AuthedUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

type GetUserResult =
  | { user: AuthedUser; error: null }
  | { user: null; error: NextResponse };

/**
 * Extract the authenticated user from the server-side JWT session.
 *
 * IMPORTANT: This is the ONLY approved method for obtaining a userId
 * in API routes. Never read userId from:
 *   - request.json()  → controllable by the client
 *   - params / query  → controllable by the client
 *   - request.headers → controllable by the client
 *
 * Only the signed JWT (verified by AUTH_SECRET) is trusted.
 */
export async function getAuthenticatedUser(): Promise<GetUserResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { user: null, error: unauthorized() };
  }

  // Auth.js's SessionUser doesn't expose emailVerified — we extend it locally.
  const su = session.user as typeof session.user & { emailVerified?: boolean };
  return {
    user: {
      id:            su.id ?? "",
      email:         su.email ?? "",
      name:          su.name ?? "",
      emailVerified: su.emailVerified ?? false,
    },
    error: null,
  };
}

// ── Ownership check ────────────────────────────────────────────────────────────

/**
 * Verify that a resource's userId matches the authenticated user.
 * Always call this AFTER retrieving a resource — never trust URL params alone.
 *
 * Usage:
 *   const resource = await db.findById(params.id)
 *   if (!resource || !ownsResource(resource.userId, user.id)) return notFound()
 */
export function ownsResource(resourceUserId: string, sessionUserId: string): boolean {
  return resourceUserId === sessionUserId;
}

// ── Content-Type guard ─────────────────────────────────────────────────────────

export function requireJson(req: Request): boolean {
  return !!req.headers.get("content-type")?.includes("application/json");
}
