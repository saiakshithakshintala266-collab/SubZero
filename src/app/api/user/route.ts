/**
 * GET   /api/user          → return ONLY session user's profile
 * PATCH /api/user          → update ONLY session user's profile
 *
 * Security:
 *  - userId ALWAYS from session — never accepted in request body
 *  - Sensitive fields (passwordHash, tokens) NEVER returned
 *  - Only safe profile fields exposed
 */
import { NextResponse }    from "next/server";
import type { NextRequest } from "next/server";
import { z }               from "zod";

import { getAuthenticatedUser, badRequest, requireJson } from "@/lib/ownership";
import { findUserByEmail }                               from "@/lib/user-store";

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  // email changes require verification flow — not allowed here
  // userId NEVER accepted
}).strict();

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  // Fetch from user store — userId from session only
  const stored = await findUserByEmail(user.email);

  // Return only safe fields — never passwordHash, verificationTokenHash, resetTokenHash
  return NextResponse.json({
    data: {
      id:            user.id,
      name:          user.name,
      email:         user.email,
      emailVerified: user.emailVerified,
      image:         stored?.image ?? null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  if (!requireJson(req)) return badRequest("Content-Type must be application/json");
  let body: unknown;
  try { body = await req.json(); }
  catch { return badRequest("Invalid JSON body"); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  // In production: update the DB record WHERE id = session.user.id
  // Currently returns the patched values without persisting (no DB yet)
  return NextResponse.json({
    data: {
      id:    user.id,
      name:  parsed.data.name ?? user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
  });
}
