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
import { eq, sql } from "drizzle-orm";

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
  /** کوئری جستجوی وب — تفصیلی */
  query: string;
  /** کوئری دوم کوتاه‌تر — هر دو هم‌زمان جستجو می‌شوند تا پوشش نتایج دوبرابر شود */
  query2: string;
  /** محدودیت تازگی نتایج (روز) */
  recencyDays: number;
}

/** موضوع‌های متغیر سالانهٔ حقوق ایران — گسترش این فهرست آزاد است */
export const LAW_FACT_TOPICS: LawFactTopic[] = [
  { topic: "diya", title: "مبلغ دیه", keywords: ["دیه", "دیات", "خسارت جانی", "ارش"], query: "دیه ۱۴۰۴ چند است", query2: "مبلغ دیه کامل ۱۴۰۴ ماه عادی و ماه حرام ابلاغ", recencyDays: 400 },
  { topic: "minimum-wage", title: "حداقل دستمزد کارگر", keywords: ["دستمزد", "حقوق کارگر", "مزد", "شورای عالی کار"], query: "حداقل دستمزد کارگر ۱۴۰۴ مصوب شورای عالی کار ابلاغ", query2: "حداقل دستمزد ۱۴۰۴ چقدر شد", recencyDays: 400 },
  { topic: "worker-benefits", title: "بن کارگری و حق مسکن", keywords: ["بن کارگر", "حق مسکن کارگری", "خواربار", "بن خواربار"], query: "مبلغ بن کارگری حق مسکن و خواربار ۱۴۰۴", query2: "بن کارگری ۱۴۰۴ چند تومان شد", recencyDays: 400 },
  { topic: "salary-tax", title: "معافیت مالیات حقوق", keywords: ["مالیات", "معافیت مالیاتی", "مالیات حقوق"], query: "سقف معافیت مالیات حقوق ۱۴۰۴ نرخ پلکانی ماده ۸۴", query2: "معافیت مالیاتی حقوق ۱۴۰۴ چقدر است", recencyDays: 400 },
  { topic: "marriage-loan", title: "وام ازدواج و فرزندآوری", keywords: ["وام ازدواج", "وام فرزندآوری", "تسهیلات ازدواج"], query: "مبلغ وام ازدواج و وام فرزندآوری ۱۴۰۴", query2: "وام ازدواج ۱۴۰۴ چند میلیارد تومان", recencyDays: 400 },
  { topic: "traffic-fine", title: "جریمه‌های رانندگی", keywords: ["جریمه", "رانندگی", "پلاک", "گواهینامه", "تخلف رانندگی"], query: "مبلغ جریمه تخلفات رانندگی ۱۴۰۴ جدول", query2: "جریمه رانندگی ۱۴۰۴ چقدر شد", recencyDays: 200 },
  { topic: "check-interest", title: "خسارت تأخیر چک", keywords: ["بهره چک", "خسارت تأخیر", "چک برگشتی", "صدور چک"], query: "نرخ خسارت تأخیر تأدیه وجه چک ۱۴۰۴ نرخ بین بانکی", query2: "خسارت تاخیر چک ۱۴۰۴ چند درصد", recencyDays: 400 },
  { topic: "vat", title: "مالیات بر ارزش افزوده", keywords: ["ارزش افزوده"], query: "نرخ مالیات بر ارزش افزوده ۱۴۰۴", query2: "ارزش افزوده ۱۴۰۴ چند درصد شد", recencyDays: 400 },
  { topic: "rent-index", title: "افزایش اجاره‌بها", keywords: ["اجاره", "موجر", "مستأجر", "افزایش اجاره", "اجاره‌بها"], query: "ضابطه افزایش اجاره‌بها ۱۴۰۴ مصوب کارگروه ملی", query2: "افزایش اجاره ۱۴۰۴ چند درصد", recencyDays: 200 },
  { topic: "eid-bonus", title: "عیدی و سنوات کارگران", keywords: ["عیدی", "سنوات", "حق سنوات", "پایان کار"], query: "مبلغ عیدی و سنوات کارگران ۱۴۰۴", query2: "عیدی ۱۴۰۴ کارگران چقدر شد", recencyDays: 400 },
  { topic: "court-fee", title: "هزینهٔ دادرسی دعاوی مالی", keywords: ["هزینه دادرسی", "تمبر دادرسی", "هزینه ثبت دعوا", "هزینه واخواهی"], query: "هزینه دادرسی دعاوی مالی ۱۴۰۴ ضریب ابلاغی رؤسای قوه", query2: "هزینه دادرسی دعوای مالی ۱۴۰۴ چند", recencyDays: 400 },
  { topic: "attorney-fee", title: "تعرفه حق‌الوکاله وکلا", keywords: ["حق‌الوکاله", "تعرفه وکلا", "دستمزد وکیل", "حق الوکاله"], query: "تعرفه حق‌الوکاله ۱۴۰۴ ابلاغ رؤسای قوه قضاییه", query2: "حق‌الوکاله ۱۴۰۴ دعاوی مالی پلکانی", recencyDays: 400 },
  { topic: "pension", title: "حداقل مستمری بازنشستگان", keywords: ["مستمری", "بازنشستگان", "تأمین اجتماعی", "حقوق بازنشستگی"], query: "حداقل مستمری بازنشستگان تأمین اجتماعی ۱۴۰۴", query2: "حقوق بازنشستگان ۱۴۰۴ چند شد", recencyDays: 400 },
  { topic: "unemployment", title: "مقرری بیمه بیکاری", keywords: ["بیمه بیکاری", "مقرری بیکاری", "بیمهٔ بیکاری"], query: "مقرری بیمه بیکاری ۱۴۰۴ چقدر است", query2: "حداقل مقرری بیمه بیکاری ۱۴۰۴", recencyDays: 400 },
  { topic: "property-tax", title: "مالیات نقل و انتقال املاک", keywords: ["مالیات نقل و انتقال", "مالیات ملک", "نقل و انتقال املاک"], query: "نرخ مالیات نقل و انتقال ملک ۱۴۰۴", query2: "مالیات نقل و انتقال املاک ۱۴۰۴ چند درصد", recencyDays: 400 },
  { topic: "building-wage", title: "دستمزد روزانهٔ کارگر ساختمانی", keywords: ["دستمزد ساختمانی", "اجرت روزانه", "کارگر ساختمانی", "اجرت المثل کارگر"], query: "دستمزد روزانه کارگر ساختمانی ۱۴۰۴", query2: "اجرت روزانه کارگر بنا ۱۴۰۴ چند", recencyDays: 400 },
];

