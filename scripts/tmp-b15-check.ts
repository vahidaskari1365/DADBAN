/**
 * TEMP script (Task 13-e): extract t()/tf() first-args from the files wired in this task
 * and report keys missing from current DICTS layers (en/ar/tr/zh). Delete after use.
 */
import { readFileSync } from "node:fs";
import { DICTS } from "../src/lib/i18n/dicts/index";

const FILES = [
  "src/app/admin/errors/page.tsx",
  "src/app/admin/errors/refresh-button.tsx",
  "src/app/admin/finance/page.tsx",
  "src/app/admin/finance/finance-client.tsx",
  "src/app/admin/login/page.tsx",
  "src/app/admin/managed-services/page.tsx",
  "src/app/admin/matching/page.tsx",
  "src/app/admin/matching/matching-table.tsx",
  "src/app/admin/onboarding/page.tsx",
  "src/app/admin/onboarding/onboarding-client.tsx",
  "src/app/admin/outbox/page.tsx",
  "src/app/admin/providers/page.tsx",
  "src/app/admin/providers/providers-client.tsx",
  "src/app/admin/settings/page.tsx",
  "src/app/admin/settings/settings-client.tsx",
  "src/app/admin/users/page.tsx",
  "src/app/dashboard/lawyer/calendar/page.tsx",
  "src/app/dashboard/lawyer/finance/page.tsx",
  "src/app/dashboard/lawyer/market/page.tsx",
  "src/app/dashboard/lawyer/proposals/page.tsx",
  "src/app/dashboard/lawyer/team/page.tsx",
  "src/app/dashboard/trainee/page.tsx",
  "src/app/dashboard/trainee/trainee-action-form.tsx",
  "src/components/admin-manager.tsx",
  "src/components/managed-admin.tsx",
];

const PERSIAN = /[\u0600-\u06FF]/;

/** رشته‌های داخل "…" (تک‌خطی) که بلافاصله پس از t( یا tf( آمده‌اند */
function extractTArgs(code: string): string[] {
  const out: string[] = [];
  const re = /\btf?\(\s*\n?\s*"((?:[^"\\\n]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    out.push(m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'"));
  }
  return out;
}

const keys = new Set<string>();
for (const f of FILES) {
  const code = readFileSync(f, "utf8");
  for (const k of extractTArgs(code)) {
    if (PERSIAN.test(k)) keys.add(k);
  }
}

const missing = [...keys].filter((k) => !(k in DICTS.en));
console.log(`total t()/tf() Persian keys: ${keys.size}, missing from dict: ${missing.length}`);
for (const k of missing) console.log("MISSING: " + JSON.stringify(k));
