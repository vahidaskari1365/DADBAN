import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { count } from "drizzle-orm";
const [{ c }] = await db.select({ c: count() }).from(lawyers);
console.log("LAWYERS_COUNT:", c);
process.exit(0);
