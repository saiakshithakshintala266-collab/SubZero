/**
 * GET    /api/jobs/[id]   → get job (ownership enforced)
 * PATCH  /api/jobs/[id]   → update job status (ownership enforced)
 * DELETE /api/jobs/[id]   → cancel/delete job (ownership enforced)
 *
 * Next.js 16: params is a Promise — must be awaited before use.
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";
import { z }               from "zod";

import { getAuthenticatedUser, notFound, badRequest, requireJson } from "@/lib/ownership";
import { getJob, updateJob, deleteJob }                            from "@/lib/data-store";

const patchSchema = z.object({
  status:      z.enum(["pending", "running", "completed", "failed"]).optional(),
  startedAt:   z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error:       z.string().max(500).optional(),
  // userId, subscriptionId explicitly CANNOT be patched
}).strict();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const job = await getJob(id, user.id);
  if (!job) return notFound();

  return NextResponse.json({ data: job });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  if (!requireJson(req)) return badRequest("Content-Type must be application/json");

  // Verify ownership before reading body
  const existing = await getJob(id, user.id);
  if (!existing) return notFound();

  let body: unknown;
  try { body = await req.json(); }
  catch { return badRequest("Invalid JSON body"); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const patch: Parameters<typeof updateJob>[2] = {
    ...parsed.data,
    startedAt:   parsed.data.startedAt   ? new Date(parsed.data.startedAt)   : undefined,
    completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : undefined,
  };

  const updated = await updateJob(id, user.id, patch);
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

  const deleted = await deleteJob(id, user.id);
  if (!deleted) return notFound();

  return NextResponse.json({ success: true });
}
