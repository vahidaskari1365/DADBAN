import "server-only";

/**
 * داده‌های به‌روز قوانین ایران — دستیار هوش مصنوعی باید «با قانون‌های روز» پاسخ بدهد.
 *
 * مکانیزم:
 *  ۱) هر شب کرونِ Vercel، مسیر /api/ai/law-sync را صدا می‌زند؛ برای هر موضوع متغیرِ سالانه
 *     (دیه، دستمزد، مالیات، وام، جریمه‌ها و…) جستجوی وب انجام می‌شود و مقدار روز با LLM
 *     استخراج و در جدول law_facts ذخیره می‌گردد.
 *  ۲) در چت، قبل از پاسخ‌گویی، موضوع‌های مرتبط با سؤال کاربر از همین جدول (با کش ۳۰ دقیقه‌ای
 *     در حافظه) به پرامپت سیستم تزریق می‌شود — پاسخ سریع و به‌روز، بدون انتظارِ جستجوی زنده.
 */

import { db } from "@/db";
import { lawFacts } from "@/db/schema";
import { askLLM } from "@/lib/llm";
import { webSearch } from "@/lib/ai";
import { sql } from "drizzle-orm";

/**
 * ساخت ایمن و idempotent جدول law_facts — سندباکس توسعه به DB تولید دسترسی ندارد،
 * پس خودِ مسیر sync بار اول جدول را می‌سازد (CREATE TABLE IF NOT EXISTS) تا کرون همیشه سالم اجرا شود.
 */
export async function ensureLawFactsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "law_facts" (
      "id" serial PRIMARY KEY,
      "topic" text NOT NULL UNIQUE,
      "keywords" text NOT NULL,
      "title" text NOT NULL,
      "value" text NOT NULL,
      "source_url" text,
      "source_name" text,
      "year_label" text,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
}

export interface LawFactTopic {
  /** کلید لاتین یکتا */
  topic: string;
  /** عنوان نمایشی فارسی */
  title: string;
  /** کلیدواژه‌های فارسی برای تطبیق با سؤال کاربر */
  keywords: string[];
  /** کوئری جستجوی وب */
  query: string;
  /** محدودیت تازگی نتایج (روز) */
  recencyDays: number;
}

/** موضوع‌های متغیر سالانهٔ حقوق ایران — گسترش این فهرست آزاد است */
export const LAW_FACT_TOPICS: LawFactTopic[] = [
  { topic: "diya", title: "مبلغ دیه", keywords: ["دیه", "دیات", "خسارت جانی", "ارش"], query: "مبلغ دیه کامل ۱۴۰۴ ماه عادی و ماه حرام ابلاغ رئیس قوه قضاییه", recencyDays: 400 },
  { topic: "minimum-wage", title: "حداقل دستمزد کارگر", keywords: ["دستمزد", "حقوق کارگر", "مزد", "شورای عالی کار"], query: "حداقل دستمزد کارگر ۱۴۰۴ مصوب شورای عالی کار ابلاغ", recencyDays: 400 },
  { topic: "worker-benefits", title: "بن کارگری و حق مسکن", keywords: ["بن کارگر", "حق مسکن کارگری", "خواربار", "بن خواربار"], query: "مبلغ بن کارگری حق مسکن و خواربار ۱۴۰۴", recencyDays: 400 },
  { topic: "salary-tax", title: "معافیت مالیات حقوق", keywords: ["مالیات", "معافیت مالیاتی", "مالیات حقوق"], query: "سقف معافیت مالیات حقوق ۱۴۰۴ نرخ پلکانی ماده ۸۴", recencyDays: 400 },
  { topic: "marriage-loan", title: "وام ازدواج و فرزندآوری", keywords: ["وام ازدواج", "وام فرزندآوری", "تسهیلات ازدواج"], query: "مبلغ وام ازدواج و وام فرزندآوری ۱۴۰۴", recencyDays: 400 },
  { topic: "traffic-fine", title: "جریمه‌های رانندگی", keywords: ["جریمه", "رانندگی", "پلاک", "گواهینامه", "تخلف رانندگی"], query: "مبلغ جریمه تخلفات رانندگی ۱۴۰۴ جدول", recencyDays: 200 },
  { topic: "check-interest", title: "خسارت تأخیر چک", keywords: ["بهره چک", "خسارت تأخیر", "چک برگشتی", "صدور چک"], query: "نرخ خسارت تأخیر تأدیه وجه چک ۱۴۰۴ نرخ بین بانکی", recencyDays: 400 },
  { topic: "vat", title: "مالیات بر ارزش افزوده", keywords: ["ارزش افزوده"], query: "نرخ مالیات بر ارزش افزوده ۱۴۰۴", recencyDays: 400 },
  { topic: "rent-index", title: "افزایش اجاره‌بها", keywords: ["اجاره", "موجر", "مستأجر", "افزایش اجاره", "اجاره‌بها"], query: "ضابطه افزایش اجاره‌بها ۱۴۰۴ مصوب کارگروه ملی", recencyDays: 200 },
  { topic: "eid-bonus", title: "عیدی و سنوات کارگران", keywords: ["عیدی", "سنوات", "حق سنوات", "پایان کار"], query: "مبلغ عیدی و سنوات کارگران ۱۴۰۴", recencyDays: 400 },
];

