import { ensureSeeded } from "@/lib/auto-seed";
const r = await ensureSeeded();
console.log("SEED:", JSON.stringify(r.counts));
process.exit(0);
