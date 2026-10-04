// Reset E2E test rows in the LOCAL throwaway DB before each audit run.
import { Client } from "pg";
const c = new Client({ connectionString: "postgres://postgres@127.0.0.1:54329/dadban_e2e" });
await c.connect();
await c.query("DELETE FROM service_request_events");
await c.query("DELETE FROM service_requests");
await c.query("DELETE FROM service_audit_logs");
await c.query("DELETE FROM cases");
await c.query("DELETE FROM payments");
await c.query("DELETE FROM consultations");
await c.query("DELETE FROM app_users WHERE phone = $1", ["09123450001"]);
console.log("e2e data cleaned");
await c.end();
