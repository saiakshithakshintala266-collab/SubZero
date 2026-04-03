/**
 * GET  /api/subscriptions        → list all subscriptions for session user
 * POST /api/subscriptions        → create a subscription (userId from session only)
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";
import { z }               from "zod";

import { getAuthenticatedUser, badRequest, requireJson } from "@/lib/ownership";
import { listSubscriptions, createSubscription }         from "@/lib/data-store";
import { checkApiLimit, checkSubscriptionCreateLimit }   from "@/lib/rate-limit";

const createSchema = z.object({
  name:         z.string().min(1).max(200).trim(),
  amount:       z.number().positive().max(100_000),
  billingCycle: z.enum(["monthly", "annual"]),
  nextBill:     z.string().optional(),
  lastUsed:     z.string().optional(),
  status:       z.enum(["active", "flagged", "running", "cancelled", "idle"]).default("active"),
  logoChar:     z.string().max(2).optional(),
  logoBg:       z.string().optional(),
  logoColor:    z.string().optional(),
});

export async function GET() {
  // 1. Auth — userId comes from signed JWT session ONLY
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  // 2. Per-user rate limit (60 req/min)
  const rl = await checkApiLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rl.retryAfterSecs} seconds.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  // 3. Fetch — automatically scoped to session userId
  const subs = await listSubscriptions(user.id);
  return NextResponse.json({ data: subs, count: subs.length });
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  // 2. Per-user creation rate limit (20/hr)
  const rl = await checkSubscriptionCreateLimit(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many subscriptions created. Try again in ${rl.retryAfterSecs} seconds.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  // 3. Content-type
  if (!requireJson(req)) return badRequest("Content-Type must be application/json");

  // 4. Parse & validate
  let body: unknown;
  try { body = await req.json(); }
  catch { return badRequest("Invalid JSON body"); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(". ") },
      { status: 422 }
    );
  }

  // 5. Create — userId injected from session, NEVER from body
  const sub = await createSubscription(user.id, parsed.data);
  return NextResponse.json({ data: sub }, { status: 201 });
}
