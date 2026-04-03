/**
 * GET   /api/settings       → get settings for session user
 * PATCH /api/settings       → update settings for session user
 *
 * Security:
 *  - userId always from session — never from body/params
 *  - patch schema is strict() — rejects any client-injected userId
 */
import { NextResponse }  from "next/server";
import type { NextRequest } from "next/server";
import { z }               from "zod";

import { getAuthenticatedUser, badRequest, requireJson } from "@/lib/ownership";
import { getSettings, updateSettings }                   from "@/lib/data-store";

const patchSchema = z.object({
  emailAlerts:       z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  autoCancel:        z.boolean().optional(),
  // userId explicitly CANNOT be in this schema
}).strict();

export async function GET() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const settings = await getSettings(user.id);
  // Strip userId before responding
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _u, updatedAt: _upd, ...safe } = settings;
  return NextResponse.json({ data: safe });
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

  const updated = await updateSettings(user.id, parsed.data);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _u, updatedAt: _upd, ...safe } = updated;
  return NextResponse.json({ data: safe });
}
