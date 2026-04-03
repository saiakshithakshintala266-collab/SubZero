/**
 * GET /api/transactions/[id]  → get single transaction (ownership enforced)
 *
 * Next.js 16: params is a Promise — must be awaited before use.
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";

import { getAuthenticatedUser, notFound } from "@/lib/ownership";
import { getTransaction }                 from "@/lib/data-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  // WHERE id = params.id AND userId = session.user.id
  const tx = await getTransaction(id, user.id);
  if (!tx) return notFound();

  return NextResponse.json({ data: tx });
}
