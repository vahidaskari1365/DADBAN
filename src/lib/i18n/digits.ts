/**
 * ارقام آگاه از زبان — تبدیل خودکار ارقام فارسی/عربی‌هندی به لاتین
 *
 * زبان‌های LTR سایت (en/tr/zh) ارقام لاتین می‌خواهند؛ فارسی (۰-۹) و عربی (٠-٩)
 * همان ارقام بومی خودشان را نگه می‌دارند. این ابزار در دو نقطهٔ سراسری سیم‌کشی
 * می‌شود تا تبدیل «خودکار» باشد و هیچ صفحه‌ای لازم نباشد دستی اصلاح شود:
 *   ۱) makeT (core.ts) → خروجی همهٔ t()/tf() شامل پارامترهای قالب
 *   ۲) tdyn/tdynLong (dynamic.ts) → محتوای ترجمه‌شدهٔ دیتابیس + فالبک فارسی
 *   ۳) <DigitSweeper> (کلاینت) → هر خروجی کمکیِ باقی‌مانده (formatToman،
 *      formatJalali، faNum و…) در DOM پس از هیدریشن
 */

const FA_MAP = "۰۱۲۳۴۵۶۷۸۹";
const AR_MAP = "٠١٢٣٤٥٦٧٨٩";
const ANY_FA_DIGIT = /[۰-۹٠-٩]/;

export function latinDigits(input: string): string {
  if (!input || !ANY_FA_DIGIT.test(input)) return input;
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const fi = FA_MAP.indexOf(d);
    if (fi >= 0) return String(fi);
    return String(AR_MAP.indexOf(d));
  });
}

/** آیا این زبان ارقام لاتین می‌خواهد؟ (fa/ar خیر — ارقام بومی خودشان) */
export function wantsLatinDigits(locale: string): boolean {
  return locale === "en" || locale === "tr" || locale === "zh";
}
