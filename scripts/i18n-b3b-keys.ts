/**
 * one-off i18n-b3b final extractor:
 * definitive key list for ext-b3b.ts = direct t()/tt()/tf()/templateT(t)("...")
 * + t(var) literal blocks + managed-labels values + SERVICE_STEPS titles
 * → scripts/i18n-b3b-final.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const PERSIAN = /[\u0600-\u06FF]/;
const keys = new Set<string>();

function decode(s: string): string | null {
  try {
    const v = JSON.parse(`"${s}"`) as string;
    return v;
  } catch {
    return null;
  }
}

/* ── ۱) فراخوانی‌های مستقیم: t( / tt( / tf( / templateT(x)( ── */
const FILES = [
  "src/app/services/page.tsx",
  "src/app/services/[slug]/page.tsx",
  "src/app/services/category/[category]/page.tsx",
  "src/app/contracts/page.tsx",
  "src/app/contracts/[slug]/page.tsx",
  "src/app/contracts/builder/page.tsx",
  "src/app/contracts/review/page.tsx",
  "src/app/legal-forms/page.tsx",
  "src/app/legal-forms/[slug]/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/business/page.tsx",
  "src/app/employee-lawyers/page.tsx",
  "src/app/keywords/page.tsx",
  "src/components/employee-lawyer-finder.tsx",
  "src/components/request-form.tsx",
  "src/components/managed.tsx",
];

const stripComments = (src: string): string =>
  src
    // بلوک‌ها فقط وقتی /* بعد از نویسهٔ غیرکلمه‌ای (نه وسط رشته مثل image/*) باشد
    .replace(/(?<=^|[^"\w\\])\/\*[\s\S]*?(?:\*\/|$)/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));

const CALL_RE = /(?:\b(?:t|tt|tf)\s*\(\s*|templateT\(\w+\)\(\s*)"((?:[^"\\]|\\.)*)"/g;

for (const f of FILES) {
  const src = stripComments(readFileSync(f, "utf8"));
  let m: RegExpExecArray | null;
  while ((m = CALL_RE.exec(src))) {
    const v = decode(m[1]);
    if (v && v.trim()) keys.add(v);
  }
}

/* ── ۲) بلوک‌های liترال که با t(var) رندر می‌شوند ── */
const LITERAL_BLOCKS: [string, RegExp][] = [
  ["src/app/services/[slug]/page.tsx", /const GUIDE_STEPS = \[[\s\S]*?\n\];/],
  ["src/app/services/category/[category]/page.tsx", /\["مدارک هویتی"[^\]]*\]/],
  ["src/app/services/category/[category]/page.tsx", /const CATEGORY_META: Record<string, \{[\s\S]*?\n\};/],
  ["src/app/contracts/builder/page.tsx", /const TYPES = \[[\s\S]*?\];/],
  ["src/app/contracts/builder/page.tsx", /const STEPS = \[[\s\S]*?\];/],
  ["src/app/contracts/page.tsx", /\[\n\s*\{ icon: "document", title: "فرم مرحله‌به‌مرحله"[\s\S]*?\]\.map/],
  ["src/app/contracts/review/page.tsx", /\[\n\s*\{ v: result\.findings\.length[\s\S]*?\]\.map/],
  ["src/app/pricing/page.tsx", /const SERVICES: [^=]+ = \[[\s\S]*?\n\];/],
  ["src/app/pricing/page.tsx", /const PLANS: [^=]+ = \[[\s\S]*?\n\];/],
  ["src/app/pricing/page.tsx", /const REGISTRY: [^=]+ = \[[\s\S]*?\n\];/],
  ["src/app/business/page.tsx", /const FEATURES = \[[\s\S]*?\n\];/],
  ["src/app/business/page.tsx", /const PLANS = \[[\s\S]*?\n\];/],
];

const QUOTED = /"((?:[^"\\\n]|\\.)*)"/g;
for (const [f, re] of LITERAL_BLOCKS) {
  const m = stripComments(readFileSync(f, "utf8")).match(re);
  if (!m) {
    console.error(`WARN: block not found in ${f}`);
    continue;
  }
  let mm: RegExpExecArray | null;
  while ((mm = QUOTED.exec(m[0]))) {
    const v = decode(mm[1]);
    if (v && PERSIAN.test(v)) keys.add(v);
  }
}

/* ── ۳) مقادیر label maps (با t(v) رندر می‌شوند) ── */
const labels = readFileSync("src/lib/managed-labels.ts", "utf8");
for (const mapName of ["STATUS_LABELS", "URGENCY_LABELS", "CATEGORY_LABELS", "CLASSIFICATION_LABELS", "PRICE_TYPE_LABELS"]) {
  const re = new RegExp(`export const ${mapName}[^=]*= \\{([\\s\\S]*?)\\};`);
  const m = labels.match(re);
  if (!m) {
    console.error(`WARN: ${mapName} not found`);
    continue;
  }
  const re2 = /: "((?:[^"\\]|\\.)*)"/g;
  let mm: RegExpExecArray | null;
  while ((mm = re2.exec(m[1]))) {
    const v = decode(mm[1]);
    if (v && PERSIAN.test(v)) keys.add(v);
  }
}

/* ── ۴) عناوین SERVICE_STEPS از content.ts (فقط title رندر می‌شود) ── */
const content = readFileSync("src/lib/content.ts", "utf8");
const stepsBlock = content.match(/export const SERVICE_STEPS = \[[\s\S]*?\n\];/);
if (stepsBlock) {
  const titleRe = /title: "((?:[^"\\]|\\.)*)"/g;
  let mm: RegExpExecArray | null;
  while ((mm = titleRe.exec(stepsBlock[0]))) {
    const v = decode(mm[1]);
    if (v) keys.add(v);
  }
} else console.error("WARN: SERVICE_STEPS not found");

const sorted = [...keys].sort((a, b) => a.localeCompare(b, "fa"));
writeFileSync("scripts/i18n-b3b-final.json", JSON.stringify(sorted, null, 2), "utf8");

// مقایسه با استخراج عامل قبلی
try {
  const prev: string[] = JSON.parse(readFileSync("scripts/i18n-b3b-keys.json", "utf8"));
  const prevSet = new Set(prev);
  const added = sorted.filter((k) => !prevSet.has(k));
  const nextSet = new Set(sorted);
  const removed = prev.filter((k) => !nextSet.has(k));
  console.log(`final keys: ${sorted.length} (prev: ${prev.length})`);
  console.log(`added (${added.length}):`, JSON.stringify(added, null, 1));
  console.log(`removed (${removed.length}):`, JSON.stringify(removed, null, 1));
} catch {
  console.log(`final keys: ${sorted.length}`);
}
