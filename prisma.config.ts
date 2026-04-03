import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

// Next.js uses .env.local — load it explicitly so Prisma CLI picks it up
dotenv.config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
