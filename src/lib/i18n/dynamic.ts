import { db } from "@/db";
import { contentTranslations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { askLLM, type LlmMessage } from "@/lib/llm";
import type { Locale } from "./core";

/**
 * ترجمهٔ داینامیک محتوای فارسیِ دیتابیس (مقالات، پروفایل وکلا، شهرها و…)
 * برای زبان‌های en/ar/tr/zh — با کش سه‌لایه:
 *   ۱) کش حافظهٔ پروسه (Map) — داغ‌ترین مسیر
 *   ۲) جدول content_translations روی DB — دائمی و مشترک بین نمونه‌ها
 *   ۳) LLM (زنجیرهٔ چندتأمین‌کنندهٔ llm.ts) — فقط در ازدست‌رفتن کش
 *
 * قواعد ایمنی:
 *  - locale === "fa" یا متن خالی → همان متن برگردد (هیچ هزینه‌ای ندارد)
 *  - هر خطا در DB یا LLM → متن فارسی اصلی برگردد (صفحه هرگز نمی‌شکند)
 *  - متن‌های بلند (مقالهٔ ۱۵۰۰+ واژه) به پاراگراف‌های ≤۳۸۰۰ نویسه شکسته و
 *    موازی ترجمه می‌شوند (tdynLong)
 *  - در-flight dedup: درخواست‌های هم‌زمان برای یک متن، یک ترجمهٔ مشترک می‌گیرند
 *  - کلید کش = «<locale>:<sha1 متن فارسی>» → با ویرایش متن، خودکار بی‌اعتبار
 */

/* ── نام زبان‌ها برای پرامپت مترجم ─────────────────────────────────────── */

const TARGET_LANG: Record<Exclude<Locale, "fa">, string> = {
  en: "English",
  ar: "Modern Standard Arabic (العربية الفصحى)",
  tr: "Turkish (Türkçe)",
  zh: "Simplified Chinese (简体中文)",
};

const TRANSLATOR_SYSTEM = (locale: Exclude<Locale, "fa">): string =>
  [
    `You are a professional Persian→${TARGET_LANG[locale]} legal translator for DADBAN, an Iranian legal-services platform.`,
    `Translate the user's Persian text into ${TARGET_LANG[locale]} with these rules:`,
    `1) Keep Iran's legal terminology accurate: وکیل=${locale === "ar" ? "محامٍ" : locale === "tr" ? "avukat" : locale === "zh" ? "律师" : "lawyer"}, حق‌الوکاله=${locale === "ar" ? "أتعاب المحاماة" : locale === "tr" ? "vekalet ücreti" : locale === "zh" ? "律师费" : "attorney fee"}, دادخواست=${locale === "ar" ? "لائحة دعوى" : locale === "tr" ? "dava dilekçesi" : locale === "zh" ? "起诉状" : "petition"}, دادگاه=${locale === "ar" ? "المحكمة" : locale === "tr" ? "mahkeme" : locale === "zh" ? "法院" : "court"}.`,
    `2) Preserve Markdown structure exactly: headings (##), bold (**), lists (-, ۱.), line breaks (\\n\\n).`,
    `3) Names of Iranian laws stay transliterated, e.g. "قانون مدنی" → ${locale === "ar" ? "القانون المدني" : locale === "tr" ? "Medeni Kanun" : locale === "zh" ? "《民法典》" : "Civil Code"}; article numbers stay unchanged (ماده ۱۰۸۲ → Article 1082 / المادة 1082 / Madde 1082 / 第1082条).`,
    `4) Do NOT add explanations, notes, or quotes. Return ONLY the translated text.`,
    `5) Persian person names: transliterate phonetically (${locale === "ar" ? "render in Arabic script" : "Latin/CJK script"}), never translate their meaning.`,
    `6) Keep digits: convert Persian digits (۰-۹) to ${locale === "ar" ? "Arabic-Indic digits" : "Western digits (0-9)"}.`,
    `7) Never output any Persian/Arabic script unless the target language itself uses it.`,
  ].join("\n");

/* ── کش حافظه + dedup ──────────────────────────────────────────────────── */

const mem = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
const MEM_MAX = 4000;

function memSet(key: string, value: string): void {
  if (mem.size >= MEM_MAX) {
    // پاک‌سازی سادهٔ قدیمی‌ترین‌ها — جلوگیری از رشد بی‌حد
    const it = mem.keys();
    for (let i = 0; i < 200; i++) {
      const k = it.next().value;
      if (k === undefined) break;
      mem.delete(k);
    }
  }
  mem.set(key, value);
}

/* ── هش ────────────────────────────────────────────────────────────────── */

async function sha1(text: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Fallback ساده اگر subtle در دسترس نبود (هرگز نباید رخ دهد در node)
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return `f${h.toString(36)}`;
  }
}

/* ── ترجمه با LLM ──────────────────────────────────────────────────────── */

