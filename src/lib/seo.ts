/**
 * ============================================================================
 * dadban — مرکز سئوی مرکزی (Central SEO Hub)
 * ----------------------------------------------------------------------------
 * همه‌ی schema markup، structured data، و توابع کمکی سئو در این فایل متمرکز شده‌اند.
 *
 * پوشش:
 *  - Technical SEO (canonical, robots, OpenGraph, Twitter)
 *  - Semantic/Entity SEO (schema.org JSON-LD)
 *  - AI Search Optimization (GEO/AEO — llms.txt، citation-ready content)
 * ============================================================================
 */

import { SITE_NAME, SITE_NAME_EN, SITE_TITLE, SITE_DESCRIPTION } from "./brand";
import { SITE_URL } from "./site";

export const SEO_BASE = SITE_URL;

/** لنگرهای برند — کلمات کلیدی اصلی که سایت برای آن‌ها positioning می‌شود. */
export const BRAND_KEYWORDS = [
  "وکیل", "مشاوره حقوقی آنلاین", "وکیل خانواده", "وکیل ملکی", "وکیل کیفری",
  "تنظیم قرارداد", "چک برگشتی", "طلاق توافقی", "ثبت شرکت", "مشاوره وکیل",
  "وکیل پایه یک", "پلتفرم حقوقی", "دستیار حقوقی هوش مصنوعی",
];

/** موجودیت‌های حقوقی — برای Semantic SEO و Knowledge Graph. */
export const LEGAL_ENTITIES = {
  practiceAreas: [
    "حقوق خانواده", "حقوق ملکی", "حقوق کیفری", "حقوق تجاری",
    "حقوق اداری", "حقوق کار", "حقوق ثبتی", "حقوق قراردادها",
  ],
  serviceTypes: [
    "مشاوره حقوقی آنلاین", "وکیل‌یابی", "تنظیم قرارداد", "ثبت پرونده",
    "خدمات ثبتی", "بررسی قرارداد", "تنظیم دادخواست", "تنظیم شکواییه",
  ],
  jurisdictions: ["ایران", "تهران", "دادگستری", "کانون وکلای دادگستری"],
};

/* ============================================================================
 * ۱. Schema.org JSON-LD — Structured Data
 * ========================================================================== */

/** Organization / LegalService — schema اصلی سایت. */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "LegalService",
  "@id": `${SEO_BASE}/#organization`,
  name: SITE_NAME,
  alternateName: `${SITE_NAME_EN} Legal Platform`,
  description: SITE_DESCRIPTION,
  url: SEO_BASE,
  logo: {
    "@type": "ImageObject",
    url: `${SEO_BASE}/icon-512.png`,
    width: 512,
    height: 512,
  },
  image: `${SEO_BASE}/icon-512.png`,
  telephone: "+98-21-66921500",
  areaServed: {
    "@type": "Country",
    name: "ایران",
  },
  knowsLanguage: ["fa", "en"],
  knowsAbout: LEGAL_ENTITIES.practiceAreas,
  serviceType: LEGAL_ENTITIES.serviceTypes,
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    addressCountry: "IR",
    addressRegion: "تهران",
  },
  sameAs: [
    "https://github.com/vahidaskari1365/DADBAN",
    SEO_BASE,
  ],
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+98-21-66921500",
      contactType: "customer service",
      areaServed: "IR",
      availableLanguage: ["Persian", "English"],
    },
  ],
};

/** WebSite schema — برای Sitelinks Search Box و navigating در SERP. */
export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SEO_BASE}/#website`,
  url: SEO_BASE,
  name: SITE_NAME,
  alternateName: SITE_NAME_EN,
  description: SITE_DESCRIPTION,
  inLanguage: "fa-IR",
  publisher: { "@id": `${SEO_BASE}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SEO_BASE}/lawyers?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

/** BreadcrumbList — برای breadcrumbs در SERP. */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SEO_BASE}${item.url}`,
    })),
  };
}

/** Lawyer schema — برای صفحه‌ی پروفایل وکیل. */
export function lawyerSchema(lawyer: {
  name: string;
  slug: string;
  title: string;
  licenseNo: string;
  city: string;
  province: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  experienceYears: number;
  bio?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Attorney",
    "@id": `${SEO_BASE}/lawyers/${lawyer.slug}#lawyer`,
    name: lawyer.name,
    jobTitle: lawyer.title,
    description: lawyer.bio || lawyer.title,
    url: `${SEO_BASE}/lawyers/${lawyer.slug}`,
    image: `${SEO_BASE}/icon-512.png`,
    telephone: "+98-21-66921500",
    address: {
      "@type": "PostalAddress",
      addressLocality: lawyer.city,
      addressRegion: lawyer.province,
      addressCountry: "IR",
    },
    knowsAbout: lawyer.specialties,
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: `پروانه وکالت شماره ${lawyer.licenseNo}`,
      recognizedBy: "کانون وکلای دادگستری",
    },
    aggregateRating: lawyer.reviewCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: lawyer.rating,
      reviewCount: lawyer.reviewCount,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    worksFor: { "@id": `${SEO_BASE}/#organization` },
    areaServed: { "@type": "Country", name: "ایران" },
  };
}

