/**
 * POST /api/scan/analyze
 *
 * Full subscription detection pipeline:
 *  1. Fetch bank transactions from all connected Plaid accounts
 *  2. Scan Gmail for subscription emails (if Gmail token exists)
 *  3. Run rule-based + AI detection on combined data
 *  4. Upsert detected subscriptions into the DB
 *  5. Return detected list
 *
 * Security:
 *  - Requires authenticated session
 *  - All tokens decrypted in memory only — never logged
 *  - Rate limited by existing API rate limiter
 */
import { NextResponse } from "next/server";
import { getAuthenticatedUser }       from "@/lib/ownership";
import { decrypt }                     from "@/lib/encryption";
import { getTransactions }             from "@/lib/plaid";
import { scanGmailForSubscriptions, deduplicateBySender } from "@/lib/gmail-scanner";
import {
  detectFromTransactions,
  detectFromEmails,
  classifyWithAI,
  mergeAndDeduplicate,
  type DetectedSubscription,
} from "@/lib/subscription-detector";
import { db } from "@/lib/db";

export async function POST() {
  const { user, error } = await getAuthenticatedUser();
  if (error) return error;

  // ── 1. Fetch bank transactions from all active connections ──────────────────
  const connections = await db.bankConnection.findMany({
    where: { userId: user.id, status: "active" },
  });

  let allTransactions: Awaited<ReturnType<typeof getTransactions>> = [];

  for (const conn of connections) {
    try {
      const accessToken = decrypt(conn.encryptedToken);
      const txns = await getTransactions(accessToken, 90);
      allTransactions = [...allTransactions, ...txns];

      // Update last synced timestamp
      await db.bankConnection.update({
        where: { id: conn.id },
        data:  { lastSyncedAt: new Date() },
      });
    } catch (err) {
      console.error(`[scan] failed to fetch transactions for ${conn.id}:`, err);
      // Mark connection as errored but continue with others
      await db.bankConnection.update({
        where: { id: conn.id },
        data:  { status: "error" },
      });
    }
  }

  // ── 2. Scan Gmail (if token available) ─────────────────────────────────────
  let emailHits: Awaited<ReturnType<typeof scanGmailForSubscriptions>> = [];

  const gmailToken = await db.gmailToken.findUnique({ where: { userId: user.id } });
  if (gmailToken) {
    try {
      const accessToken = decrypt(gmailToken.encryptedAccessToken);
      const hits = await scanGmailForSubscriptions(accessToken);
      emailHits  = deduplicateBySender(hits);
    } catch (err) {
      console.error("[scan] Gmail scan failed:", err);
      // Gmail failure is non-fatal — continue with bank data only
    }
  }

  // ── 3. Rule-based detection ─────────────────────────────────────────────────
  const bankSubs   = detectFromTransactions(allTransactions);
  const emailSubs  = detectFromEmails(emailHits);

  // ── 4. AI classification for unknown merchants ──────────────────────────────
  const knownNames = new Set([...bankSubs, ...emailSubs].map((s) => s.name.toLowerCase()));
  const unknownMerchants = [...new Set(
    allTransactions
      .filter((t) => t.amount > 1) // ignore micro-transactions
      .map((t) => t.merchant)
      .filter((m) => !Array.from(knownNames).some((k) => m.toLowerCase().includes(k)))
  )].slice(0, 20); // cap at 20 to limit AI calls

  const aiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  const aiSubs = aiKey
    ? await classifyWithAI(unknownMerchants, aiKey)
    : [];

  // ── 5. Merge everything ─────────────────────────────────────────────────────
  const merged = mergeAndDeduplicate(
    [...bankSubs, ...aiSubs],
    emailSubs
  );

  // ── 6. Upsert detected subscriptions into the DB ────────────────────────────
  const savedSubs = await Promise.all(
    merged.filter((s) => s.amount > 0 || s.confidence !== "low").map(async (sub: DetectedSubscription) => {
      // Try to find existing by name for this user
      const existing = await db.subscription.findFirst({
        where: { userId: user.id, name: sub.name },
      });

      if (existing) {
        // Update amount if we have better data
        return db.subscription.update({
          where: { id: existing.id },
          data:  {
            amount:      sub.amount > 0 ? sub.amount : existing.amount,
            billingCycle: sub.billingCycle,
            status:      existing.status === "cancelled" ? "cancelled" : "active",
            nextBill:    sub.nextBill ?? existing.nextBill,
          },
        });
      }

      return db.subscription.create({
        data: {
          userId:      user.id,
          name:        sub.name,
          amount:      sub.amount,
          billingCycle: sub.billingCycle,
          status:      "active",
          nextBill:    sub.nextBill ?? null,
        },
      });
    })
  );

  return NextResponse.json({
    ok:            true,
    detected:      merged.length,
    saved:         savedSubs.length,
    bankAccounts:  connections.length,
    gmailScanned:  gmailToken !== null,
    subscriptions: merged,
  });
}
