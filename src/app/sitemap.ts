import type { MetadataRoute } from "next";
import { db } from "@/db";
import { lawyers, contracts, articles, qaQuestions } from "@/db/schema";
import { GLOSSARY, LAWS, JUDGMENTS, LEGAL_FORMS } from "@/lib/content";
import { SPECIALTY_LANDINGS, CITY_LANDINGS } from "@/lib/seo-landings";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";
// صفحه‌ی sitemap هر ساعت refresh شود (به‌جای هر request)
export const revalidate = 3600;

const BASE = SITE_URL;
const NOW = new Date();

/**
 * sitemap.xml — نقشه‌ی سایت جامع با اولویت‌بندی بر اساس ارزش تجاری.
 *
 * ساختار:
 *  - صفحات اصلی (priority 1.0) — خانه، خدمات، وکیل‌یابی
 *  - صفحات conversion (priority 0.9) — مشاوره، قرارداد، ثبت پرونده
 *  - محتوای داینامیک (priority 0.7-0.8) — پروفایل وکلا، مقالات، قراردادها
 *  - محتوای ارجاعی (priority 0.5-0.6) — قوانین، آرای قضایی، واژه‌نامه
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let lw: { slug: string; updatedAt: Date }[] = [];
  let ct: { slug: string }[] = [];
  let ar: { slug: string; updatedAt: Date }[] = [];
  let qa: { slug: string }[] = [];
  try {
    [lw, ct, ar, qa] = await Promise.all([
      db.select({ slug: lawyers.slug, updatedAt: lawyers.createdAt }).from(lawyers),
      db.select({ slug: contracts.slug }).from(contracts),
      db.select({ slug: articles.slug, updatedAt: articles.publishedAt }).from(articles),
      db.select({ slug: qaQuestions.slug }).from(qaQuestions),
    ]);
  } catch {
    /* degrade gracefully when DB is not configured */
  }

  // صفحات اصلی — بالاترین اولویت
  const staticRoutes: MetadataRoute.Sitemap = [
    // صفحه‌ی اصلی
    { path: "", priority: 1.0, changeFreq: "daily" as const, lastMod: NOW },
    // صفحات conversion-critical
    { path: "lawyers", priority: 0.9, changeFreq: "daily" as const, lastMod: NOW },
    { path: "consultation", priority: 0.9, changeFreq: "weekly" as const, lastMod: NOW },
    { path: "case/new", priority: 0.8, changeFreq: "weekly" as const, lastMod: NOW },
    { path: "case-board", priority: 0.9, changeFreq: "hourly" as const, lastMod: NOW },
    { path: "contracts", priority: 0.8, changeFreq: "weekly" as const, lastMod: NOW },
    { path: "contracts/builder", priority: 0.7, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "contracts/review", priority: 0.7, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "ai-assistant", priority: 0.8, changeFreq: "weekly" as const, lastMod: NOW },
    // حق‌الوکاله و پرداخت قسطی
    { path: "fee-payment", priority: 0.8, changeFreq: "monthly" as const, lastMod: NOW },
    // تعرفه وکالت ۱۴۰۵ — صفحه پولی سئو
    { path: "fee-guide", priority: 0.9, changeFreq: "weekly" as const, lastMod: NOW },
    // صفحات فرود سئو — هاب‌ها و صفحات فرود تخصص/شهر/ترکیبی
    { path: "lawyers/specialty", priority: 0.8, changeFreq: "weekly" as const, lastMod: NOW },
    { path: "lawyers/city", priority: 0.8, changeFreq: "weekly" as const, lastMod: NOW },
    // خدمات
    { path: "services", priority: 0.9, changeFreq: "weekly" as const, lastMod: NOW },
    { path: "services/category/family", priority: 0.8, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "services/category/property", priority: 0.8, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "services/category/criminal", priority: 0.8, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "services/category/commercial", priority: 0.8, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "services/category/administrative", priority: 0.8, changeFreq: "monthly" as const, lastMod: NOW },
    // پایگاه دانش
    { path: "knowledge", priority: 0.7, changeFreq: "weekly" as const, lastMod: NOW },
    { path: "qa", priority: 0.7, changeFreq: "weekly" as const, lastMod: NOW },
    { path: "laws", priority: 0.6, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "judgments", priority: 0.6, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "glossary", priority: 0.6, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "legal-forms", priority: 0.6, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "calculators", priority: 0.7, changeFreq: "monthly" as const, lastMod: NOW },
    // کسب‌وکار و تعرفه
    { path: "business", priority: 0.7, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "pricing", priority: 0.6, changeFreq: "monthly" as const, lastMod: NOW },
    // پلن‌های عضویت وکلا
    { path: "plans", priority: 0.6, changeFreq: "monthly" as const, lastMod: NOW },
    // درباره و تماس
    { path: "about", priority: 0.5, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "contact", priority: 0.5, changeFreq: "monthly" as const, lastMod: NOW },
    { path: "support", priority: 0.5, changeFreq: "monthly" as const, lastMod: NOW },
    // صفحات قانونی
    { path: "legal/terms", priority: 0.3, changeFreq: "yearly" as const, lastMod: NOW },
    { path: "legal/privacy", priority: 0.3, changeFreq: "yearly" as const, lastMod: NOW },
  ].map((r) => ({
    url: `${BASE}/${r.path}`,
    lastModified: r.lastMod,
    changeFrequency: r.changeFreq,
    priority: r.priority,
  }));

  // محتوای static مرجعی (glossary, laws, judgments, legal-forms)
  const contentRoutes: MetadataRoute.Sitemap = [
    ...GLOSSARY.map((g) => ({ url: `${BASE}/glossary/${g.slug}`, priority: 0.5 })),
    ...LAWS.map((l) => ({ url: `${BASE}/laws/${l.slug}`, priority: 0.6 })),
    ...JUDGMENTS.map((j) => ({ url: `${BASE}/judgments/${j.slug}`, priority: 0.5 })),
    ...LEGAL_FORMS.map((f) => ({ url: `${BASE}/legal-forms/${f.slug}`, priority: 0.5 })),
  ].map((r) => ({
    url: r.url,
    lastModified: NOW,
    changeFrequency: "yearly" as const,
    priority: r.priority,
  }));

  // صفحات فرود سئو — تخصص‌ها (بالاترین اولویت long-tail)
  const landingRoutes: MetadataRoute.Sitemap = [
    ...SPECIALTY_LANDINGS.map((s) => ({
      url: `${BASE}/lawyers/specialty/${s.slug}`,
      lastModified: NOW,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...CITY_LANDINGS.map((c) => ({
      url: `${BASE}/lawyers/city/${c.slug}`,
      lastModified: NOW,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    // صفحات ترکیبی تخصص×شهر — ماشین long-tail (۱۲×۱۵)
    ...SPECIALTY_LANDINGS.flatMap((s) =>
      CITY_LANDINGS.map((c) => ({
        url: `${BASE}/lawyers/specialty/${s.slug}/${c.slug}`,
        lastModified: NOW,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ),
  ];

  return [
    ...staticRoutes,
    ...contentRoutes,
    ...landingRoutes,
    // پروفایل وکلا — priority بالا (صفحات conversion-critical)
    ...lw.map((l) => ({
      url: `${BASE}/lawyers/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // قراردادها
    ...ct.map((c) => ({
      url: `${BASE}/contracts/${c.slug}`,
      lastModified: NOW,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // مقالات — priority متوسط (محتوای طولانی‌مدت)
    ...ar.map((a) => ({
      url: `${BASE}/knowledge/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // پرسش و پاسخ — برای AI Citation مهم
    ...qa.map((q) => ({
      url: `${BASE}/qa/${q.slug}`,
      lastModified: NOW,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
