import type { Locale } from "../core";
import { en } from "./en";
import { ar } from "./ar";
import { tr } from "./tr";
import { zh } from "./zh";

/**
 * واژه‌نامه‌های دادبان — کلیدها = رشته‌های فارسی منبع (عیناً با نیم‌فاصله).
 * زبان fa نیازی به جدول ندارد (t همان رشتهٔ منبع را برمی‌گرداند).
 * افزودن پوشش جدید: فقط رشتهٔ فارسی را در هر ۴ فایل اضافه کنید.
 */
export const DICTS: Record<Locale, Record<string, string>> = {
  fa: {},
  en,
  ar,
  tr,
  zh,
};
