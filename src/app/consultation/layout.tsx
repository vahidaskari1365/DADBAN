import type { Metadata } from "next";
import { getServerLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/core";

/**
 * Metadata برای صفحه‌ی مشاوره — بر اساس Keyword Research.
 * این صفحه target کلمه‌ی «مشاوره حقوقی آنلاین» و «مشاوره حقوقی تلفنی» است.
 * زبان‌آگاه: کلیدها همان رشته‌های فارسی منبع‌اند و در ext واژه‌نامه ترجمه می‌شوند.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = makeT(await getServerLocale());
  const title = t("مشاوره حقوقی آنلاین | متنی، صوتی و تصویری با وکیل");
  const description = t(
    "مشاوره حقوقی آنلاین با وکیل متخصص: مشاوره متنی، صوتی (تلفنی) و تصویری. رزرو نوبت آنلاین با بهترین وکلای ایران، پاسخ به پرسش‌های حقوقی شما در کمترین زمان.",
  );
  return {
    title,
    description,
    keywords: [
      t("مشاوره حقوقی آنلاین"), t("مشاوره حقوقی تلفنی"), t("مشاوره حقوقی متنی"),
      t("مشاوره وکیل"), t("رزرو مشاوره"), t("وکیل آنلاین"), t("پرسش حقوقی"),
    ],
    alternates: {
      canonical: "/consultation",
      languages: { "fa-IR": "/consultation", "x-default": "/consultation" },
    },
    openGraph: {
      title: t("مشاوره حقوقی آنلاین | دادورزان"),
      description: t(
        "مشاوره حقوقی آنلاین با وکیل متخصص: متنی، صوتی و تصویری. رزرو نوبت با بهترین وکلای ایران.",
      ),
      url: "/consultation",
      siteName: "دادورزان",
      locale: "fa_IR",
      type: "website",
      images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: t("مشاوره حقوقی آنلاین") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("مشاوره حقوقی آنلاین | دادورزان"),
      description: t("مشاوره حقوقی آنلاین با وکیل متخصص: متنی، صوتی و تصویری."),
      images: ["/twitter-card.jpg"],
    },
  };
}

export default function ConsultationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