/* ─── کش درون‌حافظهٔ ۳۰ دقیقه‌ای برای خواندن سریع در هر درخواست چت ─── */

type FactsCache = { at: number; rows: LawFactRow[] };
type LawFactRow = { topic: string; keywords: string[]; title: string; value: string; sourceUrl: string | null; sourceName: string | null; yearLabel: string | null; updatedAt: Date };

let factsCache: FactsCache | null = null;
const FACTS_TTL = 30 * 60_000;

async function loadFacts(): Promise<LawFactRow[]> {
  if (factsCache && Date.now() - factsCache.at < FACTS_TTL) return factsCache.rows;
  try {
    const rows = (await db.select().from(lawFacts)) as unknown as Array<{
      topic: string; keywords: string; title: string; value: string;
      sourceUrl: string | null; sourceName: string | null; yearLabel: string | null; updatedAt: Date;
    }>;
    const mapped: LawFactRow[] = rows.map((r) => ({
      topic: r.topic,
      keywords: r.keywords.split("|").map((k) => k.trim()).filter(Boolean),
      title: r.title,
      value: r.value,
      sourceUrl: r.sourceUrl,
      sourceName: r.sourceName,
      yearLabel: r.yearLabel,
      updatedAt: r.updatedAt,
    }));
    factsCache = { at: Date.now(), rows: mapped };
    return mapped;
  } catch {
    return factsCache?.rows ?? []; // DB در دسترس نیست → بدون facts پاسخ بده (هرگز چت را نبند)
  }
}

export function invalidateFactsCache(): void {
  factsCache = null;
}

/** موضوع‌های مرتبط با سؤال کاربر (حداکثر ۴ مورد) — کلیدواژه‌محور و سریع */
export async function getRelevantLawFacts(query: string): Promise<LawFactRow[]> {
  const q = (query || "").trim();
  if (q.length < 3) return [];
  const rows = await loadFacts();
  if (!rows.length) return [];
  const hits: { row: LawFactRow; score: number }[] = [];
  for (const row of rows) {
    let score = 0;
    for (const kw of row.keywords) {
      if (kw && q.includes(kw)) score += kw.length >= 4 ? 2 : 1;
    }
    if (score > 0) hits.push({ row, score });
  }
  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((h) => h.row);
}

