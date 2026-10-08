/**
 * تشخیص زبان پیام کاربر با هیوریستیک خط‌کشی — سریع و بدون درخواست اضافه.
 * مشترک بین مسیرهای AI (ai-assistant و consult-companion) و سرویس ترجمهٔ داینامیک.
 */
import type { Locale } from "./core";

export type QueryLang = "fa" | "ar" | "en" | "tr" | "zh";

export function detectQueryLang(q: string): QueryLang {
  if (/[\u4e00-\u9fff]/.test(q)) return "zh";
  if (/[\u0600-\u06FF]/.test(q)) {
    // حروف مخصوص فارسی (پ چ ژ گ ی ک) در عربی وجود ندارند
    return /[\u067E\u0686\u0698\u06AF\u06CC\u06A9]/.test(q) ? "fa" : "ar";
  }
  if (/[A-Za-z]/.test(q)) {
    return /[ğışçöüİĞŞÇÖÜ]/.test(q) ? "tr" : "en";
  }
  return "fa";
}

/** نام زبان برای پرامپت‌ها */
export const LANG_NAME: Record<QueryLang, string> = {
  fa: "فارسی",
  ar: "العربية (عربی فصیح)",
  en: "English",
  tr: "Türkçe (ترکی استانبولی)",
  zh: "简体中文 (چینی ساده‌شده)",
};

/** محافظ نوع: QueryLang زیرمجموعهٔ Locale است */
export const asLocale = (l: QueryLang): Locale => l;
