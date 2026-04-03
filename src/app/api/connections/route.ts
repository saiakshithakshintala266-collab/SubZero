/**
 * GET    /api/connections       → list bank connections for session user
 * DELETE /api/connections/[id]  → disconnect bank (ownership enforced)
 *
 * Security notes:
 *  - accessToken/accessTokenHash NEVER returned in responses
 *  - Only last-4 digits of account number exposed (accountMask)
 *  - Full bank tokens stay server-side only
 */
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/ownership";
import { listConnections }                from "@/lib/data-store";

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const conns = await listConnections(user.id);
  // PublicBankConnection strips accessTokenHash and userId before returning
  return NextResponse.json({ data: conns, count: conns.length });
}
