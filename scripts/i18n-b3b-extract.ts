/**
 * one-off i18n-b3b extractor:
 * collects t("...") / tt("...") literal keys from owned files + static Persian
 * literals from local const blocks & managed-labels values → scripts/i18n-b3b-keys.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILES = [
  "src/app/services/page.tsx",
  "src/app/services/[slug]/page.tsx",
  "src/app/services/category/[category]/page.tsx",
  "src/app/contracts/page.tsx",
  "src/app/contracts/[slug]/page.tsx",
  "src/app/contracts/review/page.tsx",
  "src/app/contracts/builder/page.tsx",
  "src/app/legal-forms/page.tsx",
  "src/app/legal-forms/[slug]/page.tsx",
  "src/app/pricing/page.tsx",
  "src/app/business/page.tsx",
  "src/app/employee-lawyers/page.tsx",
  "src/app/keywords/page.tsx",
  "src/components/employee-lawyer-finder.tsx",
  "src/components/request-form.tsx",
];

// blocks whose double-quoted literals are also dict keys (rendered via t(var))
const LITERAL_BLOCKS: [string, RegExp][] = [
  // GUIDE_STEPS in services/[slug]
  ["src/app/services/[slug]/page.tsx", /const GUIDE_STEPS = \[[\s\S]*?\n\];/],
  // doc badges array in services/category
  ["src/app/services/category/[category]/page.tsx", /\["مدارک هویتی"[^\]]*\]/],
  // TYPES + STEPS in builder
  ["src/app/contracts/builder/page.tsx", /const TYPES = \[[\s\S]*?\];/],
  ["src/app/contracts/builder/page.tsx", /const STEPS = \[[\s\S]*?\];/],
  // SERVICES + PLANS + REGISTRY in pricing
  ["src/app/pricing/page.tsx", /const SERVICES: [^=]+ = \[[\s\S]*?\n\];/],
  ["src/app/pricing/page.tsx", /const PLANS: [^=]+ = \[[\s\S]*?\n\];/],
  ["src/app/pricing/page.tsx", /const REGISTRY: [^=]+ = \[[\s\S]*?\n\];/],
  // FEATURES + PLANS in business
  ["src/app/business/page.tsx", /const FEATURES = \[[\s\S]*?\n\];/],
  ["src/app/business/page.tsx", /const PLANS = \[[\s\S]*?\n\];/],
  // SERVICE_STEPS titles from lib/content.ts (rendered via t(s.title))
  ["src/lib/content.ts", /export const SERVICE_STEPS = \[[\s\S]*?\n\];/],
];

const PERSIAN = /[\u0600-\u06FF]/;

const keys = new Set<string>();

function extractQuoted(src: string, re: RegExp, cb: (s: string) => void) {
  const m = src.match(re);
  if (!m) return false;
  const re2 = /"((?:[^"\\]|\\.)*)"/g;
  let mm: RegExpExecArray | null;
  while ((mm = re2.exec(m[0]))) {
    try {
      const val = JSON.parse(`"${mm[1]}"`) as string;
      if (PERSIAN.test(val)) cb(val);
    } catch { /* ignore */ }
  }
  return true;
}

for (const f of FILES) {
  const src = readFileSync(f, "utf8");
  // t("...") and tt("...", { ... }) — direct literal keys
  const callRe = /\bt(?:t)?\s*\(\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(src))) {
    try {
      const val = JSON.parse(`"${m[1]}"`) as string;
      if (val.trim()) keys.add(val);
    } catch { /* ignore */ }
  }
}

for (const [f, re] of LITERAL_BLOCKS) {
  const ok = extractQuoted(readFileSync(f, "utf8"), re, (s) => keys.add(s));
  if (!ok) console.error(`WARN: block not found in ${f}`);
}

// label map values from managed-labels.ts (lookup via t(LABELS[...]))
const labels = readFileSync("src/lib/managed-labels.ts", "utf8");
for (const mapName of ["STATUS_LABELS", "URGENCY_LABELS", "CATEGORY_LABELS", "CLASSIFICATION_LABELS", "PRICE_TYPE_LABELS"]) {
  const re = new RegExp(`export const ${mapName}[^=]*= \\{([\\s\\S]*?)\\};`);
  const m = labels.match(re);
  if (!m) { console.error(`WARN: ${mapName} not found`); continue; }
  const re2 = /: "((?:[^"\\]|\\.)*)"/g;
  let mm: RegExpExecArray | null;
  while ((mm = re2.exec(m[1]))) {
    try {
      const val = JSON.parse(`"${mm[1]}"`) as string;
      if (PERSIAN.test(val)) keys.add(val);
    } catch { /* ignore */ }
  }
}

const sorted = [...keys].sort((a, b) => a.localeCompare(b, "fa"));
writeFileSync("scripts/i18n-b3b-keys.json", JSON.stringify(sorted, null, 2), "utf8");
console.log(`extracted ${sorted.length} keys → scripts/i18n-b3b-keys.json`);
