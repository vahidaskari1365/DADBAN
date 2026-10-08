/**
 * اسکریپت یک‌بارمصرف تسک i18n-b4-fin — ساخت فهرست نهایی و کامل کلیدهای ext-b4
 * خروجی: /tmp/b4-keylist.json (آرایهٔ مرتب‌شدهٔ یکتا)
 * پس از ساخت ext-b4.ts و صحت‌سنجی، حذف می‌شود.
 */
import { readFileSync, writeFileSync } from "node:fs";

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

const FA = /[\u0600-\u06FF]/; // حروف فارسی/عربی (ZWNJ تنها کافی نیست)
const unescape = (s: string) =>
  s.replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n").replace(/\\t/g, "\t");

const keys = new Set<string>();
const add = (k: string) => { if (FA.test(k)) keys.add(k); };

/* ── ۱) همهٔ رشته‌های دابل‌کوت حاوی حروف فارسی در فایل‌های مالکیت ── */
for (const f of FILES) {
  const lines = readFileSync(f, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // کامنت
    const sre = /"((?:[^"\\]|\\.)*)"/g;
    let m: RegExpExecArray | null;
    while ((m = sre.exec(line))) add(unescape(m[1]));
  }
}

/* ── ۲) استثناها — رشته‌هایی که کلید ترجمه نیستند ── */
const EXCLUDE = new Set<string>([
  "۰۱۲۳۴۵۶۷۸۹", "٠١٢٣٤٥٦٧٨٩", // نقشهٔ ارقام (کد)
  "؟", "، ", // نویسهٔ تنها
  "دادبان", // نام برند — ترجمه نمی‌شود
  "۰۲۱-۹۱۰۰۲۰۳۰", "09123456789", // شماره تماس/نمونه
  "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹", "۰", // رقم تنها
  // کوئری‌های QUICK_ACTIONS — به API می‌روند، نمایشی نیستند
  "می‌خوام یک وکیل پیدا کنم", "چطور مشاوره آنلاین بگیرم؟", "می‌خوام یک قرارداد تنظیم کنم", "چطور پرونده حقوقی ثبت کنم؟",
]);
// شهرهای POPULAR_CITIES — کلیدهای geo.ts هستند (تکرار نمی‌شوند)
const CITIES = "تهران مشهد اصفهان شیراز کرج تبریز اهواز قم رشت کرمانشاه یزد اردبیل بندرعباس زاهدان سنندج همدان اراک گرگان ساری کرمان ارومیه خرم‌آباد زنجان قزوین بوشهر شهرکرد بیرجند بجنورد سمنان یاسوج ایلام".split(" ");
for (const c of CITIES) EXCLUDE.add(c);
for (const k of [...keys]) if (EXCLUDE.has(k)) keys.delete(k);

// نقشهٔ childIcon در header.tsx — فقط lookup آیکون است، رندر نمی‌شود
{
  const src = readFileSync("src/components/header.tsx", "utf8");
  const m = src.match(/const childIcon[\s\S]*?return m\[label\]/);
  if (m) {
    const sre = /"((?:[^"\\]|\\.)*)"/g;
    let r: RegExpExecArray | null;
    while ((r = sre.exec(m[0]))) {
      const s = unescape(r[1]);
      if (FA.test(s)) keys.delete(s);
    }
  }
}
// بلاک metadata استاتیک fee-payment — طبق تسک دست نمی‌خورد و کلید نمی‌شود
{
  const src = readFileSync("src/app/fee-payment/page.tsx", "utf8");
  const m = src.match(/export const metadata: Metadata = \{[\s\S]*?\n\};/);
  if (m) {
    const sre = /"((?:[^"\\]|\\.)*)"/g;
    let r: RegExpExecArray | null;
    while ((r = sre.exec(m[0]))) {
      const s = unescape(r[1]);
      if (FA.test(s)) keys.delete(s);
    }
  }
}

/* ── ۳) کلیدهای داینامیک از فایل‌های داده که با t() در فایل‌های مالکیت رندر می‌شوند ── */
// ۳-۱) FAQ_ITEMS از lib/content.ts — صفحهٔ پشتیبانی t(f.q)/t(f.a)
{
  const src = readFileSync("src/lib/content.ts", "utf8");
  const m = src.match(/export const FAQ_ITEMS[\s\S]*?^\];/m);
  if (!m) throw new Error("FAQ_ITEMS not found");
  const ore = /\{ q: "((?:[^"\\]|\\.)*)", a: "((?:[^"\\]|\\.)*)"/g;
  let r: RegExpExecArray | null;
  while ((r = ore.exec(m[0]))) { add(unescape(r[1])); add(unescape(r[2])); }
}
// ۳-۲) برچسب‌های ثابت لینک در fallback مسیر api/consult-companion — با t(link.label) رندر می‌شوند
for (const k of ["کتابخانه قراردادها", "ساخت قرارداد", "مقالات حقوقی", "دستیار AI"]) add(k);
// ۳-۳) گسترش کلید قالبی t(`گزینهٔ ${o.n}`) در fee-payment
for (const k of ["گزینهٔ ۱", "گزینهٔ ۲", "گزینهٔ ۳"]) add(k);

const sorted = [...keys].sort((a, b) => a.localeCompare(b, "fa"));
writeFileSync("/tmp/b4-keylist.json", JSON.stringify(sorted, null, 0) + "\n");
console.log(`total keys: ${sorted.length}`);
