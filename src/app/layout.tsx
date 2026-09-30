import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { noFlashScript } from "@/components/no-flash";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Tracker } from "@/components/tracker";
import { BottomNav } from "@/components/pwa/bottom-nav";
import { SW_REGISTER_SCRIPT } from "@/components/pwa/sw-register-script";
import { SITE_NAME, SITE_NAME_EN, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/brand";
import { organizationSchema, websiteSchema, jsonLd } from "@/lib/seo";

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
  metadataBase: new URL("https://sharifmand.ir"),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "وکیل", "مشاوره حقوقی آنلاین", "وکیل خانواده", "وکیل ملکی", "وکیل کیفری",
    "تنظیم قرارداد", "چک برگشتی", "طلاق", "ثبت شرکت", "مشاوره وکیل", "شریف‌مند",
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
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | پلتفرم هوشمند خدمات حقوقی`,
    description:
      `جستجوی وکیل متخصص، مشاوره آنلاین، ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی — همه در ${SITE_NAME}.`,
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | پلتفرم هوشمند خدمات حقوقی`,
    description:
      `جستجوی وکیل متخصص، مشاوره آنلاین، ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی — همه در ${SITE_NAME}.`,
    images: ["/icon-512.png"],
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className={vazirmatn.variable}>
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
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            پرش به محتوای اصلی
          </a>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
