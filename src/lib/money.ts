/* ============================================================================
 * دادپیو — ابزارهای مشترک پنل‌ها: فرمت پول، ارقام فارسی، تاریخ شمسی، برچسب وضعیت
 * ========================================================================== */

import * as jalaali from "jalaali-js";

/* ------------------------------ ارقام ------------------------------ */
const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export function toEn(input: string): string {
  return String(input)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/* ------------------------------ پول ------------------------------ */
/** جداکنندهٔ هزارگان + ارقام فارسی: 1200000000 → ۱٬۲۰۰٬۰۰۰٬۰۰۰ */
export function groupFa(n: string | number): string {
  const s = String(n).replace(/\D/g, "");
  if (!s) return "۰";
  return toFa(s.replace(/\B(?=(\d{3})+(?!\d))/g, "٬"));
}

/** مبلغ به تومان: ورودی ریال یا تومان را تشخیص و رشتهٔ خوانا می‌سازد.
 *  مقادیر دیتابیس به تومان ذخیره شده‌اند (طبق دادهٔ نمونه). */
export function formatToman(value: string | number | null | undefined, withUnit = true): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(toEn(String(value)).replace(/\D/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "—";
  const g = groupFa(n);
  return withUnit ? `${g} تومان` : g;
}

/** خلاصهٔ مبلغ: 1200000000 → ۱.۲ میلیارد · 45500000 → ۴۵.۵ میلیون */
export function shortToman(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(toEn(String(value)).replace(/\D/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000_000) return `${toFa((n / 1_000_000_000).toFixed(1).replace(/\.0$/, ""))} میلیارد`;
  if (n >= 1_000_000) return `${toFa((n / 1_000_000).toFixed(1).replace(/\.0$/, ""))} میلیون`;
  if (n >= 1_000) return `${groupFa(n)} تومان`;
  return `${groupFa(n)} تومان`;
}

/* ------------------------------ تاریخ شمسی ------------------------------ */
export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];
export const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export function toJalali(date: Date | string | number): { jy: number; jm: number; jd: number } {
  const d = date instanceof Date ? date : new Date(date);
  return jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** ۱۴۰۴/۰۷/۱۲ */
export function formatJalali(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const { jy, jm, jd } = toJalali(date);
  return toFa(`${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`);
}

/** ۱۲ مهر ۱۴۰۴ */
export function formatJalaliLong(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const { jy, jm, jd } = toJalali(date);
  return `${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
}

/** ساعت و دقیقه: ۱۴:۳۰ */
export function formatTime(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return toFa(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
}

/** «۳ روز پیش» / «۲ ساعت پیش» / «همین حالا» */
export function timeAgo(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "همین حالا";
  if (m < 60) return `${toFa(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${toFa(h)} ساعت پیش`;
  const days = Math.floor(h / 24);
  if (days < 31) return `${toFa(days)} روز پیش`;
  return formatJalali(d);
}

/* ------------------------------ برچسب وضعیت‌ها ------------------------------ */
export type Tone = "green" | "gold" | "gray" | "red" | "cyan";

export function labelStatus(kind: string, value: string | null | undefined): { label: string; tone: Tone } {
  const v = String(value ?? "");
  const map: Record<string, Record<string, { label: string; tone: Tone }>> = {
    proposal: {
      pending: { label: "در انتظار موکل", tone: "gold" },
      negotiating: { label: "در مذاکره", tone: "cyan" },
      accepted: { label: "پذیرفته‌شده", tone: "green" },
      rejected: { label: "رد‌شده", tone: "red" },
      withdrawn: { label: "منصرف‌شده", tone: "gray" },
    },
    case: {
      new: { label: "جدید", tone: "cyan" },
      reviewing: { label: "در بررسی", tone: "gold" },
      matched: { label: "وکیل تعیین‌شده", tone: "green" },
      active: { label: "فعال", tone: "green" },
      closed: { label: "بسته‌شده", tone: "gray" },
    },
    installment: {
      pending: { label: "در انتظار پرداخت", tone: "gold" },
      paid: { label: "پرداخت‌شده", tone: "green" },
      late: { label: "معوق", tone: "red" },
      cancelled: { label: "لغوشده", tone: "gray" },
    },
    credit: {
      draft: { label: "پیش‌نویس", tone: "gray" },
      submitted: { label: "ارسال‌شده", tone: "cyan" },
      scoring: { label: "در حال اعتبارسنجی", tone: "gold" },
      approved: { label: "تأیید اعتبار", tone: "green" },
      rejected: { label: "رد‌شده", tone: "red" },
      funded: { label: "واریز شد", tone: "green" },
    },
    payout: {
      requested: { label: "درخواست‌شده", tone: "gold" },
      processing: { label: "در حال پردازش", tone: "cyan" },
      paid: { label: "واریز شد", tone: "green" },
      rejected: { label: "رد‌شده", tone: "red" },
    },
    appointment: {
      hearing: { label: "جلسه رسیدگی", tone: "red" },
      consultation: { label: "مشاوره", tone: "cyan" },
      deadline: { label: "مهلت قانونی", tone: "gold" },
      task: { label: "اقدام", tone: "gray" },
    },
    contract: {
      none: { label: "بدون قرارداد", tone: "gray" },
      draft: { label: "پیش‌نویس", tone: "gold" },
      sent: { label: "ارسال برای امضا", tone: "cyan" },
      signed: { label: "امضاشده", tone: "green" },
    },
  };
  return map[kind]?.[v] ?? { label: v || "—", tone: "gray" as Tone };
}
