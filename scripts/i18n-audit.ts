/**
 * i18n-audit — ایجنت ممیزی چندزبانهٔ دادبان
 * ============================================================================
 * «آیا وقتی کاربر زبانی (مثلاً چینی) را انتخاب می‌کند، کل سایت واقعاً همان
 * زبان می‌شود؟» — این ایجنت سه لایه دارد:
 *
 *   لایهٔ ۱ (کلید جاافتاده): هر t()/tf() استفاده‌شده در کد باید در دیکشنریِ
 *            هر زبان کلید داشته باشد؛ نبودِ کلید = نمایش فارسی در آن زبان.
 *   لایهٔ ۲ (هاردکد): رشته‌های فارسی بیرون از t()/tf() — این‌ها با تغییر زبان
 *            «اصلاً» عوض نمی‌شوند (متمایز از UI و دادهٔ محتوایی).
 *   لایهٔ ۳ (زنده): با مرورگر، کوکی dadban_locale هر زبان ست و کش PWA پاک و
 *            صفحات کلیدی باز می‌شود؛ نسبت کاراکترهای فارسیِ باقی‌مانده و
 *            جهت صفحه (rtl/ltr) سنجیده می‌شود.
 *
 * اجرا:
 *   bun scripts/i18n-audit.ts                 → لایه‌های استاتیک ۱ و ۲
 *   bun scripts/i18n-audit.ts --live          → + لایهٔ زنده (پروداکشن)
 *   bun scripts/i18n-audit.ts --live --base http://localhost:3000
 * ============================================================================
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DICTS } from "../src/lib/i18n/dicts/index";
import { LOCALES, type Locale } from "../src/lib/i18n/core";

/* ——————————————— ابزارهای مشترک ——————————————— */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "src");
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

/** استخراج رشته‌های داخل "…" و '…' و `…` + پاک‌سازی کامنت‌ها (به‌ترتیب درست: اول رشته بعد کامنت) */
function extractStrings(code: string) {
  const strings: { raw: string; value: string; quote: string; index: number }[] = [];
  const stringRe = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = stringRe.exec(code))) {
    const raw = m[0];
    const value = m[1] ?? m[2] ?? m[3] ?? "";
    strings.push({ raw, value: value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'"), quote: raw[0], index: m.index });
  }
  /* حذف خودِ رشته‌ها قبل از حذف کامنت تا // داخل رشته‌ها (URL و …) خراب نشود */
  let stripped = code.replace(stringRe, '""');
  stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  return { strings, stripped };
}

/* ——————————————— لایهٔ ۱: کلیدهای t()/tf() در برابر دیکشنری ——————————————— */

function layer1() {
  const files = walk(SRC).filter((f) => !f.includes(join("src", "lib", "i18n")) && !f.includes("scripts"));
  const keyRe = /\b(?:t|tf)\(\s*"((?:[^"\\]|\\.)*)"|\b(?:t|tf)\(\s*'((?:[^'\\]|\\.)*)'/g;
  const used = new Map<string, { file: string; line: number }>();
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    let m: RegExpExecArray | null;
    const rel = file.slice(SRC.length + 1);
    while ((m = keyRe.exec(code))) {
      const key = (m[1] ?? m[2] ?? "").replace(/\\"/g, '"').replace(/\\'/g, "'");
      if (key && PERSIAN.test(key) && !used.has(key)) used.set(key, { file: rel, line: code.slice(0, m.index).split("\n").length });
    }
  }
  const perLocale = LOCALES.filter((l) => l !== "fa").map((loc) => {
    const dict = DICTS[loc] ?? {};
    const missing = [...used.keys()].filter((k) => !(k in dict));
    return { loc, total: used.size, missingCount: missing.length, missing };
  });
  return { used, perLocale, fileCount: files.length };
}

/* ——————————————— لایهٔ ۲: فارسیِ هاردکد بیرون از t()/tf() ——————————————— */

type Bucket = { ui: Map<string, number>; data: Map<string, number> };

