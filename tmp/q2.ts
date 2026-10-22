import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { desc } from "drizzle-orm";
const rows = await db.select({ id: lawyers.id, name: lawyers.name, verified: lawyers.verified }).from(lawyers).orderBy(desc(lawyers.id)).limit(5);
console.log("PROFILES:", JSON.stringify(rows));
process.exit(0);
