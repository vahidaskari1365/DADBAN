/**
 * اسکریپت یک‌بارمصرف تسک i18n-b4-fin — استخراج کلیدهای t()/tt() از فایل‌های مالکیت
 * + یافتن رشته‌های فارسی unwrapped (برای بررسی دستی)
 * پس از ساخت ext-b4.ts و صحت‌سنجی، حذف می‌شود.
 */
import { readFileSync } from "node:fs";

const FILES = [
  "src/app/page.tsx",
  "src/app/ai-assistant/page.tsx",
  "src/components/consult-companion.tsx",
  "src/components/ai/lawyer-picks.tsx",
  "src/components/ai/ai-tools.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/support/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/login/page.tsx",
  "src/app/register/page.tsx",
  "src/components/auth-panel.tsx",
  "src/components/header.tsx",
  "src/components/home/site-menu.tsx",
  "src/components/account-menu.tsx",
  "src/components/pwa/bottom-nav.tsx",
  "src/app/fee-payment/page.tsx",
  "src/app/offline/page.tsx",
  "src/app/not-found.tsx",
];

const FA = /[\u0600-\u06FF\u200c]/; // حروف فارسی/عربی + ZWNJ
const unescape = (s: string) => s.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, "\\");

/* ── ۱) کلیدهای مستقیم t("…") / tt("…") — شامل چندخطی ── */
const direct = new Map<string, string>(); // key -> file
for (const f of FILES) {
  const src = readFileSync(f, "utf8");
  // هر فراخوانی t( یا tt( یا X-t( که اولین آرگومانش رشتهٔ دابل‌کوت است
  const re = /(?:^|[^\w.$])t(?:t)?\(\s*"((?:[^"\\]|\\.)*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const key = unescape(m[1]);
    if (!FA.test(key)) continue; // فقط کلیدهای فارسی
    if (!direct.has(key)) direct.set(key, f);
  }
  // کلیدهای template-literal با یک ${...} (مثل `گزینهٔ ${o.n}`) → گسترش دستی نمی‌شود؛ فقط گزارش
  const tre = /(?:^|[^\w.$])t(?:t)?\(\s*`([^`]*)`/g;
  while ((m = tre.exec(src))) {
    if (FA.test(m[1])) console.log(`[TEMPLATE] ${f}: ${m[1].replace(/\s+/g, " ")}`);
  }
}

/* ── ۲) رشته‌های فارسی لفظی در فایل (برای یافتن unwrapped ها) ── */
console.log("\n══ رشته‌های فارسی لفظی که داخل t()/tt() نیستند (برای بررسی) ══");
for (const f of FILES) {
  const lines = readFileSync(f, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // کامنت
    // همهٔ رشته‌های دابل‌کوت حاوی فارسی
    const sre = /"((?:[^"\\]|\\.)*)"/g;
    let m: RegExpExecArray | null;
    while ((m = sre.exec(line))) {
      const s = unescape(m[1]);
      if (!FA.test(s)) continue;
      // آیا این رشته داخل t("…") یا tt("…") است؟ (بررسی ابتدای تطبیق)
      const before = line.slice(0, m.index);
      const isT = /(?:t|tt)\(\s*(?:"(?:[^"\\]|\\.)*"\s*)?$/.test(before);
      if (!isT) {
        console.log(`${f}:${i + 1}: ${s.slice(0, 80)}`);
      }
    }
  }
}

console.log(`\n══ کلیدهای مستقیم t/tt: ${direct.size} ══`);
const sorted = [...direct.keys()].sort((a, b) => a.localeCompare(b, "fa"));
for (const k of sorted) console.log(JSON.stringify(k));
