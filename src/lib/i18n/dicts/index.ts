import type { Locale } from "../core";
import { en } from "./en";
import { ar } from "./ar";
import { tr } from "./tr";
import { zh } from "./zh";
import { GEO } from "./geo";
import { EXT_B1 } from "./ext-b1";
import { EXT_B2 } from "./ext-b2";
import { EXT_B3 } from "./ext-b3";
import { EXT_B3B } from "./ext-b3b";
import { EXT_B4 } from "./ext-b4";
import { EXT_B5 } from "./ext-b5";
import { EXT_B6 } from "./ext-b6";
import { EXT_B7 } from "./ext-b7";
import { EXT_B8 } from "./ext-b8";

/**
 * واژه‌نامه‌های دادبان — کلیدها = رشته‌های فارسی منبع (عیناً با نیم‌فاصله).
 * زبان fa نیازی به جدول ندارد (t همان رشتهٔ منبع را برمی‌گرداند).
 * لایه‌ها: دیکشنری اصلی + GEO (استان/شهر/تخصص) + پوشش‌های حوزه‌ای ext-b1..b8
 * که در جریان «بومی‌سازی کامل همه‌چیز» اضافه شدند (کلید تکراری → آخرین لایه می‌برد).
 */
export const DICTS: Record<Locale, Record<string, string>> = {
  fa: {},
  en: { ...en, ...GEO.en, ...EXT_B1.en, ...EXT_B2.en, ...EXT_B3.en, ...EXT_B3B.en, ...EXT_B4.en, ...EXT_B5.en, ...EXT_B6.en, ...EXT_B7.en, ...EXT_B8.en },
  ar: { ...ar, ...GEO.ar, ...EXT_B1.ar, ...EXT_B2.ar, ...EXT_B3.ar, ...EXT_B3B.ar, ...EXT_B4.ar, ...EXT_B5.ar, ...EXT_B6.ar, ...EXT_B7.ar, ...EXT_B8.ar },
  tr: { ...tr, ...GEO.tr, ...EXT_B1.tr, ...EXT_B2.tr, ...EXT_B3.tr, ...EXT_B3B.tr, ...EXT_B4.tr, ...EXT_B5.tr, ...EXT_B6.tr, ...EXT_B7.tr, ...EXT_B8.tr },
  zh: { ...zh, ...GEO.zh, ...EXT_B1.zh, ...EXT_B2.zh, ...EXT_B3.zh, ...EXT_B3B.zh, ...EXT_B4.zh, ...EXT_B5.zh, ...EXT_B6.zh, ...EXT_B7.zh, ...EXT_B8.zh },
};
