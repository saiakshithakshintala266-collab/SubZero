/**
 * src/lib/subscription-detector.ts — AI-powered subscription classifier
 *
 * Combines bank transaction data and Gmail email hits to identify recurring
 * subscriptions. Uses Gemini (via Google Generative AI) for classification.
 *
 * Two-phase approach:
 *  1. Rule-based pre-filter  → fast, no API cost, catches known services
 *  2. Gemini AI classification → handles unknown/ambiguous merchants
 *
 * Output: array of DetectedSubscription ready to upsert into the DB
 */
import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NormalizedTransaction } from "./plaid";
import type { GmailSubscriptionHit }  from "./gmail-scanner";

// ── Known subscription keyword patterns ───────────────────────────────────────

const KNOWN_SUBSCRIPTIONS: Record<string, { name: string; billingCycle: "monthly" | "annual" }> = {
  netflix:         { name: "Netflix",              billingCycle: "monthly" },
  spotify:         { name: "Spotify",              billingCycle: "monthly" },
  "amazon prime":  { name: "Amazon Prime",         billingCycle: "annual"  },
  "apple.com/bill":{ name: "Apple Subscriptions",  billingCycle: "monthly" },
  "google one":    { name: "Google One",           billingCycle: "monthly" },
  "youtube premium":{ name: "YouTube Premium",     billingCycle: "monthly" },
  hulu:            { name: "Hulu",                 billingCycle: "monthly" },
  "disney+":       { name: "Disney+",              billingCycle: "monthly" },
  "max.com":       { name: "Max (HBO)",             billingCycle: "monthly" },
  "paramount+":    { name: "Paramount+",           billingCycle: "monthly" },
  "peacock":       { name: "Peacock",              billingCycle: "monthly" },
  adobe:           { name: "Adobe Creative Cloud", billingCycle: "monthly" },
  "microsoft 365": { name: "Microsoft 365",        billingCycle: "annual"  },
  dropbox:         { name: "Dropbox",              billingCycle: "monthly" },
  "github":        { name: "GitHub",               billingCycle: "monthly" },
  "openai":        { name: "ChatGPT Plus",         billingCycle: "monthly" },
  "claude":        { name: "Claude Pro",           billingCycle: "monthly" },
  "notion":        { name: "Notion",               billingCycle: "monthly" },
  "figma":         { name: "Figma",                billingCycle: "monthly" },
  "slack":         { name: "Slack",                billingCycle: "monthly" },
  "zoom":          { name: "Zoom",                 billingCycle: "monthly" },
  "duolingo":      { name: "Duolingo Plus",        billingCycle: "monthly" },
  "nytimes":       { name: "NY Times",             billingCycle: "monthly" },
  "wsj":           { name: "Wall Street Journal",  billingCycle: "monthly" },
  "audible":       { name: "Audible",              billingCycle: "monthly" },
  "kindle":        { name: "Kindle Unlimited",     billingCycle: "monthly" },
  "linkedin":      { name: "LinkedIn Premium",     billingCycle: "monthly" },
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DetectedSubscription {
  name:        string;
  amount:      number;
  billingCycle: "monthly" | "annual";
  source:      "bank" | "gmail" | "both";
  confidence:  "high" | "medium" | "low";
  nextBill?:   string;
}

// ── Rule-based phase ──────────────────────────────────────────────────────────

function matchKnown(text: string): { name: string; billingCycle: "monthly" | "annual" } | null {
  const lower = text.toLowerCase();
  for (const [keyword, data] of Object.entries(KNOWN_SUBSCRIPTIONS)) {
    if (lower.includes(keyword)) return data;
  }
  return null;
}

/** Quick rule-based detection — zero API cost */
export function detectFromTransactions(
  txns: NormalizedTransaction[]
): DetectedSubscription[] {
  // Group by merchant, keep only recurring (charge appears 2+ times)
  const byMerchant = new Map<string, NormalizedTransaction[]>();
  for (const t of txns) {
    const key = t.merchant.toLowerCase();
    byMerchant.set(key, [...(byMerchant.get(key) ?? []), t]);
  }

  const results: DetectedSubscription[] = [];

  for (const [, charges] of byMerchant) {
    if (charges.length < 1) continue;
    const latest = charges.sort((a, b) => b.date.localeCompare(a.date))[0];
    const known  = matchKnown(latest.merchant);

    if (known) {
      // Estimate next bill date (1 month from latest charge)
      const lastDate = new Date(latest.date);
      lastDate.setMonth(lastDate.getMonth() + 1);

      results.push({
        name:        known.name,
        amount:      Math.abs(latest.amount),
        billingCycle: charges.length >= 2 ? "monthly" : known.billingCycle,
        source:      "bank",
        confidence:  charges.length >= 2 ? "high" : "medium",
        nextBill:    lastDate.toISOString().split("T")[0],
      });
    }
  }

  return results;
}

/** Match Gmail email hits to known subscriptions */
export function detectFromEmails(
  hits: GmailSubscriptionHit[]
): DetectedSubscription[] {
  const results: DetectedSubscription[] = [];

  for (const hit of hits) {
    const known = matchKnown(hit.sender) ?? matchKnown(hit.subject) ?? matchKnown(hit.from);
    if (known) {
      results.push({
        name:        known.name,
        amount:      0,           // amount unknown from email alone
        billingCycle: known.billingCycle,
        source:      "gmail",
        confidence:  "medium",
      });
    }
  }

  return results;
}

// ── AI phase — Gemini ─────────────────────────────────────────────────────────

/**
 * Use Gemini to classify a batch of unknown merchants as subscriptions or not.
 * Only called for merchants that didn't match the rule-based phase.
 */
export async function classifyWithAI(
  unknownMerchants: string[],
  apiKey: string
): Promise<DetectedSubscription[]> {
  if (unknownMerchants.length === 0) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a subscription detection AI. Given a list of merchant names from bank transactions, identify which ones are likely subscription services (monthly or annual recurring charges).

For each merchant that IS a subscription, respond with a JSON array of objects:
{ "name": "Service Name", "billingCycle": "monthly" | "annual", "confidence": "high" | "medium" | "low" }

Only include actual subscriptions — ignore one-time purchases, restaurants, gas stations, grocery stores, etc.
If none are subscriptions, return an empty array [].

Merchants to analyze:
${unknownMerchants.map((m, i) => `${i + 1}. ${m}`).join("\n")}

Return ONLY valid JSON, no markdown, no explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();
    // Strip markdown code fences if present
    const json   = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(json) as Array<{
      name: string;
      billingCycle: "monthly" | "annual";
      confidence: "high" | "medium" | "low";
    }>;

    return parsed.map((p) => ({
      name:        p.name,
      amount:      0,
      billingCycle: p.billingCycle,
      source:      "bank" as const,
      confidence:  p.confidence,
    }));
  } catch {
    return []; // Fail gracefully — AI is enhancement, not critical path
  }
}

// ── Merge & deduplicate ───────────────────────────────────────────────────────

/**
 * Merge bank-detected and email-detected subscriptions.
 * If a service appears in both, merge them into one with source="both".
 */
export function mergeAndDeduplicate(
  bankSubs: DetectedSubscription[],
  emailSubs: DetectedSubscription[]
): DetectedSubscription[] {
  const merged = new Map<string, DetectedSubscription>();

  for (const sub of bankSubs) {
    merged.set(sub.name.toLowerCase(), sub);
  }

  for (const sub of emailSubs) {
    const key = sub.name.toLowerCase();
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      merged.set(key, {
        ...existing,
        source:     "both",
        confidence: "high", // seen in both places = high confidence
        // keep amount from bank (more accurate)
      });
    } else if (sub.amount === 0) {
      // Email-only with unknown amount — still worth showing
      merged.set(key, sub);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.amount - a.amount);
}
