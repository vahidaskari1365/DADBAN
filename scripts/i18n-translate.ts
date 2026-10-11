/**
 * i18n-translate — تکمیل کلیدهای جاافتادهٔ دیکشنری با ترجمهٔ LLM
 * ============================================================================
 * ۱) کلیدهای t()/tf() استفاده‌شده در کد که در دیکشنری en/ar/tr/zh نیستند
 * ۲) ترجمهٔ دسته‌ای با z-ai-web-dev-sdk (فقط بک‌اند) با اعتبارسنجی خروجی
 * ۳) ذخیرهٔ قابل‌ازسرگیری در /tmp/i18n-b9-translations.json
 * ۴) تولید src/lib/i18n/dicts/ext-b9.ts (فرمت [en,ar,tr,zh] مثل ext-b8)
 *
 * اجرا: bun scripts/i18n-translate.ts [--gen-only]
 * ============================================================================
 */

import { readdirSync, readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ZAI from "z-ai-web-dev-sdk";
import { DICTS } from "../src/lib/i18n/dicts/index";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "src");
const PERSIAN = /[\u0600-\u06FF]/;
const HAN = /[\u4e00-\u9fff]/;
const ARABIC = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;
const PROGRESS = "/tmp/i18n-b9-translations.json";
const OUT_FILE = join(SRC, "lib", "i18n", "dicts", "ext-b9.ts");
const BATCH = 25;

/* ── استخراج کلیدها (عین منطق i18n-audit لایهٔ ۱) ───────────────────────── */

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function missingKeys(): string[] {
  const files = walk(SRC).filter((f) => !f.includes(join("src", "lib", "i18n")) && !f.includes("scripts"));
  const keyRe = /\b(?:t|tf)\(\s*"((?:[^"\\]|\\.)*)"|\b(?:t|tf)\(\s*'((?:[^'\\]|\\.)*)'/g;
  const used = new Set<string>();
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    let m: RegExpExecArray | null;
    while ((m = keyRe.exec(code))) {
      const key = (m[1] ?? m[2] ?? "").replace(/\\"/g, '"').replace(/\\'/g, "'");
      if (key && PERSIAN.test(key)) used.add(key);
    }
  }
  const dictEn = DICTS.en ?? {};
  return [...used].filter((k) => !(k in dictEn));
}

/* ── ترجمهٔ یک دسته ─────────────────────────────────────────────────────── */

type Quad = { en: string; ar: string; tr: string; zh: string };

const SYSTEM = `You are the senior localization engineer of DADBAN (دادبان), an Iranian legal-services platform. You translate Persian UI strings into English, Modern Standard Arabic, Turkish and Simplified Chinese for the product interface.

STRICT RULES:
1) Preserve every {placeholder} EXACTLY as-is (e.g. {n}, {city}, {price}, {sp}).
2) Legal terms: وکیل=lawyer/محامٍ/avukat/律师 · موکل=client/الموکّل/müvekkil/客户 · حق‌الوکاله=attorney fee/أتعاب المحاماة/vekalet ücreti/律师费 · دادگاه=court/المحكمة/mahkeme/法院 · دادخواست=petition/لائحة دعوى/dava dilekçesi/起诉状 · پرونده=case/القضية/dava/案件.
3) UI tone: concise, natural, professional. No explanations, no quotes around output.
4) Arabic uses Arabic-Indic digits (٠-٩); en/tr/zh use Western digits (0-9).
5) If a string is a proper noun/brand (دادبان) keep: en/tr/zh "DADBAN", ar "دادبان".
6) Keep punctuation purpose: «؟»→en/tr/zh "?", ar "؟" ; Persian semicolon/ dash → natural target equivalent.
7) If a string is only digits or a lone symbol, mirror it appropriately per target.
8) Reply with ONLY a compact JSON object mapping EACH input index to {en,ar,tr,zh}. No markdown fences.`;