/** Service schema — برای صفحه‌ی خدمات. */
export function serviceSchema(service: {
  name: string;
  slug: string;
  description: string;
  category: string;
  basePrice?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SEO_BASE}/services/${service.slug}#service`,
    name: service.name,
    description: service.description,
    url: `${SEO_BASE}/services/${service.slug}`,
    serviceType: service.category,
    areaServed: { "@type": "Country", name: "ایران" },
    provider: { "@id": `${SEO_BASE}/#organization` },
    offers: service.basePrice ? {
      "@type": "Offer",
      price: service.basePrice,
      priceCurrency: "IRR",
      availability: "https://schema.org/InStock",
    } : undefined,
  };
}

/** Article schema — برای مقالات پایگاه دانش. */
export function articleSchema(article: {
  title: string;
  slug: string;
  description: string;
  category: string;
  author: string;
  authorRole: string;
  publishedAt: string;
  readTime: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SEO_BASE}/knowledge/${article.slug}#article`,
    headline: article.title,
    description: article.description,
    url: `${SEO_BASE}/knowledge/${article.slug}`,
    image: `${SEO_BASE}/icon-512.png`,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    inLanguage: "fa-IR",
    articleSection: article.category,
    wordCount: article.readTime * 200,
    author: {
      "@type": "Person",
      name: article.author,
      jobTitle: article.authorRole,
    },
    publisher: { "@id": `${SEO_BASE}/#organization` },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SEO_BASE}/knowledge/${article.slug}`,
    },
  };
}

/** QAPage schema — برای پرسش و پاسخ حقوقی (به‌جای FAQPage که deprecate شده). */
export function qaPageSchema(qa: {
  question: string;
  answer: string;
  slug: string;
  lawyerName: string;
  lawyerTitle: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "@id": `${SEO_BASE}/qa#${qa.slug}`,
    mainEntity: {
      "@type": "Question",
      name: qa.question,
      text: qa.question,
      answerCount: 1,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
        author: {
          "@type": "Person",
          name: qa.lawyerName,
          jobTitle: qa.lawyerTitle,
        },
        upvoteCount: 1,
      },
    },
  };
}

/* ============================================================================
 * ۲. AI Search Optimization (GEO / AEO)
 * ----------------------------------------------------------------------------
 * موتورهای پاسخ‌گوی مبتنی بر هوش مصنوعی (ChatGPT, Gemini, Perplexity, Claude)
 * به جای کلمات کلیدی، بر اساس موجودیت‌ها و intent پاسخ می‌دهند. این بخش
 * محتوا را برای citation-ready بودن بهینه می‌کند.
 * ========================================================================== */

/** llms.txt — معرفی سایت به LLM‌ها (استاندارد emerging برای AI discovery). */
export const LLMS_TXT = `# ${SITE_NAME} (${SITE_NAME_EN})

> ${SITE_DESCRIPTION}

## درباره
${SITE_NAME} پلتفرم هوشمند خدمات حقوقی ایران است که وکیل‌یابی، مشاوره آنلاین،
ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی را در یک‌جا ارائه می‌دهد.

## خدمات اصلی
- وکیل‌یابی: ${SEO_BASE}/lawyers
- مشاوره آنلاین حقوقی (متنی، صوتی، تصویری): ${SEO_BASE}/consultation
- ثبت پرونده حقوقی: ${SEO_BASE}/case/new
- تنظیم و بررسی قرارداد: ${SEO_BASE}/contracts
- مرکز هوش مصنوعی حقوقی (تحلیل سند با عکس، جستجوی وب، استودیوی صدا): ${SEO_BASE}/ai
- دستیار حقوقی هوش مصنوعی: ${SEO_BASE}/ai-assistant
- جعبه‌ابزار منبع‌باز هوش مصنوعی (کاتالوگ API رایگان، ابزارهای وب عامل، مهارت‌ها، آکادمی): ${SEO_BASE}/ai/resources
- خدمات ثبتی و اداری: ${SEO_BASE}/services

## حوزه‌های تخصصی
${LEGAL_ENTITIES.practiceAreas.map((p) => `- ${p}`).join("\n")}

## پایگاه دانش
- مقالات حقوقی: ${SEO_BASE}/knowledge
- پرسش و پاسخ حقوقی: ${SEO_BASE}/qa
- مرکز قوانین: ${SEO_BASE}/laws
- آرای قضایی: ${SEO_BASE}/judgments
- واژه‌نامه حقوقی: ${SEO_BASE}/glossary

## تماس
- وب‌سایت: ${SEO_BASE}
- تلفن: 021-66921500
- منطقه خدمت: ایران

## لینک‌های مهم
- sitemap: ${SEO_BASE}/sitemap.xml
- robots: ${SEO_BASE}/robots.txt
- manifest: ${SEO_BASE}/manifest.webmanifest
`;

/**
 * AI-friendly summary — برای Citation در AI Search Engines.
 * این خلاصه در hidden div قرار می‌گیرد تا LLM‌ها آن را بخوانند.
 */
export function aiSummarySchema(data: {
  topic: string;
  summary: string;
  keyPoints?: string[];
  citeUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: data.topic,
    description: data.summary,
    url: data.citeUrl,
    hasDefinedTerm: data.keyPoints?.map((p) => ({
      "@type": "DefinedTerm",
      name: p,
    })),
  };
}

/* ============================================================================
 * ۳. Helper: ساخت JSON-LD script tag
 * ========================================================================== */

/** تبدیل schema به <script type="application/ld+json"> آماده‌ی درج در صفحه. */
export function jsonLd(schema: object | object[]) {
  return JSON.stringify(Array.isArray(schema) ? schema : [schema]);
}
