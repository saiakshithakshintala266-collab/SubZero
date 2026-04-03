/**
 * DELETE /api/connections/[id]   → disconnect a bank account
 *
 * Ownership enforced at data-store level: WHERE id AND userId.
 * Returns 404 whether not found OR wrong owner.
 * Never exposes access tokens in any response.
 *
 * Next.js 16: params is a Promise — must be awaited before use.
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";

import { getAuthenticatedUser, notFound } from "@/lib/ownership";
import { deleteConnection }               from "@/lib/data-store";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  // WHERE id = params.id AND userId = session.user.id
  const deleted = await deleteConnection(id, user.id);
  if (!deleted) return notFound();

  return NextResponse.json({ success: true });
}
