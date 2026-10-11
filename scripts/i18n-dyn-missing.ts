/**
 * اسکن کلیدهای جاافتاده در رشته‌های فارسی همهٔ فایل‌های UI —
 * شامل برچسب‌های داینامیک (آرایه‌های module-scope که با t(x.label) رندر می‌شوند
 * و ممیزی استاتیک لایهٔ ۱ آنها را نمی‌بیند).
 * خروجی: /tmp/dyn-missing.json
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DICTS } from "../src/lib/i18n/dicts/index";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "src");
const PERSIAN = /[\u0600-\u06FF]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|ts)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC).filter(
  (f) =>
    !f.includes(`${SRC}/lib/i18n/`) &&
    !f.includes(`${SRC}/api/`) &&
    !f.includes(`${SRC}/db/`) &&
    !f.includes(`${SRC}/data/`) &&
    !f.includes(`${SRC}/lib/`),
);

const missing = new Map<string, Set<string>>();
const stringRe = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g;

for (const file of files) {
  const code = readFileSync(file, "utf8");
  let m: RegExpExecArray | null;
  while ((m = stringRe.exec(code))) {
    const value = (m[1] ?? m[2] ?? "").replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
    if (!PERSIAN.test(value)) continue;
    if (value.length < 2 || value.length > 160) continue;
    if (/^[۰-۹0-9\s.,،:؛()%—-]+$/.test(value)) continue; // فقط رقم/نقطه‌گذاری
    if (DICTS.en[value] !== undefined) continue;
    const rel = file.replace(SRC + "/", "");
    if (!missing.has(value)) missing.set(value, new Set());
    missing.get(value)!.add(rel);
  }
}

const out = [...missing.entries()]
  .map(([key, files]) => ({ key, files: [...files].slice(0, 3) }))
  .sort((a, b) => a.key.localeCompare(b.key, "fa"));
writeFileSync("/tmp/dyn-missing.json", JSON.stringify(out, null, 2), "utf8");
console.log(`dyn-missing: ${out.length}`);
const byFile = new Map<string, number>();
for (const it of out) for (const f of it.files) byFile.set(f, (byFile.get(f) ?? 0) + 1);
for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(`  ${String(n).padStart(3)}  ${f}`);
