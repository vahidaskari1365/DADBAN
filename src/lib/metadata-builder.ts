import type { Metadata } from "next";
import { getMetaKeywords } from "./keywords";
import { SITE_NAME } from "./brand";
import { SITE_URL } from "./site";

/**
 * ساخت Metadata برای هر صفحه بر اساس Keyword Research.
 *
 * این تابع title، description، keywords، canonical، OG و Twitter رو
 * به‌صورت خودکار بر اساس مسیر صفحه و کلمات کلیدی target تولید می‌کنه.
 */
export function buildPageMetadata(opts: {
  pathname: string;
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  noIndex?: boolean;
}): Metadata {
  const keywords = opts.keywords || getMetaKeywords(opts.pathname);
  const url = `${SITE_URL}${opts.pathname}`;
  const ogImage = opts.ogImage || "/og-default.jpg";

  return {
    title: opts.title,
    description: opts.description,
    keywords,
    alternates: {
      canonical: opts.pathname,
      languages: {
        "fa-IR": opts.pathname,
        "x-default": opts.pathname,
      },
    },
    openGraph: {
      title: `${opts.title} | ${SITE_NAME}`,
      description: opts.description,
      url,
      siteName: SITE_NAME,
      locale: "fa_IR",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: opts.title,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${opts.title} | ${SITE_NAME}`,
      description: opts.description,
      images: [ogImage === "/og-default.jpg" ? "/twitter-card.jpg" : ogImage],
    },
    robots: opts.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

/**
 * Google Search Console verification meta tag.
 * در صورت تنظیم NEXT_PUBLIC_GSC_VERIFICATION در env، این تگ اضافه می‌شه.
 */
export function getGoogleSearchConsoleVerification(): string | undefined {
  return process.env.NEXT_PUBLIC_GSC_VERIFICATION;
}

/**
 * Google Analytics 4 measurement ID.
 * در صورت تنظیم NEXT_PUBLIC_GA_ID در env، GA4 فعال می‌شه.
 */
export function getGoogleAnalyticsId(): string | undefined {
  return process.env.NEXT_PUBLIC_GA_ID;
}
