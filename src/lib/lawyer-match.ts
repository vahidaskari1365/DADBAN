// تطبیق هوشمند وکیل با موضوع مشکل کاربر — پایه‌ی «پیشنهاد وکیل» در چت.
// موضوع از legal-engine (دسته‌بندی ۱۰گانه حقوقی) تشخیص داده می‌شود و به
// تخصص‌های واقعی وکلای پلتفرم نگاشت می‌شود. خروجی همیشه با دیتابیس واقعی
// پر می‌شود؛ در نبود تطابق دقیق، برترین وکلای تأییدشده پیشنهاد می‌شوند.

import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { analyzeLegalQuery } from "@/lib/legal-engine";
import { lawyerData } from "@/lib/auto-seed";

/** وکیل عمومی‌شده برای نمایش در چت / رابط کاربری — بدون فیلد حساس. */
export interface MatchedLawyer {
  id: number;
  slug: string;
  name: string;
  title: string;
  city: string;
  rating: number;
  reviewCount: number;
  caseCount: number;
  priceChat: number;
  priceVoice: number;
  priceVideo: number;
  experienceYears: number;
  verified: boolean;
  topRated: boolean;
  specialties: string[];
  avatarColor: string;
  photoUrl: string | null;
}

/** زیرمجموعه‌ی فیلدهای عمومی وکیل که از دیتابیس انتخاب می‌شود. */
type LawyerPublicRow = Pick<
  typeof lawyers.$inferSelect,
  | "id" | "slug" | "name" | "title" | "city" | "rating" | "reviewCount" | "caseCount"
  | "priceChat" | "priceVoice" | "priceVideo" | "experienceYears" | "verified"
  | "topRated" | "specialties" | "avatarColor" | "photoUrl"
>;

/** نگاشت موضوع حقوقی → تخصص‌های وکلای دادبان (مطابق specialties در دیتابیس). */
export const TOPIC_SPECIALTIES: Record<string, string[]> = {
  "طلاق": ["خانواده", "طلاق"],
  "مهریه": ["خانواده", "طلاق"],
  "چک برگشتی": ["چک و اسناد", "قراردادها"],
  "ملک و اجاره": ["ملک", "قراردادها"],
  "کیفری": ["کیفری"],
  "ارث و انحصار وراثت": ["ارث", "خانواده"],
  "ثبت شرکت و کسب‌وکار": ["شرکت‌ها", "تجارت"],
  "قراردادها": ["قراردادها", "تجارت"],
  "حقوق کار": ["کار"],
};

/** کلیدواژه‌های مستقیم تخصص — برای پیام‌هایی که دسته‌بندی ۱۰گانه را نمی‌گیرند. */
const SPECIALTY_KEYWORDS: [RegExp, string[]][] = [
  [/(خانواده|حضانت|نفقه|اجرت\s*المثل|طلاق|مهریه|مهر)/, ["خانواده", "طلاق"]],
  [/(چک|سفته|برگشتی|وثیقه|اظهارنامه)/, ["چک و اسناد"]],
  [/(ملک|اجاره|تخلیه|خلع\s*ید|تصرف|سند|آپارتمان|زمین|مستأجر|موجر)/, ["ملک"]],
  [/(کیفری|کلاهبرداری|سرقت|ضرب|جرح|شکایت|شکواییه|جرم|جنایت|خیانت در امانت)/, ["کیفری"]],
  [/(ارث|ترکه|انحصار وراثت|وصیت)/, ["ارث"]],
  [/(شرکت|ثبت شرکت|استارتاپ|سهام|سرمایه‌گذاری|لایسنس)/, ["شرکت‌ها", "تجارت"]],
  [/(قرارداد|مبایعه|پیمانکار|شارژ)/, ["قراردادها"]],
  [/(تجارت|بازرگانی|واردات|صادرات|گمرک)/, ["تجارت"]],
  [/(مالیات|مالاتی|دارایی)/, ["مالیاتی"]],
  [/(اخراج|کارگر|کارفرما|سنوات|بیمه|دستمزد|اداره کار|قانون کار|حقوق کار|تأمین اجتماعی)/, ["کار"]],
  [/(برند|علامت تجاری|اختراع|مالکیت فکری|کپی‌رایت)/, ["ثبت برند"]],
  [/(مهاجرت|پناهندگی|ویزا|اقامت)/, ["مهاجرت"]],
];

/** واژه‌های نیتِ «دنبال وکیل هستم» — حتی بدون تشخیص دقیق موضوع، پیشنهاد وکیل را فعال می‌کند. */
const LAWYER_INTENT = /(وکیل|مشاور|مشاوره|پرونده|دادگاه|دادخواست|شکایت|قاضی|دادسرا|حقوقی|حقوقدان|اعداد|لایحه|دفاع)/;

