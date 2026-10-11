/**
 * استخراج کلیدهای t()/tf() که در دیکشنری نیستند — مکمل i18n-audit.ts
 * خروجی: /tmp/missing-keys.json  →  [{ key, file }]
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

/** استخراج رشته‌های داخل "…" و '…' با حفظ escapeها */
function extractStrings(code: string) {
  const strings: { value: string; index: number }[] = [];
  const stringRe = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = stringRe.exec(code))) {
    const value = (m[1] ?? m[2] ?? "")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
    strings.push({ value, index: m.index });
  }
  return strings;
}

/** آیا این رشته به‌عنوان آرگومان t()/tf() آمده؟ (فراخوانی حتی چندخطی قبل از اندیس رشته) */
function isTCall(code: string, index: number): boolean {
  const before = code.slice(Math.max(0, index - 60), index);
  return /\btf?\(\s*$/.test(before);
}

const dict = DICTS.en;
const missing = new Map<string, Set<string>>();

for (const file of walk(SRC)) {
  if (file.includes(`${SRC}/lib/i18n/`)) continue;
  const code = readFileSync(file, "utf8");
  for (const { value, index } of extractStrings(code)) {
    if (!PERSIAN.test(value)) continue;
    if (value.length > 500) continue; // پیام‌های بسیار بلند داده‌ای
    if (!isTCall(code, index)) continue;
    if (dict[value] !== undefined) continue;
    const rel = file.replace(SRC + "/", "");
    if (!missing.has(value)) missing.set(value, new Set());
    missing.get(value)!.add(rel);
  }
}

const out = [...missing.entries()]
  .map(([key, files]) => ({ key, files: [...files] }))
  .sort((a, b) => a.key.localeCompare(b.key, "fa"));

writeFileSync("/tmp/missing-keys.json", JSON.stringify(out, null, 2), "utf8");
console.log(`missing keys: ${out.length} → /tmp/missing-keys.json`);
