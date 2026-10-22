import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
const pool = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5434/dadban", max: 2 });
const t = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name LIMIT 20");
console.log("TABLES:", t.rows.map(r => r.table_name));
const d = await pool.query("SELECT datname FROM pg_database");
console.log("DBS:", d.rows);
await pool.end();
