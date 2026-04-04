/**
 * src/lib/gmail-scanner.ts — Gmail subscription email scanner
 *
 * Uses the Gmail API (google-auth-library + googleapis) to search for
 * subscription-related emails: receipts, billing, renewal notices.
 *
 * Security:
 *  - Access token is decrypted in memory only — never logged
 *  - Reads email METADATA only (From, Subject, Date) — no email body content
 *    unless explicitly needed for name extraction
 *  - gmail.readonly scope — read-only, cannot modify or send emails
 */
import "server-only";
import { google } from "googleapis";

// ── Query ─────────────────────────────────────────────────────────────────────

/** Gmail search query that matches subscription-related emails */
const SUBSCRIPTION_QUERY = [
  "subject:(receipt OR invoice OR billing OR subscription OR renewal OR \"your plan\" OR \"payment confirmation\" OR \"order confirmation\")",
  "newer_than:90d",
  "-in:spam",
].join(" ");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GmailSubscriptionHit {
  messageId: string;
  subject:   string;
  from:      string;
  date:      string;
  sender:    string; // extracted domain / company name
}

// ── Scanner ───────────────────────────────────────────────────────────────────

/**
 * Scan a user's Gmail for subscription-related emails.
 * @param accessToken  Decrypted OAuth access token with gmail.readonly scope
 * @param maxResults   Max emails to return (default 50)
 */
export async function scanGmailForSubscriptions(
  accessToken: string,
  maxResults = 50
): Promise<GmailSubscriptionHit[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth });

  // 1. Search for matching message IDs
  const listRes = await gmail.users.messages.list({
    userId:    "me",
    q:         SUBSCRIPTION_QUERY,
    maxResults,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  // 2. Fetch metadata (headers only — no body) for each message
  const hits: GmailSubscriptionHit[] = [];

  await Promise.all(
    messages.map(async (msg) => {
      if (!msg.id) return;
      try {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id:     msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        });

        const headers = detail.data.payload?.headers ?? [];
        const get = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

        const from    = get("From");
        const subject = get("Subject");
        const date    = get("Date");

        // Extract sender company name from "From" header
        // e.g. "Netflix <info@mailer.netflix.com>" → "Netflix"
        const nameMatch = from.match(/^([^<]+)</);
        const sender = nameMatch
          ? nameMatch[1].trim().replace(/"/g, "")
          : from.split("@")[1]?.split(".")[0] ?? from;

        hits.push({ messageId: msg.id, subject, from, date, sender });
      } catch {
        // Skip individual message errors silently
      }
    })
  );

  return hits;
}

/**
 * Deduplicate hits by sender company — keeps only the most recent email
 * per sender so we don't get 12 Netflix receipts.
 */
export function deduplicateBySender(
  hits: GmailSubscriptionHit[]
): GmailSubscriptionHit[] {
  const seen = new Map<string, GmailSubscriptionHit>();
  for (const hit of hits) {
    const key = hit.sender.toLowerCase();
    if (!seen.has(key)) seen.set(key, hit);
  }
  return Array.from(seen.values());
}