/** متن تزریقی به پرامپت سیستم — دستور استفاده از مقادیر روز */
export function buildLawFactsPrompt(facts: LawFactRow[]): string {
  if (!facts.length) return "";
  const lines = facts.map((f) => {
    const src = f.sourceName ? ` (منبع: ${f.sourceName})` : "";
    return `- ${f.title}: ${f.value}${src}`;
  });
  return `\n\nداده‌های قانونی به‌روز (به‌روزرسانی خودکار روزانه از منابع رسمی/معتبر وب):\n${lines.join("\n")}\nاگر این داده‌ها به سؤال مرتبط‌اند، حتماً از همین مقادیر استفاده کن و مقدار قدیمی‌تر نگو.`;
}

/* ─── همگام‌سازی روزانه ───────────────────────────────────────────────── */

const FACT_EXTRACT_PROMPT = (topic: string) => `بر اساس نتایج جستجوی زیر، مقدار «${topic}» مطابق آخرین ابلاغ/مصوبهٔ سال جاری ایران را در حداکثر ۳۵۰ کاراکتر فارسی بنویس.
فقط خودِ مقدار و یک جملهٔ توضیح کوتاه (مثلاً تفکیک ماه عادی/حرام یا سقف‌های پلکانی) — بدون مقدمه، بدون اشاره به «بر اساس نتایج جستجو» و بدون عبارت ابهام‌آمیز.
اگر نتایج، عدد سال جاری را نداشتند، دقیق بنویس: «مقدار روز در دسترس نیست — به ابلاغیهٔ سال جاری مراجعه شود.»`;

/** بودجهٔ زمانی هر موضوع تا کل sync زیر سقف serverless بماند */
const TOPIC_WEB_MS = 6_000;
const TOPIC_LLM_MS = 8_000;
const CONCURRENCY = 4;

async function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([task, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

async function syncOneTopic(t: LawFactTopic): Promise<"ok" | "skip"> {
  try {
    const results = (await withTimeout(webSearch(t.query, 5, t.recencyDays), TOPIC_WEB_MS)) ?? [];
    if (!results.length) return "skip";
    const context = results
      .slice(0, 5)
      .map((r, i) => `[${i + 1}] ${r.name}\n${(r.snippet || "").slice(0, 400)}\n${r.url}`)
      .join("\n\n");
    const value = await withTimeout(
      askLLM([{ role: "user", content: `${FACT_EXTRACT_PROMPT(t.title)}\n\nنتایج جستجو:\n${context}` }], 320, "فقط مقدار خواسته‌شده را به فارسی بنویس — بدون توضیح اضافه.", { sanitize: true }),
      TOPIC_LLM_MS,
    );
    if (!value || value.length < 8) return "skip";
    if (value.includes("در دسترس نیست") && value.length < 90) return "skip"; // عدد واقعی پیدا نشد — دادهٔ قبلی بماند
    const top = results[0];
    await db
      .insert(lawFacts)
      .values({
        topic: t.topic,
        keywords: t.keywords.join("|"),
        title: t.title,
        value: value.slice(0, 700),
        sourceUrl: top.url ?? null,
        sourceName: top.host_name ?? null,
        yearLabel: "۱۴۰۴",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: lawFacts.topic,
        set: { value: value.slice(0, 700), sourceUrl: top.url ?? null, sourceName: top.host_name ?? null, updatedAt: new Date() },
      });
    return "ok";
  } catch {
    return "skip";
  }
}

/** همگام‌سازی همهٔ موضوع‌ها — با همزمانی محدود تا زیر سقف زمانی serverless بماند */
export async function syncLawFacts(): Promise<{ ok: number; skip: number; total: number }> {
  let ok = 0;
  let skip = 0;
  try {
    await ensureLawFactsTable();
  } catch {
    /* جدول از قبل هست یا موقتاً در دسترس نیست — ادامه بده */
  }
  const topics = LAW_FACT_TOPICS;
  for (let i = 0; i < topics.length; i += CONCURRENCY) {
    const batch = topics.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(syncOneTopic));
    for (const r of results) r === "ok" ? ok++ : skip++;
  }
  invalidateFactsCache();
  return { ok, skip, total: topics.length };
}