/* تعمیر رایج خروجی مدل: کولن تمام‌عرض (：) و مقادیر بدون کوتیشن */
function repairJson(s: string): string {
  return s
    .replace(/：/g, ":")
    .replace(/("(?:en|ar|tr|zh)"\s*:\s*)([^"\s{\[][^,\n}]*)(?=[,}\n\s])/g, '$1"$2"');
}

/** پارسر تساهلی: بدون نیاز به JSON معتبر — هر بلوک index و فیلدهایش را با regex درمی‌آورد */
function tolerantParse(text: string): Record<string, Quad> | null {
  const res: Record<string, Quad> = {};
  const blockRe = /"(\d{1,3})"\s*[::]\s*\{/g;
  const blocks: { id: string; start: number }[] = [];
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(text))) blocks.push({ id: bm[1], start: bm.index });
  if (blocks.length === 0) return null;
  for (let i = 0; i < blocks.length; i++) {
    const chunk = text.slice(blocks[i].start, i + 1 < blocks.length ? blocks[i + 1].start : text.length);
    const q: Partial<Quad> = {};
    for (const lang of ["en", "ar", "tr", "zh"] as const) {
      const fm = chunk.match(new RegExp(`"${lang}"\\s*[::]\\s*"?(.*?)"?\\s*(?=,\\s*"(?:en|ar|tr|zh)"|\\})`, "s"));
      if (fm && fm[1].trim()) q[lang] = fm[1].trim();
    }
    if (q.en && q.ar && q.tr && q.zh) res[blocks[i].id] = q as Quad;
  }
  return Object.keys(res).length ? res : null;
}

function parseQuad(s: string): Quad | null {
  try {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const slice = s.slice(start, end + 1);
    let o: Record<string, unknown>;
    try { o = JSON.parse(slice) as Record<string, unknown>; }
    catch { o = JSON.parse(repairJson(slice)) as Record<string, unknown>; }
    const pick = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const q: Quad = { en: pick(o.en), ar: pick(o.ar), tr: pick(o.tr), zh: pick(o.zh) };
    if (!q.en || !q.ar || !q.tr || !q.zh) return null;
    return q;
  } catch {
    return null;
  }
}

function valid(q: Quad, key: string): boolean {
  /* en/tr/zh نباید فارسی داشته باشند؛ ar باید خط عربی داشته باشد (برای کلیدهای حروف‌دار)؛ zh باید هان داشته باشد */
  if (PERSIAN.test(q.en) || PERSIAN.test(q.tr)) return false;
  if (PERSIAN.test(q.zh) && !HAN.test(q.zh)) return false;
  if (LATIN.test(key) === false && key.replace(/[\s\u200c·•—–\-(),.:؛،؟!*%۰-۹0-9]/g, "").length > 1) {
    if (!ARABIC.test(q.ar)) return false;
    if (!LATIN.test(q.en)) return false;
    if (key.length > 3 && !HAN.test(q.zh)) return false;
  }
  return true;
}

async function translateBatch(zai: Awaited<ReturnType<typeof ZAI.create>>, keys: string[]): Promise<Record<string, Quad>> {
  const payload = keys.map((k, i) => `${i}. ${JSON.stringify(k)}`).join("\n");
  const out: Record<string, Quad> = {};
  let lastRaw = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const c = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM },
          { role: "user", content: `Translate these ${keys.length} Persian UI strings:\n${payload}` },
        ],
        thinking: { type: "disabled" },
        max_tokens: 4000,
      });
      const text = (c.choices[0]?.message?.content ?? "").replace(/^```json\s*|```$/g, "");
      lastRaw = text;
      const obj = (() => {
        const s = text.indexOf("{"), e = text.lastIndexOf("}");
        if (s < 0 || e <= s) {
          console.log(`    ⃟ DEBUG finish=${c.choices[0]?.finish_reason} len=${text.length} head=${JSON.stringify(text.slice(0, 100))}`);
          return null;
        }
        try { return JSON.parse(text.slice(s, e + 1)) as Record<string, unknown>; } catch {
          try { return JSON.parse(repairJson(text.slice(s, e + 1))) as Record<string, unknown>; } catch { return null; }
        }
      })();
      if (!obj) {
        const tol = tolerantParse(text);
        if (tol) {
          let okT = 0;
          for (let i = 0; i < keys.length; i++) {
            const q = tol[String(i)];
            if (q && valid(q, keys[i])) { out[keys[i]] = q; okT++; }
          }
          if (okT > 0) console.log(`    ⃟ با پارسر تساهلی نجات یافت: ${okT}/${keys.length}`);
          if (okT === keys.length) return out;
          if (okT > 0) { /* ادامه به تلاش بعدی برای بازمانده‌ها */ }
        }
        if (!tol || Object.keys(out).length === 0) throw new Error("bad JSON shape");
      }
      let ok = 0;
      for (let i = 0; i < keys.length; i++) {
        const v = obj?.[String(i)] ?? obj?.[i] ?? "";
        const q = v ? parseQuad(JSON.stringify(v)) : null;
        if (q && valid(q, keys[i])) { out[keys[i]] = q; ok++; }
      }
      if (ok === keys.length) return out;
      const left = keys.filter((k) => !out[k]);
      if (attempt === 2 || left.length === 0) {
        /* تلاش تک‌کلیدی برای بازمانده‌ها */
        for (const k of left) {
          for (let r = 0; r < 2 && !out[k]; r++) {
            try {
              const c1 = await zai.chat.completions.create({
                messages: [
                  { role: "assistant", content: SYSTEM },
                  { role: "user", content: `Translate this single Persian UI string. Reply ONLY JSON {en,ar,tr,zh}:\n${JSON.stringify(k)}` },
                ],
                thinking: { type: "disabled" },
                max_tokens: 1000,
              });
              const q = parseQuad(c1.choices[0]?.message?.content ?? "");
              if (q && valid(q, k)) out[k] = q;
            } catch { /* retry */ }
          }
        }
        return out;
      }
      console.log(`    ⃟ دسته ناقص (${ok}/${keys.length}) — تلاش مجدد برای ${left.length} کلید`);
    } catch (e) {
      const is429 = /429|Too many/i.test(String(e));
      if (!is429 && lastRaw) console.log(`    ⃟ DEBUG tail=${JSON.stringify(lastRaw.slice(-220))}`);
      const wait = is429 ? 12000 * (attempt + 1) : 1500 * (attempt + 1);
      console.log(`    ⃟ خطای LLM: ${String(e).slice(0, 80)} — صبر ${Math.round(wait / 1000)}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  return out;
}

/* ── تولید ext-b9.ts ────────────────────────────────────────────────────── */

const esc = (s: string) => JSON.stringify(s);

function genExtB9(trans: Record<string, Quad>): void {
  const keys = Object.keys(trans).sort((a, b) => a.localeCompare(b, "fa"));
  const rows = keys
    .map((k) => `  ${esc(k)}: [\n    ${esc(trans[k].en)},\n    ${esc(trans[k].ar)},\n    ${esc(trans[k].tr)},\n    ${esc(trans[k].zh)},\n  ],`)
    .join("\n");
  const content = `import type { Locale } from "../core";

/**
 * لایهٔ تکمیل ترجمه (تولیدشده توسط scripts/i18n-translate.ts با LLM + اعتبارسنجی):
 * ${keys.length} کلیدِ t()/tf() که در لایه‌های قبلی نبودند — کلید = رشتهٔ فارسی منبع.
 * هر ردیف: [en, ar, tr, zh]. ویرایش دستی مجاز است؛ برای افزودن کلید جدید، اسکریپت را دوباره اجرا کنید.
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
${rows}
};

export const EXT_B9: Record<Exclude<Locale, "fa">, Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
`;
  writeFileSync(OUT_FILE, content, "utf8");
}

/* ── main ───────────────────────────────────────────────────────────────── */

async function main() {
  const genOnly = process.argv.includes("--gen-only");
  const missing = missingKeys();
  console.log(`کلیدهای جاافتاده: ${missing.length}`);

  const trans: Record<string, Quad> = existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, "utf8")) : {};
  const todo = missing.filter((k) => !trans[k]);
  console.log(`ترجمه‌شدهٔ قبلی: ${Object.keys(trans).length} · باقی‌مانده: ${todo.length}`);

  if (!genOnly && todo.length > 0) {
    const zai = await ZAI.create();
    const batches: string[][] = [];
    for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
    let next = 0;
    let doneBatches = 0;
    const WORKERS = 1;
    console.log(`${batches.length} دسته × ${BATCH} کلید — ${WORKERS} کارگر موازی…`);
    async function worker() {
      while (true) {
        const idx = next++;
        if (idx >= batches.length) return;
        const batch = batches[idx];
        const got = await translateBatch(zai, batch);
        Object.assign(trans, got);
        writeFileSync(PROGRESS, JSON.stringify(trans, null, 1), "utf8");
        doneBatches++;
        const miss = batch.length - Object.keys(got).length;
        console.log(`  ✓ دستهٔ ${idx + 1}/${batches.length} — ${Object.keys(got).length} کلید${miss > 0 ? ` · ${miss} ناموفق` : ""} · مجموع: ${Object.keys(trans).length}`);
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
    await Promise.all(Array.from({ length: WORKERS }, () => worker()));
  }

  const done = missing.filter((k) => trans[k]);
  const failed = missing.filter((k) => !trans[k]);
  console.log(`\nنتیجه: ${done.length}/${missing.length} کلید ترجمه شد · ناموفق: ${failed.length}`);
  for (const k of failed.slice(0, 10)) console.log(`  ✗ «${k.slice(0, 70)}»`);

  if (done.length > 0) {
    const onlyDone: Record<string, Quad> = {};
    for (const k of done) onlyDone[k] = trans[k];
    genExtB9(onlyDone);
    console.log(`\n✓ ${OUT_FILE} ساخته شد (${done.length} کلید). حالا EXT_B9 را در dicts/index.ts ثبت کنید.`);
  }
}

main();