function layer2() {
  const files = walk(SRC).filter((f) => !f.includes(join("src", "lib", "i18n")) && !f.includes("scripts"));
  const keyRe = /\b(?:t|tf)\(\s*(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
  const buckets: Bucket = { ui: new Map(), data: new Map() };
  const samples = { ui: new Map<string, string[]>(), data: new Map<string, string[]>() };

  for (const file of files) {
    const code = readFileSync(file, "utf8");
    const { strings, stripped } = extractStrings(code);
    const translated = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = keyRe.exec(code))) translated.add(m[0].replace(/^[^(]+\(\s*/, ""));

    const rel = file.slice(SRC.length + 1);
    const isData = rel.startsWith("data/") || /(^|\/)(articles-seed|content|ai-resources|calculators-data|faqs?)\.tsx?$/.test(rel);

    for (const s of strings) {
      const v = s.value.trim();
      if (!v || !PERSIAN.test(v)) continue;
      if (translated.has(s.raw) || translated.has(`"${v}"`) || translated.has(`'${v}'`)) continue;
      if (/^[@.~]?[\w/-]+$/.test(v) && !PERSIAN.test(v.replace(PERSIAN, ""))) continue; /* مسیر import */
      if (/^(https?:)?\/\//.test(v)) continue;
      const absKey = s.quote === "`" ? `\`${v}\`` : `${s.quote}${v}${s.quote}`;
      if (translated.has(absKey)) continue;
      const bucket = isData ? buckets.data : buckets.ui;
      bucket.set(rel, (bucket.get(rel) ?? 0) + 1);
      const list = (isData ? samples.data : samples.ui).get(rel) ?? [];
      if (list.length < 3 && !list.includes(v)) list.push(v);
      (isData ? samples.data : samples.ui).set(rel, list);
    }

    /* متن خام JSX: >فارسی< */
    const jsxRe = />([^<>{}]*[\u0600-\u06FF][^<>{}]*)</g;
    while ((m = jsxRe.exec(stripped))) {
      const v = m[1].trim();
      if (v.length < 2) continue;
      const bucket = isData ? buckets.data : buckets.ui;
      bucket.set(rel, (bucket.get(rel) ?? 0) + 1);
      const list = (isData ? samples.ui : samples.ui).get(rel) ?? [];
      if (list.length < 3 && !list.includes(v)) list.push(v);
      (isData ? samples.ui : samples.ui).set(rel, list);
    }
  }
  return { buckets, samples };
}

/* ——————————————— لایهٔ ۳: تست زندهٔ مرورگر (agent-browser) ——————————————— */

type LiveResult = { loc: Locale; page: string; leakPercent: number; faLeft: number; dir: string; dirOk: boolean; samples: string[]; error?: string };

const PAGES = ["/", "/calculators", "/case-board", "/knowledge", "/login"];
const EXPECT_DIR: Record<string, string> = { fa: "rtl", ar: "rtl", en: "ltr", tr: "ltr", zh: "ltr" };

function sh(args: string[]) {
  const p = spawnSync("agent-browser", args, { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NO_COLOR: "1" } });
  return (p.stdout?.toString() ?? "").trim();
}

/** خروجی eval به‌صورت JSON-encoded چاپ می‌شود (حتی دوبار) — تا رشتهٔ خام نهایی باز می‌کنیم */
function evalRaw(out: string): string {
  const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
  let s = lines[lines.length - 1] ?? out;
  for (let i = 0; i < 2; i++) {
    try {
      const once = JSON.parse(s);
      if (typeof once === "string") s = once;
      else break;
    } catch {
      break;
    }
  }
  return s;
}

function scriptRatios(text: string, target: Locale) {
  const fa = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const faSpecific = (text.match(/[\u067E\u0686\u0698\u06AF\u06CC\u06A9]/g) ?? []).length;
  const han = (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latin = (text.match(/[A-Za-zÀ-ÿÇĞİÖŞÜçğıöşü]/g) ?? []).length;
  const arabic = fa - faSpecific; /* عربی فاقد حروف فارسی‌خاص */
  const letters = fa + han + latin;
  let good = 0;
  if (target === "fa") good = fa;
  else if (target === "ar") good = arabic;
  else if (target === "zh") good = han;
  else good = latin; /* en/tr */
  const leak = letters === 0 ? 0 : Math.round(((letters - good) / letters) * 100);
  return { leakPercent: leak, faLeft: fa };
}

async function liveAudit(base: string) {
  const results: LiveResult[] = [];
  const locales: Locale[] = ["en", "ar", "tr", "zh"];
  for (const loc of locales) {
    for (const page of PAGES) {
      const r: LiveResult = { loc, page, leakPercent: 0, faLeft: 0, dir: "?", dirOk: false, samples: [] };
      try {
        sh(["open", base + page]);
        sh(["wait", "1500"]);
        /* پاک‌سازی کش PWA + حذف SW تا رفرش، HTML تازه از شبکه بیاید (همان کاری که سوییچر می‌کند) */
        sh(["eval", "(async()=>{try{const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)));const rs=await navigator.serviceWorker.getRegistrations();await Promise.all(rs.map(x=>x.unregister()));}catch(e){};return 'purged'})()"]);
        sh(["cookies", "set", "dadban_locale", loc]);
        sh(["reload"]);
        sh(["wait", "3000"]);
        const out = sh(["eval", `document.documentElement.dir+"~SEP~"+document.body.innerText`]);
        const raw = evalRaw(out);
        const sep = raw.indexOf("~SEP~");
        if (sep < 0) throw new Error("bad eval output");
        const d = raw.slice(0, sep);
        const t = raw.slice(sep + 5);
        r.dir = d;
        r.dirOk = d === EXPECT_DIR[loc];
        const ratios = scriptRatios(t, loc);
        r.leakPercent = ratios.leakPercent;
        r.faLeft = ratios.faLeft;
        r.samples = [...new Set(t.split("\n").filter((l) => PERSIAN.test(l)).map((l) => l.trim().slice(0, 60)))].slice(0, 4);
      } catch (e) {
        r.error = String(e).slice(0, 120);
      }
      results.push(r);
      console.log(`  [${loc}] ${page} → نشت ${r.leakPercent}٪ · فارسی‌باقی: ${r.faLeft} · dir=${r.dir}${r.dirOk ? " ✓" : " ✗"}${r.error ? " · خطا: " + r.error : ""}`);
      writeFileSync("/tmp/i18n-audit-live.json", JSON.stringify(results, null, 2));
    }
  }
  return results;
}

/* ——————————————— گزارش ——————————————— */

async function main() {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const baseIdx = args.indexOf("--base");
  const base = baseIdx >= 0 ? args[baseIdx + 1] : "https://dadban-brown.vercel.app";

  console.log("═" .repeat(72));
  console.log("ایجنت ممیزی چندزبانهٔ دادبان — fa منبع، و en/ar/tr/zh روی دیکشنری مشترک");
  console.log("═".repeat(72));

  /* لایهٔ ۱ */
  console.log("\n■ لایهٔ ۱ — کلیدهای t()/tf() در برابر دیکشنری هر زبان");
  const l1 = layer1();
  console.log(`  ${l1.fileCount} فایل اسکن شد · ${l1.used.size} کلید یکتای فارسی در کد استفاده شده است.`);
  for (const row of l1.perLocale) {
    const cover = row.total === 0 ? 100 : Math.round(((row.total - row.missingCount) / row.total) * 100);
    console.log(`  ${locName(row.loc)}: پوشش ${cover}٪ (${row.total - row.missingCount}/${row.total}) · کلید جاافتاده: ${row.missingCount}`);
    if (row.missingCount > 0) {
      for (const k of row.missing.slice(0, 6)) console.log(`      · «${k.slice(0, 60)}» ← ${l1.used.get(k)?.file}:${l1.used.get(k)?.line}`);
      if (row.missingCount > 6) console.log(`      · … و ${row.missingCount - 6} مورد دیگر`);
    }
  }

  /* لایهٔ ۲ */
  console.log("\n■ لایهٔ ۲ — رشته‌های فارسی بیرون از t()/tf() (با تغییر زبان عوض نمی‌شوند)");
  const l2 = layer2();
  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  console.log(`  UI (کامپوننت/صفحه): ${l2.buckets.ui.size} فایل · ${sum(l2.buckets.ui)} مورد هاردکد`);
  const uiTop = [...l2.buckets.ui.entries()].filter(([f]) => f.startsWith("components/") || f.startsWith("app/")).sort((a, b) => b[1] - a[1]);
  for (const [f, n] of uiTop.slice(0, 12))
    console.log(`      · ${f}: ${n} — نمونه: «${(l2.samples.ui.get(f) ?? [])[0] ?? ""}»`);
  const libCount = [...l2.buckets.ui.entries()].filter(([f]) => f.startsWith("lib/")).reduce((a, [, n]) => a + n, 0);
  console.log(`      (بخش lib/*: ${libCount} مورد — نام‌ها/محتوای موتور حقوقی، عمدتاً داده‌محور)`);
  console.log(`  دادهٔ محتوایی (مقاله/دیکشنری حقوقی/…): ${l2.buckets.data.size} فایل · ${sum(l2.buckets.data)} مورد — ترجمهٔ محتوا تصمیم محصولی جداگانه است.`);

  /* لایهٔ ۳ */
  if (live) {
    console.log(`\n■ لایهٔ ۳ — تست زنده روی ${base} (کوکی dadban_locale + پاک‌سازی کش PWA)`);
    const results = await liveAudit(base);
    console.log("\n  جدول نشت به تفکیک زبان:");
    for (const loc of ["en", "ar", "tr", "zh"] as Locale[]) {
      const rows = results.filter((r) => r.loc === loc);
      const avg = Math.round(rows.reduce((a, r) => a + r.leakPercent, 0) / Math.max(rows.length, 1));
      const dirBad = rows.filter((r) => !r.dirOk).length;
      console.log(`  ${locName(loc)}: میانگین نشت ${avg}٪ · جهت نادرست: ${dirBad}/${rows.length}`);
    }
    /* ذخیرهٔ کامل */
    writeFileSync("/tmp/i18n-audit-live.json", JSON.stringify(results, null, 2));
    console.log("\n  جزئیات کامل: /tmp/i18n-audit-live.json");
  }

  console.log("\n" + "═".repeat(72));
  console.log("پایان ممیزی.");
}

function locName(l: string) {
  return l === "en" ? "English" : l === "ar" ? "العربية" : l === "tr" ? "Türkçe" : l === "zh" ? "中文" : "فارسی";
}

main();