async function translateViaLLM(locale: Exclude<Locale, "fa">, faText: string, maxTokens: number): Promise<string | null> {
  const messages: LlmMessage[] = [{ role: "user", content: faText }];
  const out = await askLLM(messages, maxTokens, TRANSLATOR_SYSTEM(locale), { sanitize: false });
  if (!out) return null;
  const trimmed = out.trim();
  if (!trimmed) return null;
  // گارد سلامت: خروجی تقریباً خالی یا فقط علائم → ناموفق
  if (trimmed.replace(/[\s#*>\-\d\p{P}]/gu, "").length < Math.min(8, faText.length / 4)) return null;
  return trimmed;
}

/* ── API اصلی ──────────────────────────────────────────────────────────── */

/** ترجمهٔ یک متن فارسی به زبان locale (کوتاه/متوسط — تا ~۳۸۰۰ نویسه) */
export async function tdyn(locale: Locale, faText: string, maxTokens = 1400): Promise<string> {
  const text = (faText ?? "").trim();
  if (locale === "fa" || !text) return faText ?? "";

  const key = `${locale}:${await sha1(text)}`;
  const hit = mem.get(key);
  if (hit !== undefined) return hit;

  const running = inflight.get(key);
  if (running) return running;

  const job = (async (): Promise<string> => {
    // ۱) کش DB
    try {
      const rows = await db.select().from(contentTranslations).where(eq(contentTranslations.key, key)).limit(1);
      if (rows[0]?.value) {
        memSet(key, rows[0].value);
        return rows[0].value;
      }
    } catch {
      /* DB در دسترس نیست (مثلاً noop محلی) → مستقیم LLM */
    }
    // ۲) LLM
    const translated = await translateViaLLM(locale, text, maxTokens);
    if (translated) {
      memSet(key, translated);
      try {
        await db
          .insert(contentTranslations)
          .values({ key, value: translated })
          .onConflictDoUpdate({ target: contentTranslations.key, set: { value: translated, updatedAt: new Date() } });
      } catch {
        /* نوشتن کش اختیاری است */
      }
      return translated;
    }
    // ۳) fallback ایمن — همان فارسی
    return faText ?? "";
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

/** آستانهٔ شکستن متن بلند به پاراگراف‌ها */
const CHUNK_LIMIT = 3800;

/** شکستن متن بلند به قطعه‌های ≤۳۸۰۰ نویسه (برای tdynLong و گرم‌کردن کش) */
export function splitChunks(text: string, limit = CHUNK_LIMIT): string[] {
  const src = (text ?? "").trim();
  if (!src) return [];
  const paras = src.split(/\n{2,}/);
  const chunks: string[] = [];
  let cur = "";
  for (const p of paras) {
    if ((cur + "\n\n" + p).length > limit && cur) {
      chunks.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
    // پاراگرافِ تنهایی بلندتر از حد → شکستن سخت روی جمله
    while (cur.length > limit) {
      const cut = cur.lastIndexOf(". ", limit);
      const at = cut > limit / 2 ? cut + 2 : limit;
      chunks.push(cur.slice(0, at));
      cur = cur.slice(at);
    }
  }
  if (cur) chunks.push(cur);
  if (chunks.length > 14) {
    // محافظت از هزینه: بیش از ۱۴ قطعه → فقط ۱۴ قطعه اول + بقیه فارسی می‌ماند
    chunks.length = 14;
  }
  return chunks;
}

/** ترجمهٔ متن بلند (محتوای کامل مقاله) — شکستن به پاراگراف و ترجمهٔ موازی */
export async function tdynLong(locale: Locale, faText: string): Promise<string> {
  const text = (faText ?? "").trim();
  if (locale === "fa" || !text) return faText ?? "";
  if (text.length <= CHUNK_LIMIT) return tdyn(locale, text, 2200);

  const chunks = splitChunks(text);
  const translated = await Promise.all(chunks.map((c) => tdyn(locale, c, 2200)));
  return translated.join("\n\n");
}

/* ── ترجمهٔ آبجکت‌های پرکاربرد ─────────────────────────────────────────── */

/** ترجمهٔ فیلدهای نمایشی یک وکیل (نام، عنوان، شهر، استان) — با کش */
export async function tdynLawyerFields<T extends { name: string; title: string; city: string; province: string }>(
  locale: Locale,
  l: T,
): Promise<T> {
  if (locale === "fa") return l;
  const [name, title, city, province] = await Promise.all([
    tdyn(locale, l.name, 300),
    tdyn(locale, l.title, 300),
    tdyn(locale, l.city, 200),
    tdyn(locale, l.province, 200),
  ]);
  return { ...l, name, title, city, province };
}

/** ترجمهٔ فیلدهای نمایشی یک مقاله — محتوای کامل با tdynLong */
export async function tdynArticle<T extends {
  title: string;
  category: string;
  excerpt: string;
  quickAnswer: string;
  content: string;
  faq: string;
  imageAlt: string | null;
  author: string;
  authorRole: string;
}>(
  locale: Locale,
  a: T,
): Promise<T> {
  if (locale === "fa") return a;
  // فیلدهای کوتاه موازی
  const [title, category, excerpt, quickAnswer, imageAlt, author, authorRole, content, faq] = await Promise.all([
    tdyn(locale, a.title, 400),
    tdyn(locale, a.category, 200),
    tdyn(locale, a.excerpt, 800),
    tdyn(locale, a.quickAnswer, 800),
    a.imageAlt ? tdyn(locale, a.imageAlt, 300) : Promise.resolve(a.imageAlt),
    tdyn(locale, a.author, 300),
    tdyn(locale, a.authorRole, 300),
    tdynLong(locale, a.content),
    translateFaqJson(locale, a.faq),
  ]);
  return { ...a, title, category, excerpt, quickAnswer, imageAlt, author, authorRole, content, faq };
}

/** ترجمهٔ JSON فیلد faq (آرایهٔ {q,a}) */
async function translateFaqJson(locale: Locale, faqJson: string): Promise<string> {
  if (!faqJson || faqJson === "[]") return faqJson;
  try {
    const items = JSON.parse(faqJson) as { q: string; a: string }[];
    if (!Array.isArray(items) || items.length === 0) return faqJson;
    const translated = await Promise.all(
      items.map(async (it) => ({
        q: await tdyn(locale, it.q, 400),
        a: await tdyn(locale, it.a, 900),
      })),
    );
    return JSON.stringify(translated);
  } catch {
    return faqJson;
  }
}
