/**
 * one-off i18n-b3b scan/extract:
 * 1) direct t("...")/tt("...") literal keys in owned files
 * 2) every remaining double-quoted Persian literal (candidate t(var) keys / unwrapped strings)
 * outputs JSON report for manual review
 */
import { readFileSync, writeFileSync } from "node:fs";

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

const PERSIAN = /[\u0600-\u06FF]/;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

const directKeys = new Map<string, Set<string>>(); // key -> files
const candidates = new Map<string, { file: string; line: number; text: string }[]>();

for (const f of FILES) {
  const raw = readFileSync(f, "utf8");
  const src = stripComments(raw);
  // direct keys
  const callRe = /\bt(?:t)?\s*\(\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(src))) {
    try {
      const val = JSON.parse(`"${m[1]}"`) as string;
      if (!directKeys.has(val)) directKeys.set(val, new Set());
      directKeys.get(val)!.add(f);
    } catch { /* ignore */ }
  }
  // candidates: every double-quoted Persian literal with line no
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const re = /"((?:[^"\\\n]|\\.)*)"/g;
    let mm: RegExpExecArray | null;
    while ((mm = re.exec(lines[i]))) {
      try {
        const val = JSON.parse(`"${mm[1]}"`) as string;
        if (!PERSIAN.test(val)) continue;
        const isDirect = new RegExp(`\\bt(?:t)?\\s*\\(\\s*"${mm[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(lines[i]);
        if (isDirect) continue;
        if (!candidates.has(val)) candidates.set(val, []);
        candidates.get(val)!.push({ file: f, line: i + 1, text: lines[i].trim().slice(0, 160) });
      } catch { /* ignore */ }
    }
  }
}

const report = {
  directCount: directKeys.size,
  direct: [...directKeys.keys()].sort((a, b) => a.localeCompare(b, "fa")),
  candidates: [...candidates.entries()]
    .sort((a, b) => a[1][0].file.localeCompare(b[1][0].file) || a[1][0].line - b[1][0].line)
    .map(([val, locs]) => ({ val, locs })),
};
writeFileSync("scripts/i18n-b3b-scan.json", JSON.stringify(report, null, 2), "utf8");
console.log(`direct keys: ${report.directCount}; candidate literals: ${report.candidates.length} → scripts/i18n-b3b-scan.json`);
