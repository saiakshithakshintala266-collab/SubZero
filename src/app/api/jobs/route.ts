/**
 * GET  /api/jobs         → list cancellation jobs for session user
 * POST /api/jobs         → create a cancellation job (userId from session only)
 */
import { NextResponse }   from "next/server";
import type { NextRequest } from "next/server";
import { z }               from "zod";

import { getAuthenticatedUser, badRequest, requireJson } from "@/lib/ownership";
import { listJobs, createJob, getSubscription }          from "@/lib/data-store";

import { RateLimiterMemory }                             from "rate-limiter-flexible";

// Per-user rate limit: max 10 job creations / hour
const jobCreateLimiter = new RateLimiterMemory({
  keyPrefix: "job_create_user",
  points: 10,
  duration: 60 * 60,
  blockDuration: 60 * 60,
});

const createSchema = z.object({
  subscriptionId: z.string().min(1),
  // subscriptionName resolved server-side from subscriptionId — not trusted from body
});

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const jobs = await listJobs(user.id);
  return NextResponse.json({ data: jobs, count: jobs.length });
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  // 2. Per-user rate limit on job creation
  try {
    await jobCreateLimiter.consume(user.id);
  } catch {
    return NextResponse.json(
      { error: "Too many cancellation requests. Please wait before trying again." },
      { status: 429 }
    );
  }

  // 3. Content-type + parse
  if (!requireJson(req)) return badRequest("Content-Type must be application/json");
  let body: unknown;
  try { body = await req.json(); }
  catch { return badRequest("Invalid JSON body"); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "subscriptionId is required" }, { status: 422 });
  }

  // 4. Verify the subscription belongs to this user
  //    This is critical: prevents creating jobs for other users' subscriptions
  const sub = await getSubscription(parsed.data.subscriptionId, user.id);
  if (!sub) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 5. Create job — userId from session, subscriptionName resolved from store
  const job = await createJob(user.id, sub.id, sub.name);
  return NextResponse.json({ data: job }, { status: 201 });
}