/* ───────────────────────────────────────────────────────────────────────────
 * حقایق ثابت قانونی — مهلت‌ها و قواعد قانونی که هر سال تغییر نمی‌کنند
 * (مثل مهلت تجدیدنظر یا ساعت کار قانونی) — نیازی به جستجوی وب ندارند و
 * همیشه همراه داده‌های همگام‌شده به پرامپت تزریق می‌شوند.
 * فقط قواعد پابرجا و مستند به شمارهٔ ماده — بدون ریسک کهنگی عدد.
 * ─────────────────────────────────────────────────────────────────────── */

export interface StaticLawFact {
  topic: string;
  title: string;
  keywords: string[];
  value: string;
  source: string;
}

export const STATIC_LAW_FACTS: StaticLawFact[] = [
  { topic: "appeal-deadline", title: "مهلت تجدیدنظرخواهی از حکم", keywords: ["تجدیدنظر", "تجدید نظر", "مهلت اعتراض به حکم"], value: "۲۰ روز از تاریخ ابلاغ حکم؛ برای محکوم غایب از تاریخ نشر آخرین آگهی در روزنامه. اعتراض بعد از مهلت، قرار رد می‌شود (مادهٔ ۳۳۶ قانون آیین دادرسی مدنی).", source: "مادهٔ ۳۳۶ قانون آیین دادرسی مدنی" },
  { topic: "ruling-objection-deadline", title: "مهلت اعتراض به قرارها", keywords: ["اعتراض به قرار", "قرار رد دادخواست", "قرار عدم استماع"], value: "اعتراض به قرارهای قابل تجدیدنظر ۱۰ روز از تاریخ ابلاغ است (در مقایسه با حکم که ۲۰ روز است).", source: "مادهٔ ۳۳۸ قانون آیین دادرسی مدنی" },
  { topic: "vakhohati-deadline", title: "مهلت واخواهی", keywords: ["واخواهی", "حکم غیابی", "لایحه واخواهی"], value: "محکوم غایب ۲۰ روز برای واخواهی از حکم غیابی دارد — از تاریخ ابلاغ واقعی؛ اگر ابلاغ قانونی از طریق نشر بوده، از تاریخ نشر آخرین آگهی (مادهٔ ۳۰۶ قانون آیین دادرسی مدنی).", source: "مادهٔ ۳۰۶ قانون آیین دادرسی مدنی" },
  { topic: "farjam-deadline", title: "مهلت فرجام‌خواهی", keywords: ["فرجام", "فرجام‌خواهی", "دیوان عالی"], value: "مهلت فرجام‌خواهی از احکام و قرارهای قطعی‌پذیر ۲۰ روز از تاریخ ابلاغ است (مادهٔ ۴۲۹ قانون آیین دادرسی مدنی).", source: "مادهٔ ۴۲۹ قانون آیین دادرسی مدنی" },
  { topic: "check-presentation", title: "مهلت ارائهٔ چک به بانک", keywords: ["چک", "ارائه چک", "چک برگشتی"], value: "دارندهٔ چک ۶ ماه از تاریخ صدور برای ارائهٔ آن به بانک وقت دارد؛ پس از آن بانک از پرداخت خودداری می‌کند (مادهٔ ۳۱۵ قانون تجارت). خسارت تأخیر تأدیهٔ وجه چک طبق نرخ اعلامی بانک مرکزی است.", source: "مادهٔ ۳۱۵ قانون تجارت" },
  { topic: "sayadi-check", title: "ثبت چک در سامانهٔ صیاد", keywords: ["صیاد", "چک صیادی", "ثبت چک"], value: "صدور چک از سال ۱۳۹۷ مشروط به ثبت مشخصات در سامانهٔ صیاد بانک مرکزی است؛ چک ثبت‌نشده در سامانه از سوی بانک قابل وصول نیست و مسئولیت صدور با صادرکننده است.", source: "اصلاحیهٔ قانون صدور چک (مصوب ۱۳۹۷)" },
  { topic: "work-hours", title: "ساعت کار قانونی", keywords: ["ساعت کار", "کار روزانه", "اضافه‌کاری"], value: "ساعت کار قانونی کارگر ۴۴ ساعت در هفته است و کار روزانه نباید از ۸ ساعت تجاوز کند؛ اضافه‌کاری با موافقت کارگر و ۴۰٪ اضافه‌نرخ محاسبه می‌شود.", source: "مادهٔ ۵۱ و ۵۹ قانون کار" },
  { topic: "probation-period", title: "دورهٔ آزمایشی کارگر", keywords: ["آزمایشی", "دوره آزمایشی"], value: "دورهٔ آزمایشی در قرارداد کار حداکثر برای کارگر ساده یک ماه، نیمه‌ماهر و ماهر تا دو ماه و کارگرانی با تحصیلات تخصصی تا سه ماه است؛ در دورهٔ آزمایشی هر یک از طرفین بدون اخطار و بدون پرداخت خسارت می‌تواند رابطه را قطع کند.", source: "مادهٔ ۱۱ قانون کار" },
  { topic: "annual-leave", title: "مرخصی استحقاقی سالانه", keywords: ["مرخصی", "مرخصی سالانه", "استحقاقی"], value: "مرخصی استحقاقی سالانهٔ کارگران با احتساب ۴ جمعه، ۴ هفته است (برای کار کمتر از یک سال به نسبت همان مدت). مرخصی ذخیرهٔ سال قبل قابل استفاده در سال بعد است.", source: "مادهٔ ۶۴ و ۶۶ قانون کار" },
  { topic: "tax-appeal-deadline", title: "مهلت شکایت مالیاتی", keywords: ["مالیات", "برگ تشخیص", "شکایت مالیاتی", "هیئت حل اختلاف"], value: "مهلت ارائهٔ اعتراض به برگ تشخیص مالیات ۲۰ روز از تاریخ ابلاغ است؛ رسیدگی ابتدا در هیئت حل اختلاف مالیاتی انجام می‌شود و مرجع اجرای برگ قطعی، ادارهٔ امور مالیاتی است.", source: "مادهٔ ۲۴۹ و ۲۵۰ قانون مالیات‌های مستقیم" },
  { topic: "enforcement-deadline", title: "مهلت پرداخت محکومٌ‌به پس از اجراییه", keywords: ["اجراییه", "محکوم به", "محکومٌ‌به", "بازداشت محکوم", "اعسار"], value: "محکومٌ‌علیه ۳۰ روز از ابلاغ اجراییه برای پرداخت وقت دارد؛ اگر نپردازد و اعسارش ثابت نشود، با درخواست محکومٌ‌له بازداشت می‌شود تا ادای دین. تقاضای اعسار تا قبل از پرداخت کامل قابل طرح است.", source: "مادهٔ ۲ قانون نحوهٔ اجرای محکومیت‌های مالی (۱۳۹۴)" },
  { topic: "revocable-power", title: "قاعدهٔ وکالت و عزل", keywords: ["وکالت بلاعزل", "عزل وکیل", "وکالت‌نامه"], value: "وکالت به‌طور کلی قابل فسخ توسط موکل است و در وکالت بلاعزل، عزل وکیل یا استعفای او فقط در موارد مندرج در وکالت‌نامه یا با رضایت طرف دیگر ممکن است؛ مرگ یا جنون هر یک از طرفین وکالت را منفسه می‌کند.", source: "مادهٔ ۶۷۹ قانون مدنی" },
  { topic: "ghabn-rule", title: "قاعدهٔ غبن (معاملهٔ ناسازوار)", keywords: ["غبن", "فریب", "ناسازوار", "ابطال معامله"], value: "برای امکان ابطال به‌علت غبن، باید بی‌عدالی به‌حدی باشد که عرفاً قابل مسامحه نباشد؛ سنجش غبن با عرف و جبرانش به مابه‌التفاوت قیمت است و ادعای غبن فقط تا زمان رفع جهل طرفِ مغبون قابل استماع است.", source: "مواد ۴۱۶ تا ۴۲۰ قانون مدنی" },
  { topic: "mehr-al-mesl", title: "ملاک‌های مهرالمثل", keywords: ["مهرالمثل", "مهر المثل", "اُجرت المثل زن"], value: "در تعیین مهرالمثل وضع زن از حیث شرافت و گشت و گذار، مدت زندگی مشترک، نوع و میزان کارهایی که زن در خانهٔ شوهر انجام داده و وسعت دارایی شوهر ملاک است؛ مهرالمثل فقط وقتی قابل مطالبه است که مهر تعیین نشده یا مهر فاسد بوده باشد.", source: "مادهٔ ۱۰۹۱ قانون مدنی" },
  { topic: "inheritance-degrees", title: "طبقات ارث", keywords: ["ارث", "وراث", "طبقات ارث", "تقسیم ارث"], value: "طبق مادهٔ ۸۶۲ قانون مدنی، طبقهٔ اول: پدر و مادر و اولاد و اولادِ اولاد؛ طبقهٔ دوم: پدربزرگ/مادربزرگ و برادر و خواهر و اولادشان؛ طبقهٔ سوم: عموها، عمه‌ها، دایی‌ها و خاله‌ها و اولادشان. با بودن هر طبقه، طبقهٔ بعد ارث نمی‌برد.", source: "مواد ۸۶۲ تا ۸۶۷ قانون مدنی" },
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
    // حقایق ثابت قانونی (مهلت‌ها و قواعد پابرجا) — همیشه حاضرند، نیازی به sync ندارند
    const staticRows: LawFactRow[] = STATIC_LAW_FACTS.map((s) => ({
      topic: s.topic,
      keywords: s.keywords,
      title: s.title,
      value: s.value,
      sourceUrl: null,
      sourceName: s.source,
      yearLabel: null,
      updatedAt: new Date(0),
    }));
    const merged = [...staticRows, ...mapped];
    factsCache = { at: Date.now(), rows: merged };
    return merged;
  } catch {
    // DB در دسترس نیست → دست‌کم حقایق ثابت قانونی (که مستقل از DB هستند) پاسخ بده
    if (factsCache) return factsCache.rows;
    return STATIC_LAW_FACTS.map((s) => ({
      topic: s.topic,
      keywords: s.keywords,
      title: s.title,
      value: s.value,
      sourceUrl: null,
      sourceName: s.source,
      yearLabel: null,
      updatedAt: new Date(0),
    }));
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

const FACT_EXTRACT_PROMPT = (topic: string) => `بر اساس نتایج جستجوی زیر، مقدار «${topic}» مطابق آخرین ابلاغ/مصوبهٔ ایران را در حداکثر ۳۵۰ کاراکتر فارسی بنویس.
فقط خودِ مقدار و یک جملهٔ توضیح کوتاه (مثلاً تفکیک ماه عادی/حرام یا سقف‌های پلکانی) — بدون مقدمه، بدون اشاره به «بر اساس نتایج جستجو» و بدون عبارت ابهام‌آمیز.
مهم: فقط مقداری را بگو که صراحتاً متعلق به سال ۱۴۰۴ است؛ اگر عدد موجود در نتایج متعلق به سال یا سال‌های قبل (۱۴۰۳ یا قدیمی‌تر) است، دقیقاً بنویس: «مقدار روز در دسترس نیست — به ابلاغیهٔ سال جاری مراجعه شود.»`;

/** بودجهٔ زمانی هر موضوع تا کل sync زیر سقف serverless بماند */
const TOPIC_WEB_MS = 7_000;
const TOPIC_LLM_MS = 9_000;
const CONCURRENCY = 4;
/** حداکثر موضوع در هر اجرا — کهنه‌ترین‌ها اول؛ بقیه در اجرای بعدی (شب بعد) پوشش داده می‌شوند */
const MAX_TOPICS_PER_RUN = 8;
/** موضوع تازه‌تر از این عمر دوباره sync نمی‌شود (کافی است روزی یک‌بار) */
const FRESH_MS = 20 * 60 * 60_000;

async function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([task, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

async function syncOneTopic(t: LawFactTopic): Promise<"ok" | "skip"> {
  try {
    // دو کوئری هم‌زمان (تفصیلی + کوتاه) — پوشش دوبرابر با همان بودجهٔ زمانی
    const [ra, rb] = await Promise.all([
      withTimeout(webSearch(t.query, 5, t.recencyDays), TOPIC_WEB_MS),
      withTimeout(webSearch(t.query2, 5, t.recencyDays), TOPIC_WEB_MS),
    ]);
    const seen = new Set<string>();
    const results = [...(ra ?? []), ...(rb ?? [])].filter((r) => {
      if (!r?.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
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
    if (value.includes("در دسترس نیست") && value.length < 90) {
      // عدد سال جاری پیدا نشد — اگر دادهٔ قبلی مربوط به سال قبل بود حذفش کن تا به‌عنوان «روز» نمایش داده نشود
      try {
        const cur = (await db.select().from(lawFacts)) as unknown as Array<{ topic: string; value: string }>;
        const old = cur.find((r) => r.topic === t.topic);
        if (old && /۱۴۰[0-3]|۱۳۹\d/.test(old.value) && !old.value.includes("۱۴۰۴")) {
          await db.delete(lawFacts).where(eq(lawFacts.topic, t.topic));
        }
      } catch { /* حذف اختیاری است */ }
      return "skip"; // دادهٔ قبلی سالم بماند؛ عدد واقعی پیدا نشد
    }
    const yearMatch = value.match(/۱۴۰\d/);
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
        yearLabel: yearMatch ? yearMatch[0] : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: lawFacts.topic,
        set: { value: value.slice(0, 700), sourceUrl: top.url ?? null, sourceName: top.host_name ?? null, yearLabel: yearMatch ? yearMatch[0] : null, updatedAt: new Date() },
      });
    return "ok";
  } catch {
    return "skip";
  }
}

/** همگام‌سازی — کهنه‌ترین موضوع‌ها اول (حداکثر ۸ در هر اجرا) تا بودجهٔ زمانی حفظ شود و هر شب همه تا حد امکان تازه شوند */
export async function syncLawFacts(): Promise<{ ok: number; skip: number; ran: number; total: number }> {
  let ok = 0;
  let skip = 0;
  try {
    await ensureLawFactsTable();
  } catch {
    /* جدول از قبل هست یا موقتاً در دسترس نیست — ادامه بده */
  }
  // موجودی فعلی برای تشخیص کهنه‌ترین‌ها (خطا → همه کهنه فرض می‌شوند)
  let existing: Record<string, number> = {};
  try {
    const rows = (await db.select({ topic: lawFacts.topic, updatedAt: lawFacts.updatedAt }).from(lawFacts)) as unknown as { topic: string; updatedAt: Date }[];
    existing = Object.fromEntries(rows.map((r) => [r.topic, new Date(r.updatedAt).getTime()]));
  } catch { /* بدون موجودی */ }
  const now = Date.now();
  const stale = LAW_FACT_TOPICS
    .map((t) => ({ t, at: existing[t.topic] ?? 0 }))
    .filter((x) => now - x.at > FRESH_MS)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_TOPICS_PER_RUN)
    .map((x) => x.t);
  const ran = stale.length;
  for (let i = 0; i < stale.length; i += CONCURRENCY) {
    const batch = stale.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(syncOneTopic));
    for (const r of results) r === "ok" ? ok++ : skip++;
  }
  invalidateFactsCache();
  return { ok, skip, ran, total: LAW_FACT_TOPICS.length };
}
