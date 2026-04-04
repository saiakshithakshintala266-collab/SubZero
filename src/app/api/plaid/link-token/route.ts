/**
 * POST /api/plaid/link-token
 * Creates a Plaid Link token for the authenticated user.
 * Frontend uses this token to initialize the Plaid Link widget.
 */
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/ownership";
import { createLinkToken } from "@/lib/plaid";

export async function POST() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  try {
    const linkToken = await createLinkToken(user.id);
    return NextResponse.json({ link_token: linkToken });
  } catch (err) {
    console.error("[plaid/link-token]", err);
    return NextResponse.json(
      { error: "Failed to create Plaid link token" },
      { status: 502 }
    );
  }
}
