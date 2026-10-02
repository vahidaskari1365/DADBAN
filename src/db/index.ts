import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDrizzleDb?: ReturnType<typeof drizzle>;
};

let noopWarned = false;

/** فقط URLهای PostgreSQL واقعی پذیرفته می‌شوند؛ بقیه (file:، sqlite و…) یعنی بدون دیتابیس. */
function isPostgresUrl(url: string | undefined): boolean {
  return !!url && /^postgres(ql)?:\/\//i.test(url);
}

function createNoopDb(): any {
  // Chainable no-op that resolves every awaited query to [] — lets pages
  // render (with empty DB sections) when DATABASE_URL is not configured,
  // instead of crashing the whole site with a 500.
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve([]);
      }
      if (prop === Symbol.toStringTag) return "NoopDb";
      return createNoopDb();
    },
    apply() {
      return createNoopDb();
    },
  });
}

function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!isPostgresUrl(databaseUrl)) {
    throw new Error(
      "DATABASE_URL (PostgreSQL) is required. Add it to your environment variables " +
        "(local: .env file — Vercel: Project Settings → Environment Variables) and redeploy.",
    );
  }
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 2,
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 20_000,
    });
    pool.on("error", (err) => {
      console.error("[dadpayo] idle db client error:", err);
    });
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

function getDb() {
  if (!globalForDb.__arenaNextJsDrizzleDb) {
    if (!isPostgresUrl(process.env.DATABASE_URL)) {
      if (!noopWarned) {
        noopWarned = true;
        console.warn(
          "[dadpayo] DATABASE_URL (PostgreSQL) is not set — running in degraded mode (DB sections will be empty).",
        );
      }
      globalForDb.__arenaNextJsDrizzleDb = createNoopDb() as ReturnType<typeof drizzle>;
    } else {
      globalForDb.__arenaNextJsDrizzleDb = drizzle(getPool());
    }
  }
  return globalForDb.__arenaNextJsDrizzleDb;
}

// Lazy proxy: importing this module never throws, so `next build` can
// collect page data without a configured database. The pool (and the
// DATABASE_URL requirement) is only materialized on first real query.
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
