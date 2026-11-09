import type { Config } from "drizzle-kit";

/**
 * Migrations are applied with Wrangler (`npm run db:migrate`), which is what
 * D1 expects in CI. drizzle-kit is only used for generating SQL from the schema.
 */
export default {
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./migrations",
  driver: "d1-http",
} satisfies Config;
