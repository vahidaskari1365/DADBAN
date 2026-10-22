import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
const pool = new Pool({ connectionString: "postgresql://postgres:postgres@127.0.0.1:5434/dadban", max: 2 });
const r = await pool.query("SELECT 1 AS ok");
console.log("DIRECT_QUERY:", r.rows[0]);
await pool.end();
