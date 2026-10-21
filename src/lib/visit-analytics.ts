// ابزارهای مشترک گزارش بازدید روزانه — مبنای تقویمی: ساعت تهران (Asia/Tehran).
// «یک روز» در همه‌جا یعنی روز تقویمی تهران؛ day همیشه YYYY-MM-DD (برای مقایسهٔ
// لغوی در SQL و گروه‌بندی). هیچ PII ذخیره نمی‌شود — شناسهٔ بازدیدکننده تصادفی است.

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

/** برچسب فارسی روز — «۱۴ آبان» (تقویم شمسی برای نمایش) */
export function faDayLabel(day: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: TEHRAN_TZ,
      month: "long",
      day: "numeric",
    }).format(new Date(`${day}T12:00:00+03:30`));
  } catch {
    return day;
  }
}

/** برچسب فارسی کوتاه — «۱۴/۸» برای زیر ستون‌های نمودار */
export function faDayShort(day: string): string {
  const [, m, d] = day.split("-");
  return `${Number(d)}/${Number(m)}`;
}
