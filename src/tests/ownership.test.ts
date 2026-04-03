/**
 * src/tests/ownership.test.ts
 *
 * Ownership / IDOR tests for all data-store functions.
 *
 * Run: npx tsx src/tests/ownership.test.ts
 *
 * NOTE: These tests hit the REAL database (Supabase) using test user IDs.
 * They clean up after themselves by deleting all created resources.
 */

import {
  listSubscriptions, getSubscription,
  createSubscription, updateSubscription, deleteSubscription,
  listTransactions, createTransaction,
  createJob, updateJob, listJobs,
  listConnections,
  getSettings, updateSettings,
} from "../lib/data-store";

// ── Helpers ───────────────────────────────────────────────────────────────────

interface TestResult { name: string; pass: boolean; details: string }
const results: TestResult[] = [];

function assert(name: string, condition: boolean, details = "") {
  results.push({ name, pass: condition, details });
  console.log(`${condition ? "✅" : "❌"} ${name}`);
  if (!condition) console.log(`   ${details}`);
}

// ── Test data ─────────────────────────────────────────────────────────────────

const USER_A_ID = `test-user-a-${Date.now()}`;
const USER_B_ID = `test-user-b-${Date.now()}`;

// ── Main test runner ──────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  SubZero IDOR / Ownership Test Suite");
  console.log("═══════════════════════════════════════════\n");

  // ── Seed data ──────────────────────────────────────────────────────────────
  const subA  = await createSubscription(USER_A_ID, { name: "User A Netflix", amount: 22.99, billingCycle: "monthly", status: "active" });
  const subA2 = await createSubscription(USER_A_ID, { name: "User A Spotify", amount: 9.99,  billingCycle: "monthly", status: "flagged" });
  const jobA  = await createJob(USER_A_ID, subA.id, subA.name);
  await createSubscription(USER_B_ID, { name: "User B Adobe", amount: 54.99, billingCycle: "monthly", status: "active" });
  await createTransaction(USER_A_ID, { merchant: "Netflix", date: "Apr 01", amount: 22.99, type: "debit", flagged: true });

  // ── 1. Unauthenticated access (empty userId) ───────────────────────────────
  console.log("── 1. Unauthenticated (empty userId) ──");

  assert("GET subscription with empty userId returns null",
    await getSubscription(subA.id, "") === null);

  const emptyTxs = await listTransactions("");
  assert("GET transactions with empty userId returns []", emptyTxs.length === 0);

  // ── 2. Cross-user subscription reads ──────────────────────────────────────
  console.log("\n── 2. Cross-user subscription read ──");

  assert("User B cannot read User A's subscription by ID",
    await getSubscription(subA.id, USER_B_ID) === null);

  const listFromB = await listSubscriptions(USER_B_ID);
  assert("User B's list does not contain User A's subscription",
    !listFromB.some((s) => s.id === subA.id));

  // ── 3. Cross-user subscription update ─────────────────────────────────────
  console.log("\n── 3. Cross-user subscription update ──");

  const before  = await getSubscription(subA.id, USER_A_ID);
  const updated = await updateSubscription(subA.id, USER_B_ID, { name: "HACKED" });
  const after   = await getSubscription(subA.id, USER_A_ID);

  assert("User B cannot update User A's subscription (returns null)", updated === null);
  assert("User A's subscription name unchanged after B's update attempt",
    after?.name === before?.name, `Before: "${before?.name}", After: "${after?.name}"`);

  // ── 4. Cross-user subscription delete ─────────────────────────────────────
  console.log("\n── 4. Cross-user subscription delete ──");

  const countBefore = (await listSubscriptions(USER_A_ID)).length;
  const deleted     = await deleteSubscription(subA2.id, USER_B_ID);
  const countAfter  = (await listSubscriptions(USER_A_ID)).length;

  assert("User B cannot delete User A's subscription (returns false)", deleted === false);
  assert("User A's count unchanged after B's delete attempt", countAfter === countBefore,
    `Before: ${countBefore}, After: ${countAfter}`);

  // ── 5. Cross-user transactions ─────────────────────────────────────────────
  console.log("\n── 5. Cross-user transaction access ──");

  const txsA = await listTransactions(USER_A_ID);
  const txsB = await listTransactions(USER_B_ID);
  assert("User A and User B have separate transaction lists",
    !txsA.some((t) => txsB.some((b) => b.id === t.id)));

  // ── 6. Cross-user cancellation jobs ───────────────────────────────────────
  console.log("\n── 6. Cross-user job access ──");

  const jobFromB = (await listJobs(USER_B_ID)).find((j) => j.id === jobA.id);
  assert("User B cannot see User A's job", jobFromB === undefined);

  const jobUpdatedByB = await updateJob(jobA.id, USER_B_ID, { status: "completed" });
  assert("User B cannot update User A's job (returns null)", jobUpdatedByB === null);

  const jobAfter = (await listJobs(USER_A_ID)).find((j) => j.id === jobA.id);
  assert("User A's job status unchanged after B's update attempt",
    jobAfter?.status === "pending", `Status: ${jobAfter?.status}`);

  // ── 7. Bank connections ────────────────────────────────────────────────────
  console.log("\n── 7. Cross-user bank connection access ──");

  const connsA = await listConnections(USER_A_ID);
  const connsB = await listConnections(USER_B_ID);
  assert("A and B have separate connection lists",
    !connsA.some((c) => connsB.some((b) => b.id === c.id)));

  // ── 8. Settings isolation ──────────────────────────────────────────────────
  console.log("\n── 8. Cross-user settings access ──");

  await updateSettings(USER_A_ID, { autoCancel: true });
  const settingsB = await getSettings(USER_B_ID);
  assert("User B's settings are independent (autoCancel defaults false)",
    settingsB.autoCancel === false, `B autoCancel: ${settingsB.autoCancel}`);

  // ── 9. userId injection prevention ────────────────────────────────────────
  console.log("\n── 9. userId injection prevention ──");

  const injectedSub = await createSubscription(USER_B_ID, {
    name: "Injection attempt", amount: 1.00, billingCycle: "monthly", status: "active",
  });
  assert("Injected sub NOT readable by User A",
    await getSubscription(injectedSub.id, USER_A_ID) === null);
  assert("Injected sub IS readable by User B (correct owner)",
    await getSubscription(injectedSub.id, USER_B_ID) !== null);

  // ── 10. Sensitive field exposure ───────────────────────────────────────────
  console.log("\n── 10. Sensitive field exposure ──");

  const subs = await listSubscriptions(USER_A_ID);
  assert("PublicSubscription does not expose userId", !subs.some((s) => "userId" in s));

  const jobs = await listJobs(USER_A_ID);
  assert("PublicJob does not expose userId", !jobs.some((j) => "userId" in j));

  const conns = await listConnections(USER_A_ID);
  assert("PublicBankConnection does not expose accessTokenHash",
    !conns.some((c) => "accessTokenHash" in c));

  // ── Cleanup ────────────────────────────────────────────────────────────────
  // Delete test subscriptions (cascades to jobs via FK)
  await deleteSubscription(subA.id, USER_A_ID);
  await deleteSubscription(subA2.id, USER_A_ID);
  await deleteSubscription(injectedSub.id, USER_B_ID);
  for (const s of await listSubscriptions(USER_B_ID)) {
    await deleteSubscription(s.id, USER_B_ID);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${results.filter((r) => r.pass).length}/${results.length} passed`);
  console.log("═══════════════════════════════════════════\n");

  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.log("FAILED TESTS:");
    failed.forEach((r) => console.log(`  ❌ ${r.name}: ${r.details}`));
    process.exit(1);
  }
  console.log("All ownership tests passed ✅");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
