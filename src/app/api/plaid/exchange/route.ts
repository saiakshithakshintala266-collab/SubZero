/**
 * POST /api/plaid/exchange
 * Exchanges a Plaid public_token for an access_token.
 * Stores the encrypted access_token and connection metadata in the DB.
 *
 * Body: { public_token: string }
 */
import { NextResponse }    from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/ownership";
import { exchangePublicToken } from "@/lib/plaid";
import { encrypt }             from "@/lib/encryption";
import { db }                  from "@/lib/db";

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.public_token) {
    return NextResponse.json({ error: "public_token is required" }, { status: 400 });
  }

  try {
    const tokenData = await exchangePublicToken(body.public_token as string);

    // Encrypt access_token before storing — raw token NEVER written to DB
    const encryptedToken = encrypt(tokenData.accessToken);

    // Upsert by plaidItemId so re-linking doesn't create duplicates
    const connection = await db.bankConnection.upsert({
      where:  { plaidItemId: tokenData.itemId },
      create: {
        userId:          user.id,
        institutionId:   tokenData.institutionId,
        institutionName: tokenData.institutionName,
        accountMask:     tokenData.accountMask,
        status:          "active",
        encryptedToken,
        plaidItemId:     tokenData.itemId,
        lastSyncedAt:    new Date(),
      },
      update: {
        status:          "active",
        encryptedToken,  // refresh token on re-link
        institutionName: tokenData.institutionName,
        accountMask:     tokenData.accountMask,
        lastSyncedAt:    new Date(),
      },
    });

    // Return safe fields only — never the token
    return NextResponse.json({
      id:              connection.id,
      institutionName: connection.institutionName,
      accountMask:     connection.accountMask,
      status:          connection.status,
      connectedAt:     connection.connectedAt,
    });
  } catch (err) {
    console.error("[plaid/exchange]", err);
    return NextResponse.json(
      { error: "Failed to connect bank account" },
      { status: 502 }
    );
  }
}