/** تشخیص موضوع از پیام کاربر — ابتدا کلیدواژه مستقیم تخصص، سپس legal-engine. */
export function detectSpecialtiesFromMessage(message: string): { specialties: string[]; topic: string | null } {
  const msg = (message || "").trim();
  if (!msg) return { specialties: [], topic: null };

  for (const [re, specs] of SPECIALTY_KEYWORDS) {
    if (re.test(msg)) return { specialties: specs, topic: null };
  }

  // fallback: دسته‌بندی legal-engine (تطبیق با تخصص‌ها از روی topic شناخته‌شده)
  try {
    const g = analyzeLegalQuery(msg);
    if (g.matched && TOPIC_SPECIALTIES[g.topic]) {
      return { specialties: TOPIC_SPECIALTIES[g.topic], topic: g.topic };
    }
  } catch {
    /* ignore */
  }
  return { specialties: [], topic: null };
}

/** آیا پیام، نیت دریافت مشاوره/وکیل دارد؟ */
export function hasLawyerIntent(message: string): boolean {
  return LAWYER_INTENT.test(message || "");
}

/** تبدیل ردیف وکیل (زیرمجموعه‌ی عمومی) به فرمت MatchedLawyer. */
function toMatched(row: LawyerPublicRow): MatchedLawyer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    title: row.title,
    city: row.city,
    rating: row.rating,
    reviewCount: row.reviewCount,
    caseCount: row.caseCount,
    priceChat: row.priceChat,
    priceVoice: row.priceVoice,
    priceVideo: row.priceVideo,
    experienceYears: row.experienceYears,
    verified: row.verified,
    topRated: row.topRated,
    specialties: row.specialties,
    avatarColor: row.avatarColor,
    photoUrl: row.photoUrl,
  };
}

/**
 * fallback درون‌حافظه‌ای از کاتالوگ رسمی وکلا (همان دیتای seed دیتابیس) —
 * وقتی دسترسی به دیتابیس ممکن نیست (مثلاً dev محلی یا اختلاط لحظه‌ای). دیتا واقعی است.
 */
function seedFallback(specialties: string[], limit: number): MatchedLawyer[] {
  const pool = lawyerData.map((l, i) => ({
    ...l,
    id: i + 1,
    photoUrl: `/lawyers/${l.slug}.jpg`,
  }));
  return interleave(pool, specialties, limit).map((l) =>
    toMatched(l as unknown as LawyerPublicRow),
  );
}

/** مرتب‌سازی: وکلای هم‌تخصص اول (به ترتیب امتیاز)، سپس برترین‌های بقیه برای تکمیل ۱۰ نفر. */
function interleave<T extends { specialties: string[]; rating: number; reviewCount: number }>(
  rows: T[],
  specialties: string[],
  limit: number,
): T[] {
  const sorted = [...rows].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  if (specialties.length === 0) return sorted.slice(0, limit);
  const inSp = sorted.filter((l) => l.specialties.some((s) => specialties.includes(s)));
  const outSp = sorted.filter((l) => !l.specialties.some((s) => specialties.includes(s)));
  return [...inSp, ...outSp].slice(0, limit);
}

/**
 * بهترین وکلای تطبیق‌یافته با تخصص‌های داده‌شده — بر اساس امتیاز و تعداد نظر واقعی.
 * وکلای هم‌تخصص در صدر قرار می‌گیرند و باقی ظرفیت با برترین وکلای تأییدشده تکمیل می‌شود.
 * در نبود دسترسی به دیتابیس، از کاتالوگ رسمی seed استفاده می‌شود.
 */
export async function matchLawyers(specialties: string[], limit = 10): Promise<MatchedLawyer[]> {
  const baseSelect = {
    id: lawyers.id,
    slug: lawyers.slug,
    name: lawyers.name,
    title: lawyers.title,
    city: lawyers.city,
    rating: lawyers.rating,
    reviewCount: lawyers.reviewCount,
    caseCount: lawyers.caseCount,
    priceChat: lawyers.priceChat,
    priceVoice: lawyers.priceVoice,
    priceVideo: lawyers.priceVideo,
    experienceYears: lawyers.experienceYears,
    verified: lawyers.verified,
    topRated: lawyers.topRated,
    specialties: lawyers.specialties,
    avatarColor: lawyers.avatarColor,
    photoUrl: lawyers.photoUrl,
  };

  try {
    // همه‌ی وکلای تأییدشده به ترتیب امتیاز؛ هم‌تخصص‌ها در صدر، تا سقف limit
    const rows = await db
      .select(baseSelect)
      .from(lawyers)
      .where(eq(lawyers.verified, true))
      .orderBy(desc(lawyers.rating), desc(lawyers.reviewCount))
      .limit(limit + 24);
    if (rows.length > 0) return interleave(rows, specialties, limit).map(toMatched);
    // دیتابیس خالی/غیرفعال (مثل dev محلی بدون Postgres) → کاتالوگ رسمی seed
    return seedFallback(specialties, limit);
  } catch {
    // دیتابیس در دسترس نیست → کاتالوگ رسمی seed
    return seedFallback(specialties, limit);
  }
}

/** مسیر کامل: پیام کاربر → لیست ۱۰ وکیل پیشنهادی. */
export async function recommendLawyersForMessage(message: string, limit = 10): Promise<MatchedLawyer[]> {
  const { specialties } = detectSpecialtiesFromMessage(message);
  return matchLawyers(specialties, limit);
}
