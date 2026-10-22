import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

/**
 * سرویس‌دهندهٔ wire-protocol PostgreSQL روی PGlite — برای تست لوکال دادورزان.
 * پورت 5434؛ DATABASE_URL اپ: postgresql://postgres:postgres@127.0.0.1:5434/dadban
 * نسخهٔ دیتابیس تازه (پس از خرابی tmp/dadban-data)
 */
const db = new PGlite("/home/z/my-project/tmp/dadban-data-fresh");

await db.exec("CREATE DATABASE IF NOT EXISTS dadban").catch(() => {});

const server = new PGLiteSocketServer({
  db,
  port: 5434,
  host: "127.0.0.1",
  maxConnections: 16,
});

await server.start();
console.log("PGlite socket ready on 127.0.0.1:5434 (fresh data dir)");
