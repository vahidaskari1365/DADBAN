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
import { EXT_B9 } from "./ext-b9";
import { EXT_B10 } from "./ext-b10";
import { EXT_B11 } from "./ext-b11";
import { EXT_B12 } from "./ext-b12";
import { EXT_B13 } from "./ext-b13";
import { EXT_B14 } from "./ext-b14";
import { EXT_B15 } from "./ext-b15";
import { EXT_B16 } from "./ext-b16";
import { EXT_B17 } from "./ext-b17";
import { EXT_B18 } from "./ext-b18";
import { EXT_B19 } from "./ext-b19";
import { EXT_B20 } from "./ext-b20";
import { EXT_B21 } from "./ext-b21";
import { EXT_B22 } from "./ext-b22";
import { EXT_B23 } from "./ext-b23";
import { EXT_B24 } from "./ext-b24";
import { EXT_B25 } from "./ext-b25";

/**
 * واژه‌نامه‌های دادورزان — کلیدها = رشته‌های فارسی منبع (عیناً با نیم‌فاصله).
 * زبان fa نیازی به جدول ندارد (t همان رشتهٔ منبع را برمی‌گرداند).
 * لایه‌ها: دیکشنری اصلی + GEO (استان/شهر/تخصص) + پوشش‌های حوزه‌ای ext-b1..b8
 * که در جریان «بومی‌سازی کامل همه‌چیز» اضافه شدند (کلید تکراری → آخرین لایه می‌برد).
 */
export const DICTS: Record<Locale, Record<string, string>> = {
  fa: {},
  en: { ...en, ...GEO.en, ...EXT_B1.en, ...EXT_B2.en, ...EXT_B3.en, ...EXT_B3B.en, ...EXT_B4.en, ...EXT_B5.en, ...EXT_B6.en, ...EXT_B7.en, ...EXT_B8.en, ...EXT_B9.en, ...EXT_B10.en, ...EXT_B11.en, ...EXT_B12.en, ...EXT_B13.en, ...EXT_B14.en, ...EXT_B15.en, ...EXT_B16.en, ...EXT_B17.en, ...EXT_B18.en, ...EXT_B19.en, ...EXT_B20.en, ...EXT_B21.en, ...EXT_B22.en, ...EXT_B23.en, ...EXT_B24.en, ...EXT_B25.en },
  ar: { ...ar, ...GEO.ar, ...EXT_B1.ar, ...EXT_B2.ar, ...EXT_B3.ar, ...EXT_B3B.ar, ...EXT_B4.ar, ...EXT_B5.ar, ...EXT_B6.ar, ...EXT_B7.ar, ...EXT_B8.ar, ...EXT_B9.ar, ...EXT_B10.ar, ...EXT_B11.ar, ...EXT_B12.ar, ...EXT_B13.ar, ...EXT_B14.ar, ...EXT_B15.ar, ...EXT_B16.ar, ...EXT_B17.ar, ...EXT_B18.ar, ...EXT_B19.ar, ...EXT_B20.ar, ...EXT_B21.ar, ...EXT_B22.ar, ...EXT_B23.ar, ...EXT_B24.ar, ...EXT_B25.ar },
  tr: { ...tr, ...GEO.tr, ...EXT_B1.tr, ...EXT_B2.tr, ...EXT_B3.tr, ...EXT_B3B.tr, ...EXT_B4.tr, ...EXT_B5.tr, ...EXT_B6.tr, ...EXT_B7.tr, ...EXT_B8.tr, ...EXT_B9.tr, ...EXT_B10.tr, ...EXT_B11.tr, ...EXT_B12.tr, ...EXT_B13.tr, ...EXT_B14.tr, ...EXT_B15.tr, ...EXT_B16.tr, ...EXT_B17.tr, ...EXT_B18.tr, ...EXT_B19.tr, ...EXT_B20.tr, ...EXT_B21.tr, ...EXT_B22.tr, ...EXT_B23.tr, ...EXT_B24.tr, ...EXT_B25.tr },
  zh: { ...zh, ...GEO.zh, ...EXT_B1.zh, ...EXT_B2.zh, ...EXT_B3.zh, ...EXT_B3B.zh, ...EXT_B4.zh, ...EXT_B5.zh, ...EXT_B6.zh, ...EXT_B7.zh, ...EXT_B8.zh, ...EXT_B9.zh, ...EXT_B10.zh, ...EXT_B11.zh, ...EXT_B12.zh, ...EXT_B13.zh, ...EXT_B14.zh, ...EXT_B15.zh, ...EXT_B16.zh, ...EXT_B17.zh, ...EXT_B18.zh, ...EXT_B19.zh, ...EXT_B20.zh, ...EXT_B21.zh, ...EXT_B22.zh, ...EXT_B23.zh, ...EXT_B24.zh, ...EXT_B25.zh },
};
