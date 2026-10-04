import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  // IMPORTANT: only schema.ts drives migrations. schema-enterprise.ts re-declares
  // several table names (payments, service_categories, …) with a different shape —
  // including it here made drizzle-kit push create those enterprise shapes, which
  // crashes runtime queries (e.g. payments.reference does not exist) and would
  // threaten production columns if push ever ran there.
  schema: ["./src/db/schema.ts"],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL is required for Drizzle operations"); })(),
  },
} satisfies Config;
