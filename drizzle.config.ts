import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  schema: ["./src/db/schema.ts", "./src/db/schema-enterprise.ts"],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL is required for Drizzle operations"); })(),
  },
} satisfies Config;
