/**
 * src/lib/db.ts — Prisma 7 client singleton with pg adapter
 *
 * Prisma 7 uses an explicit adapter pattern instead of a built-in connector.
 * We use @prisma/adapter-pg with node-postgres (pg) for PostgreSQL.
 *
 * Uses the global singleton pattern to prevent multiple client instances
 * during Next.js hot reload in development.
 *
 * Security:
 *  - server-only import prevents accidental client-side bundling
 *  - DATABASE_URL is never logged
 */
import "server-only";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const isCloud = Boolean(
    process.env.DATABASE_URL?.includes("supabase.co") ||
    process.env.DATABASE_URL?.includes("neon.tech")
  );
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: isCloud ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
