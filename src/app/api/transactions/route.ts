/**
 * GET /api/transactions — list transactions for session user
 * Supports optional ?flagged=true and ?search=query filters.
 * Filters are applied AFTER userId scoping — users can only filter their own data.
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";

import { getAuthenticatedUser } from "@/lib/ownership";
import { listTransactions }     from "@/lib/data-store";

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const flaggedOnly = searchParams.get("flagged") === "true";
  const search      = searchParams.get("search")?.trim() ?? "";

  // Fetch all, then filter in-process (simple; move to Prisma WHERE for large datasets)
  const all = await listTransactions(user.id);
  const txs = all.filter((t) => {
    if (flaggedOnly && !t.flagged) return false;
    if (search && !t.merchant.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalSpend  = txs.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const flaggedCount = txs.filter((t) => t.flagged).length;

  return NextResponse.json({ data: txs, count: txs.length, totalSpend, flaggedCount });
}
