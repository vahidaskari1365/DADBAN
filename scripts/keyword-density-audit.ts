/**
 * تحلیل تراکم کلمات کلیدی (Keyword Stuffing Audit)
 * - بخش ۱: اسکن متادیتای سورس (title/description/keywords) در src/app
 * - بخش ۲: دریافت صفحات زنده dadvarzan.com و محاسبه تراکم متن قابل‌مشاهده
 * خروجی: صفحاتی که تراکم کلمه کلیدی بالای آستانه دارند.
 *
 * اجرا: bun scripts/keyword-density-audit.ts
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ---------- تنظیمات ----------
// آستانه تراکم برای یک عبارت ۱ کلمه‌ای در متن قابل‌مشاهده (٪)
const WORD_DENSITY_WARN = 3.5;
const WORD_DENSITY_CRIT = 5.0;
// تکرار مجاز یک عبارت ۲-۳ کلمه‌ای در title/description
const PHRASE_REPEAT_LIMIT = 2;

const STOP_WORDS = new Set([
  "و", "در", "به", "از", "که", "این", "را", "با", "برای", "است", "می", "های",
  "هر", "شما", "ما", "تا", "هم", "یک", "کند", "کنید", "شود", "بوده", "خود",
  "بر", "یا", "نیز", "اما", "اگر", "پس", "چه", "کدام", "شد", "شده", "داد",
  "the", "a", "an", "of", "in", "to", "and", "for", "is", "are", "on", "with",
]);

function tokenize(text: string): string[] {
  return text
    .replace(/[\u200c]/g, " ") // نیم‌فاصله → فاصله
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

interface PhraseStat {
  phrase: string;
  count: number;
  densityPct: number;
}

function analyzeText(text: string, label: string): PhraseStat[] {
  const tokens = tokenize(text);
  const total = tokens.length;
  if (total < 30) return [];
  const flags: PhraseStat[] = [];

  // تک‌واژه‌ها
  const wordCount = new Map<string, number>();
  for (const t of tokens) wordCount.set(t, (wordCount.get(t) ?? 0) + 1);
  for (const [w, c] of wordCount) {
    const pct = (c / total) * 100;
    if (pct >= WORD_DENSITY_WARN) {
      flags.push({ phrase: `«${w}» (${label})`, count: c, densityPct: Math.round(pct * 10) / 10 });
    }
  }

  // عبارت‌های ۲ و ۳ کلمه‌ای
  for (const n of [2, 3]) {
    const grams = new Map<string, number>();
    for (let i = 0; i + n <= tokens.length; i++) {
      const g = tokens.slice(i, i + n).join(" ");
      grams.set(g, (grams.get(g) ?? 0) + 1);
    }
    for (const [g, c] of grams) {
      if (c >= 4) {
        flags.push({ phrase: `«${g}» (${label}, n=${n})`, count: c, densityPct: Math.round(((c / Math.max(1, total - n + 1)) * 100) * 10) / 10 });
      }
    }
  }
  return flags.sort((a, b) => b.densityPct - a.densityPct);
}

// ---------- بخش ۱: اسکن متادیتای سورس ----------
function scanSourceMetadata() {
  console.log("═══ بخش ۱ — اسکن متادیتای سورس ═══");
  const files = execSync(
    'grep -rl "generateMetadata" src/app --include=*.tsx; grep -rl "export const metadata" src/app --include=*.tsx',
    { shell: "/bin/bash" },
  )
    .toString()
    .trim()
    .split("\n")
    .filter((v, i, a) => v && a.indexOf(v) === i);

  let issues = 0;
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");

    // همه رشته‌های title: و description: داخل فایل (static و template)
    const stringLits = [...src.matchAll(/(?:title|description):\s*(["'`])([\s\S]{3,300}?)\1/g)];
    for (const [, , val] of stringLits) {
      // تشخیص تکرار عبارت داخل یک title/description
      const toks = tokenize(val);
      const seen = new Map<string, number>();
      for (const t of toks) seen.set(t, (seen.get(t) ?? 0) + 1);
      for (const [w, c] of seen) {
        if (c > 2 && toks.length >= 4) {
          console.log(`  ⚠ ${f}: تکرار «${w}» ${c} بار در: ${val.replace(/\s+/g, " ").slice(0, 120)}`);
          issues++;
        }
      }
    }
  }
  if (!issues) console.log("  ✅ هیچ تکرار غیرعادی در title/description های سورس نیست.");
}

// ---------- بخش ۲: صفحات زنده ----------
async function fetchLive(url: string): Promise<{ html: string; status: number } | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; DadvarzanAudit/1.0)" } });
    const html = await res.text();
    return { html, status: res.status };
  } catch {
    return null;
  }
}

function extractVisibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadingsAndTitles(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const desc = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"\s*\/?>/i)?.[1] ?? "";
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " ").trim());
  return { title, desc, h1 };
}

async function scanLive() {
  console.log("\n═══ بخش ۲ — تحلیل صفحات زنده dadvarzan.com ═══");
  const urls = [
    "https://dadvarzan.com/",
    "https://dadvarzan.com/lawyers",
    "https://dadvarzan.com/lawyers/specialty/talaq-khanavadeh",
    "https://dadvarzan.com/lawyers/specialty/mahriyeh",
    "https://dadvarzan.com/consultation",
    "https://dadvarzan.com/contracts",
    "https://dadvarzan.com/services",
    "https://dadvarzan.com/knowledge",
    "https://dadvarzan.com/laws",
    "https://dadvarzan.com/pricing",
    "https://dadvarzan.com/fee-guide",
    "https://dadvarzan.com/business",
    "https://dadvarzan.com/ai-assistant",
    "https://dadvarzan.com/lawyers/specialty/keifari",
    "https://dadvarzan.com/lawyers/specialty/melki",
    "https://dadvarzan.com/lawyers/city/tehran",
  ];

  for (const url of urls) {
    const r = await fetchLive(url);
    if (!r || r.status !== 200) {
      console.log(`  ✗ ${url} — دریافت نشد (${r?.status ?? "network"})`);
      continue;
    }
    const { title, desc, h1 } = extractHeadingsAndTitles(r.html);
    const visible = extractVisibleText(r.html);
    const toks = tokenize(visible);

    // تکرار عبارت در title
    const tToks = tokenize(title);
    const tRep = new Map<string, number>();
    for (const t of tToks) tRep.set(t, (tRep.get(t) ?? 0) + 1);
    const titleFlags = [...tRep.entries()].filter(([, c]) => c > 2).map(([w, c]) => `${w}×${c}`);

    // تکرار عبارت در description
    const dToks = tokenize(desc);
    const dRep = new Map<string, number>();
    for (const t of dToks) dRep.set(t, (dRep.get(t) ?? 0) + 1);
    const descFlags = [...dRep.entries()].filter(([, c]) => c > 2).map(([w, c]) => `${w}×${c}`);

    // تراکم در متن قابل‌مشاهده
    const densityFlags = analyzeText(visible, "متن");
    // تراکم فقط در h1 ها (فشرده‌ترین بخش)
    const h1Flags = h1.length ? analyzeText(h1.join(". "), "h1") : [];

    const rel = url.replace("https://dadvarzan.com", "") || "/";
    console.log(`\n  ▸ ${rel} (${toks.length} واژه، h1: ${h1.length})`);
    console.log(`    title: ${title.slice(0, 110)}`);
    if (titleFlags.length) console.log(`    ⚠ title تکرار: ${titleFlags.join(", ")}`);
    if (descFlags.length) console.log(`    ⚠ desc تکرار: ${descFlags.join(", ")}`);
    for (const f of densityFlags) console.log(`    ⚠ تراکم متن ${f.densityPct}% (${f.count}×) ${f.phrase}`);
    for (const f of h1Flags) console.log(`    ⚠ تراکم h1 ${f.densityPct}% (${f.count}×) ${f.phrase}`);
    if (!titleFlags.length && !descFlags.length && !densityFlags.length && !h1Flags.length) {
      console.log(`    ✅ سالم`);
    }
  }
}

// ---------- اجرا ----------
scanSourceMetadata();
await scanLive();
