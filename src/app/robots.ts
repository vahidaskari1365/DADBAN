import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * revalidate ساعتی — درس واقعی تولید: نسخهٔ بدون revalidate در ISR-cache
 * سرور قفل می‌شد و با deploy تازه هم به‌روز نمی‌شد. با revalidate صریح،
 * هر ساعت از نو تولید می‌شود (مثل llms.txt).
 */
export const revalidate = 3600;

/**
 * robots.txt — مدیریت crawl برای موتورهای جستجو و AI.
 *
 * استراتژی:
 * - موتورهای جستجو (Googlebot, Bingbot, DuckDuckBot, YandexBot): allow
 * - AI search engines (OAI-SearchBot, Claude-SearchBot, PerplexityBot): allow
 *   — چون citation در نتایج AI ارزش تجاری دارد
 * - AI training crawlers (GPTBot, ClaudeBot, Google-Extended, Bytespider,
 *   Applebot-Extended, CCBot): allow — چون visibility در AI اهمیت دارد
 *   (اگه کاربر بخواهد، می‌توان در production block کرد)
 * - صفحات حساس (dashboard, admin, api): disallow
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // موتورهای جستجوی اصلی — دسترسی کامل
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin", "/developer", "/track-case"],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin", "/developer", "/track-case"],
      },
      {
        userAgent: "DuckDuckBot",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      // موتورهای پاسخ‌گوی AI — citation-friendly
      {
        userAgent: "OAI-SearchBot", // ChatGPT Search
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      {
        userAgent: ["ClaudeBot", "Claude-SearchBot", "Claude-User"], // Claude: crawl + search citations + user browsing
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      {
        userAgent: "PerplexityBot", // Perplexity search index
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      {
        userAgent: "CCBot", // Common Crawl — خزنده‌ی آموزشی غیرجستجو
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      {
        userAgent: "ChatGPT-User", // Real-time browsing
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      // AI training crawlers — در حال حاضر allow (برای visibility)
      // اگه کاربر بخواهد training رو block کند، این‌ها رو Disallow: / کنید
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      {
        userAgent: "Applebot", // Siri/Spotlight/Apple Intelligence citations
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      {
        userAgent: "Applebot-Extended",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/admin"],
      },
      // قانون کلی برای همه‌ی بقیه
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin",
          "/developer",
          "/track-case",
          "/case/new",
          "/booking",
          "/login",
          "/register",
          "/*?source=*",
          "/*?utm_*",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
