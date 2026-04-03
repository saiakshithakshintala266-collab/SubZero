/**
 * GET    /api/subscriptions/[id]  → get one subscription (ownership enforced)
 * PATCH  /api/subscriptions/[id]  → update (ownership enforced)
 * DELETE /api/subscriptions/[id]  → delete (ownership enforced)
 *
 * Next.js 16: params is a Promise — must be awaited before use.
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";
import { z }               from "zod";

import {
  getAuthenticatedUser,
  notFound,
  badRequest,
  requireJson,
} from "@/lib/ownership";
import {
  getSubscription,
  updateSubscription,
  deleteSubscription,
} from "@/lib/data-store";

const patchSchema = z.object({
  name:         z.string().min(1).max(200).trim().optional(),
  amount:       z.number().positive().max(100_000).optional(),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
  nextBill:     z.string().optional(),
  lastUsed:     z.string().optional(),
  status:       z.enum(["active", "flagged", "running", "cancelled", "idle"]).optional(),
  logoChar:     z.string().max(2).optional(),
  logoBg:       z.string().optional(),
  logoColor:    z.string().optional(),
  // IMPORTANT: userId is explicitly stripped — can never be patched
}).strict(); // reject any extra fields including userId

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const sub = await getSubscription(id, user.id);
  if (!sub) return notFound();

  return NextResponse.json({ data: sub });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  if (!requireJson(req)) return badRequest("Content-Type must be application/json");

  // Verify ownership BEFORE parsing body
  const existing = await getSubscription(id, user.id);
  if (!existing) return notFound();

  let body: unknown;
  try { body = await req.json(); }
  catch { return badRequest("Invalid JSON body"); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(". ") },
      { status: 422 }
    );
  }

  const updated = await updateSubscription(id, user.id, parsed.data);
  if (!updated) return notFound();

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const deleted = await deleteSubscription(id, user.id);
  if (!deleted) return notFound();

  return NextResponse.json({ success: true });
}
