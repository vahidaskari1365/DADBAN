/**
 * ============================================================================
 * dadban — Persian (Jalali/Shamsi) Date Utilities
 * ----------------------------------------------------------------------------
 * تبدیل تاریخ میلادی به شمسی و قالب‌بندی فارسی.
 *
 * استفاده:
 *  - toJalali(date) → { jy, jm, jd }
 *  - formatJalali(date) → "۱۴۰۳/۰۷/۱۵"
 *  - formatJalaliLong(date) → "۱۵ مهر ۱۴۰۳"
 *  - formatJalaliDateTime(date) → "۱۵ مهر ۱۴۰۳، ۱۴:۳۰"
 *  - formatJalaliTime(date) → "۱۴:۳۰"
 *  - relativeTimeJalali(date) → "۲ ساعت پیش"
 * ============================================================================
 */

import { toJalaali as toJalaaliFn, toGregorian } from "jalaali-js";

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

/** نام ماه‌های شمسی. */
export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

/** نام روزهای هفته به‌فارسی. */
export const JALALI_WEEKDAYS = [
  "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه",
];

/** تبدیل عدد به فارسی (۱۲۳ → ۱۲۳). */
export function toPersianDigits(n: number | string): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).replace(/[0-9]/g, (d) => persianDigits[parseInt(d, 10)]);
}

/** تبدیل Date میلادی به شمسی. */
export function toJalali(date: Date | string | number): JalaliDate {
  const d = new Date(date);
  const { jy, jm, jd } = toJalaaliFn(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { jy, jm, jd };
}

/**
 * قالب‌بندی کوتاه: "۱۴۰۳/۰۷/۱۵"
 */
export function formatJalali(date: Date | string | number): string {
  const { jy, jm, jd } = toJalali(date);
  const month = String(jm).padStart(2, "0");
  const day = String(jd).padStart(2, "0");
  return toPersianDigits(`${jy}/${month}/${day}`);
}

/**
 * قالب‌بندی بلند: "۱۵ مهر ۱۴۰۳"
 */
export function formatJalaliLong(date: Date | string | number): string {
  const { jy, jm, jd } = toJalali(date);
  const monthName = JALALI_MONTHS[jm - 1];
  return `${toPersianDigits(jd)} ${monthName} ${toPersianDigits(jy)}`;
}

/**
 * قالب‌بندی کامل با روز هفته: "جمعه ۱۵ مهر ۱۴۰۳"
 */
export function formatJalaliFull(date: Date | string | number): string {
  const d = new Date(date);
  const weekday = JALALI_WEEKDAYS[d.getDay()];
  return `${weekday} ${formatJalaliLong(date)}`;
}

/**
 * قالب‌بندی ساعت: "۱۴:۳۰"
 */
export function formatJalaliTime(date: Date | string | number): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return toPersianDigits(`${hours}:${minutes}`);
}

/**
 * قالب‌بندی تاریخ و ساعت: "۱۵ مهر ۱۴۰۳، ۱۴:۳۰"
 */
export function formatJalaliDateTime(date: Date | string | number): string {
  return `${formatJalaliLong(date)}، ${formatJalaliTime(date)}`;
}

/**
 * زمان نسبی به فارسی: "۲ ساعت پیش"، "۳ روز پیش"، "همین الان"
 */
export function relativeTimeJalali(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return "همین الان";
  if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
  if (diffHour < 24) return `${toPersianDigits(diffHour)} ساعت پیش`;
  if (diffDay === 1) return "دیروز";
  if (diffDay < 30) return `${toPersianDigits(diffDay)} روز پیش`;
  if (diffMonth < 12) return `${toPersianDigits(diffMonth)} ماه پیش`;
  return `${toPersianDigits(diffYear)} سال پیش`;
}

/**
 * تبدیل تاریخ شمسی به میلادی (برای ورودی کاربر).
 * مثلاً: "1403/07/15" → Date
 */
export function fromJalali(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd);
}

/**
 * سال شمسی فعلی.
 */
export function currentJalaliYear(): number {
  return toJalali(new Date()).jy;
}

/**
 * دریافت نام ماه شمسی فعلی.
 */
export function currentJalaliMonthName(): string {
  const { jm } = toJalali(new Date());
  return JALALI_MONTHS[jm - 1];
}
