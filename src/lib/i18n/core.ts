/**
 * i18n دادبان — زیرساخت چندزبانه (fa | en | ar | tr | zh)
 *
 * تصمیم معماری: به‌جای مسیرمحور (/en/...) که URLs و SEO را بازسازی می‌کند،
 * زبان در کوکی `dadban_locale` نگه داشته می‌شود؛ layout ریشه آن را می‌خواند و
 * <html lang dir> را سرورساید ست می‌کند (بدون فلش). کلیدهای واژه‌نامه همان
 * رشته‌های فارسی منبع‌اند — یعنی `t()` روی هر رشتهٔ فارسی ایمن است: اگر ترجمه
 * نبود، همان فارسی برمی‌گردد (fallback) و سایت در هیچ زبانی نمی‌شکند.
 * پوشش ترجمه به‌تدریج کامل می‌شود؛ صفحات جدید فقط با پیچیدن t() پوشش می‌گیرند.
 */

export type Locale = "fa" | "en" | "ar" | "tr" | "zh";
export type TFn = (fa: string) => string;

export const DEFAULT_LOCALE: Locale = "fa";
export const LOCALE_COOKIE = "dadban_locale";

export const LOCALES: Locale[] = ["fa", "en", "ar", "tr", "zh"];

/** متادیتای هر زبان — سوییچر و dir */
export const LOCALE_META: Record<Locale, { name: string; english: string; dir: "rtl" | "ltr" }> = {
  fa: { name: "فارسی", english: "Persian", dir: "rtl" },
  en: { name: "English", english: "English", dir: "ltr" },
  ar: { name: "العربية", english: "Arabic", dir: "rtl" },
  tr: { name: "Türkçe", english: "Turkish", dir: "ltr" },
  zh: { name: "中文", english: "Chinese", dir: "ltr" },
};

export const isLocale = (v: string | undefined | null): v is Locale =>
  !!v && (LOCALES as string[]).includes(v);

export const dirFor = (l: Locale): "rtl" | "ltr" => LOCALE_META[l].dir;

/**
 * سازندهٔ تابع ترجمه — روی کلاینت و سرور یکسان کار می‌کند (تابع پایدار به‌ازای هر زبان).
 * زبان‌های LTR (en/tr/zh) ارقام فارسی/عربی باقی‌مانده در هر خروجی (کلید جاافتاده،
 * مقدار دیکشنری یا پارامتر قالب مثل tf("{n} تومان", { n: shortToman(x) })) را
 * خودکار به لاتین تبدیل می‌کنند — لایهٔ ۱ تبدیل خودکار ارقام (digits.ts).
 */
const T_CACHE = new Map<Locale, TFn>();
export const makeT =
  (locale: Locale): TFn => {
    let fn = T_CACHE.get(locale);
    if (!fn) {
      const latin = wantsLatinDigits(locale);
      fn = (fa: string) => {
        if (locale === "fa") return fa;
        const out = DICTS[locale]?.[fa] ?? fa;
        return latin ? latinDigits(out) : out;
      };
      T_CACHE.set(locale, fn);
    }
    return fn;
  };

export type TTemplateFn = (
  template: string,
  params: Record<string, string>,
) => string;

/**
 * ترجمهٔ قالب‌های مرکب (مثل «وکیل {sp} در {city}») —
 * اول خود قالب ترجمه می‌شود (کلیدش در واژه‌نامه است) و بعد هر پارامتر با
 * ترجمهٔ مقدارش جایگزین می‌شود. در زبان‌های LTR ترتیب جایگزینی از خودِ
 * ترجمهٔ قالب می‌آید و به جهت متن دست نمی‌زنیم.
 */
export const templateT =
  (t: TFn): TTemplateFn =>
  (template, params) => {
    let out = t(template);
    for (const [k, v] of Object.entries(params)) {
      out = out.split(`{${k}}`).join(t(v));
    }
    return out;
  };

import { DICTS } from "./dicts";
import { latinDigits, wantsLatinDigits } from "./digits";
