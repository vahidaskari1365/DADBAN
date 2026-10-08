import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, makeT, type Locale, type TFn } from "./core";

/**
 * خواندن زبان فعلی از کوکی — فقط سمت سرور (Server Components / Route Handlers).
 * در صورت هر خطا، فارسی (پیش‌فرض) برمی‌گردد تا رندر هرگز نشکند.
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const v = store.get(LOCALE_COOKIE)?.value;
    return isLocale(v) ? v : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** نسخهٔ سرور t() — در Server Components: `const t = await getT()` */
export async function getT(): Promise<TFn> {
  return makeT(await getServerLocale());
}
