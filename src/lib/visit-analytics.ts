// ابزارهای مشترک گزارش بازدید روزانه — مبنای تقویمی: ساعت تهران (Asia/Tehran).
// «یک روز» در همه‌جا یعنی روز تقویمی تهران؛ day همیشه YYYY-MM-DD (برای مقایسهٔ
// لغوی در SQL و گروه‌بندی). هیچ PII ذخیره نمی‌شود — شناسهٔ بازدیدکننده تصادفی است.

import { toJalali, JALALI_MONTHS, toPersianDigits } from "@/lib/jalali";

export const TEHRAN_TZ = "Asia/Tehran";

/** روز تقویمی تهران برای یک لحظه — YYYY-MM-DD */
export function tehranDay(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TEHRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** فهرست n روز اخیر (قدیمی‌ترین ← امروز) — برای محور نمودار */
export function lastNDays(n: number, now: number = Date.now()): string[] {
  const out: string[] = [];
  const DAY = 86400000;
  for (let i = n - 1; i >= 0; i--) out.push(tehranDay(new Date(now - i * DAY)));
  return out;
}

/** برچسب شمسی روز — «۱۴ آبان» (همیشه تقویم جلالی، مستقل از ICU مرورگر/سرور) */
export function faDayLabel(day: string): string {
  try {
    const { jm, jd } = toJalali(`${day}T12:00:00+03:30`);
    return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]}`;
  } catch {
    return day;
  }
}

/** برچسب کوتاه شمسی — «۷/۸» (روز/ماه جلالی) برای زیر ستون‌های نمودار */
export function faDayShort(day: string): string {
  try {
    const { jm, jd } = toJalali(`${day}T12:00:00+03:30`);
    return `${jd}/${jm}`;
  } catch {
    return day;
  }
}
