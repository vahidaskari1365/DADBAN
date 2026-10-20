/**
 * مرکز قوانین دادورزان — منبع واحد دیتای قوانین.
 *
 * ۴۱ قانون در ۷ دسته با محتوای تحریریه کامل (AEO/GEO/AIO/SXO):
 *  - صفحه فهرست: /laws (دسته‌بندی + FAQ + schema)
 *  - صفحه هر قانون: /laws/[slug] (قالب مقاله citation-ready)
 *
 * ترتیب دیتا: laws-catalog-a (خانواده/کیفری/دادرسی)، laws-catalog-b
 * (مالی/کار/املاک/اداری) و laws-catalog-c (تکمیل مرکز قوانین).
 * اسلاگ‌های ۸ قانون قدیمی حفظ شده‌اند تا اعتبار ایندکس گوگل از دست نرود.
 */

import type { Law, LawCategory } from "@/data/laws-types";
import { LAW_CATEGORIES } from "@/data/laws-types";
import { LAWS_A } from "@/data/laws-catalog-a";
import { LAWS_B } from "@/data/laws-catalog-b";
import { LAWS_C } from "@/data/laws-catalog-c";

export type { Law, LawCategory, LawFaq, LawKeyArticle, LawRoute } from "@/data/laws-types";
export { LAW_CATEGORIES } from "@/data/laws-types";

export const LAWS: Law[] = [...LAWS_A, ...LAWS_B, ...LAWS_C];

export const LAWS_UPDATED = "مهر ۱۴۰۵";

/** دسته‌بندی یک قانون با slug */
export function getLawCategory(slug: string): LawCategory {
  return (
    LAW_CATEGORIES.find((c) => c.slug === slug) ?? {
      slug: "general",
      label: "عمومی",
      icon: "landmark",
      desc: "",
    }
  );
}

/** قوانین مرتبط برای لینک‌سازی داخلی — اول هم‌دسته، بعد سایر */
export function getRelatedLaws(current: Law, count = 4): Law[] {
  const same = LAWS.filter((l) => l.category === current.category && l.slug !== current.slug);
  const others = LAWS.filter((l) => l.category !== current.category);
  return [...same, ...others].slice(0, count);
}

/** یافتن قانون با slug (برای content-store و صفحات) */
export function findLaw(slug: string): Law | undefined {
  return LAWS.find((l) => l.slug === slug);
}
