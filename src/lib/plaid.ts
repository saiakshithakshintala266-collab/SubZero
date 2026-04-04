/**
 * src/lib/plaid.ts — Plaid API client singleton
 *
 * Provides:
 *  - createLinkToken()    → frontend opens Plaid Link
 *  - exchangePublicToken()→ swap public_token for access_token + item_id
 *  - getTransactions()    → fetch last 90 days of transactions for a connection
 *  - SUBSCRIPTION_KEYWORDS → list used by the AI classifier
 *
 * Security:
 *  - access_token is encrypted (AES-256-GCM) before DB storage
 *  - Raw access_token NEVER logged or returned in API responses
 *  - Plaid sandbox credentials used in development
 */
import "server-only";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  type Transaction,
} from "plaid";

// ── Client singleton ──────────────────────────────────────────────────────────

const config = new Configuration({
  basePath: PlaidEnvironments[
    (process.env.PLAID_ENV as keyof typeof PlaidEnvironments) ?? "sandbox"
  ],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
      "PLAID-SECRET":    process.env.PLAID_SECRET    ?? "",
    },
  },
});

export const plaidClient = new PlaidApi(config);

// ── Link Token ────────────────────────────────────────────────────────────────

export async function createLinkToken(userId: string): Promise<string> {
  const res = await plaidClient.linkTokenCreate({
    user:          { client_user_id: userId },
    client_name:   "SubZero",
    products:      [Products.Transactions],
    country_codes: [CountryCode.Us],
    language:      "en",
    webhook:       process.env.PLAID_WEBHOOK_URL,
  });
  return res.data.link_token;
}

// ── Token Exchange ────────────────────────────────────────────────────────────

export interface PlaidTokenData {
  accessToken:     string;
  itemId:          string;
  institutionId:   string;
  institutionName: string;
  accountMask:     string;
}

export async function exchangePublicToken(publicToken: string): Promise<PlaidTokenData> {
  const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  const { access_token, item_id } = exchangeRes.data;

  // Fetch institution details
  const itemRes  = await plaidClient.itemGet({ access_token });
  const instId   = itemRes.data.item.institution_id ?? "unknown";

  const instRes  = await plaidClient.institutionsGetById({
    institution_id: instId,
    country_codes:  [CountryCode.Us],
  });
  const institutionName = instRes.data.institution.name;

  // Fetch accounts for mask
  const acctRes  = await plaidClient.accountsGet({ access_token });
  const mask     = acctRes.data.accounts[0]?.mask ?? "0000";

  return {
    accessToken:     access_token,
    itemId:          item_id,
    institutionId:   instId,
    institutionName,
    accountMask:     mask,
  };
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface NormalizedTransaction {
  id:       string;
  name:     string;
  amount:   number;    // positive = debit (money out)
  date:     string;    // YYYY-MM-DD
  merchant: string;
  category: string[];
}

export async function getTransactions(
  accessToken: string,
  days = 90
): Promise<NormalizedTransaction[]> {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  // Use transactionsGet (sync) — simpler than async for our use case
  const res = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date:   fmt(start),
    end_date:     fmt(end),
    options:      { count: 500, offset: 0 },
  });

  return res.data.transactions.map((t: Transaction) => ({
    id:       t.transaction_id,
    name:     t.name,
    amount:   t.amount,          // Plaid: positive = outflow
    date:     t.date,
    merchant: t.merchant_name ?? t.name,
    category: t.personal_finance_category
      ? [t.personal_finance_category.primary, t.personal_finance_category.detailed]
      : (t.category ?? []),
  }));
}
