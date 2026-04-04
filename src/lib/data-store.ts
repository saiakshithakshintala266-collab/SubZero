/**
 * src/lib/data-store.ts
 *
 * All subscription/transaction/job/connection/settings data access via Prisma.
 *
 * Security properties:
 *  - Every query is scoped to userId — no cross-user data leakage possible
 *  - userId always comes from the validated JWT session, never from request body
 *  - Sensitive fields (accessTokenHash) stripped before returning public types
 */
import "server-only";
import crypto from "crypto";
import { db } from "./db";
import type {
  Subscription as PrismaSubscription,
  Transaction as PrismaTransaction,
  CancellationJob as PrismaJob,
  BankConnection as PrismaBankConnection,
  UserSettings as PrismaSettings,
} from "../generated/prisma/client";

// ── Re-export Prisma types as canonical types ─────────────────────────────────

export type SubscriptionStatus = "active" | "flagged" | "running" | "cancelled" | "idle";
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type { PrismaSubscription as Subscription };
export type { PrismaJob as CancellationJob };
export type { PrismaBankConnection as BankConnection };
export type { PrismaSettings as UserSettings };

export type PublicSubscription = Omit<PrismaSubscription, "userId" | "createdAt" | "updatedAt">;
export type PublicTransaction   = Omit<PrismaTransaction,  "userId" | "createdAt">;
export type PublicJob           = Omit<PrismaJob,           "userId">;
export type PublicBankConnection = Omit<PrismaBankConnection, "userId" | "encryptedToken" | "plaidItemId">;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toPublicSub(s: PrismaSubscription): PublicSubscription {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _u, createdAt: _c, updatedAt: _up, ...rest } = s;
  return rest;
}

function toPublicTx(t: PrismaTransaction): PublicTransaction {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _u, createdAt: _c, ...rest } = t;
  return rest;
}

function toPublicJob(j: PrismaJob): PublicJob {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _u, ...rest } = j;
  return rest;
}

function toPublicConn(c: PrismaBankConnection): PublicBankConnection {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _u, encryptedToken: _a, plaidItemId: _p, ...rest } = c;
  return rest;
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function listSubscriptions(userId: string): Promise<PublicSubscription[]> {
  const rows = await db.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPublicSub);
}

export async function getSubscription(id: string, userId: string): Promise<PublicSubscription | null> {
  const row = await db.subscription.findFirst({ where: { id, userId } });
  return row ? toPublicSub(row) : null;
}

export async function createSubscription(
  userId: string,
  data: {
    name: string;
    amount: number;
    billingCycle: string;
    status: string;
    nextBill?: string | null;
    lastUsed?: string | null;
    logoChar?: string | null;
    logoBg?: string | null;
    logoColor?: string | null;
  }
): Promise<PublicSubscription> {
  const row = await db.subscription.create({
    data: {
      id: newId("sub"),
      userId,
      name: data.name,
      amount: data.amount,
      billingCycle: data.billingCycle,
      status: data.status,
      nextBill: data.nextBill ?? null,
      lastUsed: data.lastUsed ?? null,
      logoChar: data.logoChar ?? null,
      logoBg: data.logoBg ?? null,
      logoColor: data.logoColor ?? null,
    },
  });
  return toPublicSub(row);
}

export async function updateSubscription(
  id: string,
  userId: string,
  patch: Partial<Omit<PrismaSubscription, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<PublicSubscription | null> {
  const existing = await db.subscription.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const row = await db.subscription.update({ where: { id }, data: patch });
  return toPublicSub(row);
}

export async function deleteSubscription(id: string, userId: string): Promise<boolean> {
  const existing = await db.subscription.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await db.subscription.delete({ where: { id } });
  return true;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function listTransactions(userId: string): Promise<PublicTransaction[]> {
  const rows = await db.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPublicTx);
}

export async function createTransaction(
  userId: string,
  data: Omit<PrismaTransaction, "id" | "userId" | "createdAt">
): Promise<PublicTransaction> {
  const row = await db.transaction.create({
    data: { ...data, id: newId("tx"), userId },
  });
  return toPublicTx(row);
}

export async function getTransaction(id: string, userId: string): Promise<PublicTransaction | null> {
  const row = await db.transaction.findFirst({ where: { id, userId } });
  return row ? toPublicTx(row) : null;
}

// ── Cancellation Jobs ─────────────────────────────────────────────────────────

export async function listJobs(userId: string): Promise<PublicJob[]> {
  const rows = await db.cancellationJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPublicJob);
}

export async function createJob(
  userId: string,
  subscriptionId: string,
  subscriptionName: string
): Promise<PublicJob> {
  const row = await db.cancellationJob.create({
    data: {
      id: newId("job"),
      userId,
      subscriptionId,
      subscriptionName,
      status: "pending",
    },
  });
  return toPublicJob(row);
}

export async function updateJob(
  id: string,
  userId: string,
  patch: Partial<Pick<PrismaJob, "status" | "startedAt" | "completedAt" | "error">>
): Promise<PublicJob | null> {
  const existing = await db.cancellationJob.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const row = await db.cancellationJob.update({ where: { id }, data: patch });
  return toPublicJob(row);
}

export async function getJob(id: string, userId: string): Promise<PublicJob | null> {
  const row = await db.cancellationJob.findFirst({ where: { id, userId } });
  return row ? toPublicJob(row) : null;
}

export async function deleteJob(id: string, userId: string): Promise<boolean> {
  const existing = await db.cancellationJob.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await db.cancellationJob.delete({ where: { id } });
  return true;
}

// ── Bank Connections ──────────────────────────────────────────────────────────

export async function listConnections(userId: string): Promise<PublicBankConnection[]> {
  const rows = await db.bankConnection.findMany({ where: { userId } });
  return rows.map(toPublicConn);
}

export async function deleteConnection(id: string, userId: string): Promise<boolean> {
  const existing = await db.bankConnection.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await db.bankConnection.delete({ where: { id } });
  return true;
}

// ── User Settings ─────────────────────────────────────────────────────────────

export async function getSettings(userId: string): Promise<PrismaSettings> {
  return db.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      emailAlerts: true,
      pushNotifications: true,
      autoCancel: false,
    },
    update: {},
  });
}

export async function updateSettings(
  userId: string,
  patch: Partial<Omit<PrismaSettings, "userId" | "updatedAt">>
): Promise<PrismaSettings> {
  return db.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      emailAlerts: true,
      pushNotifications: true,
      autoCancel: false,
      ...patch,
    },
    update: patch,
  });
}
