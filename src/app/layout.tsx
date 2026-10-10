import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion-config";
import { noFlashScript } from "@/components/no-flash";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ScrollProgress } from "@/components/magicui/scroll-progress";
import { Tracker } from "@/components/tracker";
import { BottomNav } from "@/components/pwa/bottom-nav";
import { ConsultCompanion } from "@/components/consult-companion";
import { LiveActivity } from "@/components/amazon/live-activity";
import { SW_REGISTER_SCRIPT } from "@/components/pwa/sw-register-script";
import { LocaleProvider } from "@/lib/i18n/provider";
import { dirFor } from "@/lib/i18n";
import { getServerLocale, getT } from "@/lib/i18n/server";
import { SITE_NAME, SITE_NAME_EN, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";
import { organizationSchema, websiteSchema, jsonLd } from "@/lib/seo";
import { getGoogleSearchConsoleVerification, getGoogleAnalyticsId } from "@/lib/metadata-builder";

/* فونت وزیرمتن به‌صورت local میزبانی می‌شود تا build به شبکه خارجی وابسته نباشد */
const vazirmatn = localFont({
  src: [
    { path: "../assets/fonts/vazirmatn-arabic-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "../assets/fonts/vazirmatn-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  // metadataBase باید همیشه با NEXT_PUBLIC_SITE_URL هماهنگ باشد تا
  // canonical/OG با sitemap.xml و llms.txt و JSON-LD یک دامنه را اعلام کنند.
  // با انتقال به دامنه اصلی فقط همین env تغییر می‌کند — بدون تغییر کد.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "وکیل", "مشاوره حقوقی آنلاین", "وکیل خانواده", "وکیل ملکی", "وکیل کیفری",
    "تنظیم قرارداد", "چک برگشتی", "طلاق", "ثبت شرکت", "مشاوره وکیل", "دادبان",
  ],
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon-32.png"],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
    startupImage: ["/icon-512.png"],
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "fa-IR": "/",
      "en-US": "/en",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    alternateLocale: ["en_US"],
    siteName: SITE_NAME,
    title: `${SITE_NAME} | پلتفرم هوشمند خدمات حقوقی`,
    description:
      `جستجوی وکیل متخصص، مشاوره آنلاین، ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی — همه در ${SITE_NAME}.`,
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — پلتفرم هوشمند خدمات حقوقی`,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | پلتفرم هوشمند خدمات حقوقی`,
    description:
      `جستجوی وکیل متخصص، مشاوره آنلاین، ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی — همه در ${SITE_NAME}.`,
    images: [
      {
        url: "/twitter-card.jpg",
        width: 1024,
        height: 576,
        alt: SITE_NAME,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION,
    other: {
      // Bing Webmaster Tools verification (در صورت تنظیم)
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION || "",
    },
  },
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#141416" },
  ],
};

const orgJsonLd = organizationSchema;
const siteJsonLd = websiteSchema;

export default async function RootLayout({ children }: { children: ReactNode }) {
  /* زبان از کوکی خوانده می‌شود تا بدون تغییر URL (حفظ SEO) کل سایت همان زبان شود */
  const locale = await getServerLocale();
  const t = await getT();
  return (
    <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning data-scroll-behavior="smooth" className={vazirmatn.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        {/* ثبت Service Worker برای PWA — inline تا مستقل از React hydration باشد */}
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER_SCRIPT }} />
        {/* Schema.org JSON-LD: Organization + WebSite برای Semantic SEO و AI Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd([orgJsonLd, siteJsonLd]) }}
        />
        {/* لینک به llms.txt برای AI Search Engines (ChatGPT, Gemini, Perplexity) */}
        <link rel="llms-txt" href="/llms.txt" />
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} — مقالات حقوقی`} href="/knowledge/feed" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="msapplication-TileColor" content="#15365d" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#15365d" />
        {/* AI-friendly meta tags برای citation */}
        <meta name="ai-content-summary" content={`${SITE_NAME} پلتفرم خدمات حقوقی ایران: وکیل‌یابی، مشاوره آنلاین، ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی.`} />
        <meta name="geo.region" content="IR" />
        <meta name="geo.placename" content="تهران، ایران" />
        <meta name="language" content="Persian" />
        <meta name="revisit-after" content="1 day" />
        {/* Google Search Console verification — در صورت تنظیم env */}
        {getGoogleSearchConsoleVerification() && (
          <meta name="google-site-verification" content={getGoogleSearchConsoleVerification()!} />
        )}
        {/* Google Analytics 4 — در صورت تنظیم env */}
        {getGoogleAnalyticsId() && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${getGoogleAnalyticsId()!}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${getGoogleAnalyticsId()!}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="bg-background text-foreground antialiased">
        {/* ── پس‌زمینه سینمایی سراسری: عکس هیرو با شفافیت کم پشت همه صفحات ──
            ثابت (fixed) است و با اسکرول جابه‌جا نمی‌شود؛ واش بالای آن کنتراست را
            کم می‌کند تا خوانایی متن در هر دو تم حفظ شود.
            موبایل: تصویر افقی است و وسطش خالی — با bg-right ترازوی طلایی
            (سمت راست تصویر) در قاب عمودی گوشی دیده می‌شود؛ دسکتاپ مثل قبل
            مرکز تصویر را نشان می‌دهد. شفافیت موبایل کمی بالاتر است تا پشت
            کارت‌های تمام‌عرض هم پس‌زمینه حس شود. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden">
          <div
            className="site-hero-bg absolute inset-0 bg-cover bg-right opacity-[0.22] sm:bg-center sm:opacity-[0.16] dark:hidden"
            style={{ backgroundImage: "url('/hero-bg-light.jpg')" }}
          />
          <div
            className="site-hero-bg absolute inset-0 hidden bg-cover bg-right opacity-[0.16] sm:bg-center sm:opacity-[0.12] dark:block"
            style={{ backgroundImage: "url('/hero-bg-dark.jpg')" }}
          />
          {/* واش محوکننده برای حفظ خوانایی */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--background) 55%, transparent) 0%, color-mix(in oklab, var(--background) 38%, transparent) 50%, color-mix(in oklab, var(--background) 55%, transparent) 100%)",
            }}
          />
        </div>
        <ThemeProvider>
          <LocaleProvider locale={locale}>
          <MotionProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            {t("پرش به محتوای اصلی")}
          </a>
          {/* Magic UI — نوار پیشرفت اسکرول (در RTL از راست پر می‌شود) */}
          <ScrollProgress />
          <div className="flex min-h-screen flex-col">
            <Header />
            <main id="main" className="page-wash flex-1">
              {children}
            </main>
            <Footer />
          </div>
          <Tracker />
          {/* نوار ناوبری پایین موبایل — فقط روی موبایل/تبلت */}
          <BottomNav />
          {/* مشاور همراه — چت AI در همه‌ی صفحات */}
          <ConsultCompanion />
          {/* اثبات اجتماعی زنده — فقط فعالیت واقعی پلتفرم (سبک آمازون) */}
          <LiveActivity />
          </MotionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
