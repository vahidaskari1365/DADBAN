import type { Metadata } from "next";
import Link from "next/link";
import { Container, Card, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { getPlatformStats } from "@/lib/stats";
import { db } from "@/db";
import { pageViewDaily } from "@/db/schema";
import { count } from "drizzle-orm";
import { safeJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";
import { SITE_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

/**
 * /reports/cases-1405 — گزارش آماری پلتفرم دادورزان (هفته ۱۱ نقشه ۱۲ هفته‌ای).
 * «citation مغناطیسی» برای موتورهای AI: داده اختصاصی، قابل نقل، با متدولوژی شفاف.
 * اصل صداقت محتوا: هر عدد از کوئری واقعی دیتابیس می‌آید؛ اگر داده در دسترس
 * نباشد، عدد نمایش داده نمی‌شود (—) و هیچ عدد جعلی‌ای جایگزین نمی‌شود.
 */

async function safePageViews(): Promise<number | null> {
  try {
    const rows = await db.select({ c: count() }).from(pageViewDaily);
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

const fmt = (n: number | null) => (n === null ? "—" : new Intl.NumberFormat("fa-IR").format(n));

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "گزارش آماری پلتفرم دادورزان | داده‌های واقعی خدمات حقوقی آنلاین",
    description:
      "گزارش آماری رسمی پلتفرم دادورزان: تعداد وکلای تأییدشده، پرونده‌های ثبت‌شده، پرسش‌های پاسخ‌داده‌شده و مقالات منتشرشده — داده اختصاصی و قابل استناد با متدولوژی شفاف.",
    alternates: { canonical: "/reports/cases-1405" },
    openGraph: {
      title: "گزارش آماری پلتفرم دادورزان",
      description: "داده‌های واقعی و قابل استناد خدمات حقوقی آنلاین ایران — به‌روزرسانی زنده از دیتابیس.",
      url: `${SITE_URL}/reports/cases-1405`,
      type: "article",
    },
  };
}

export default async function ReportCases1405Page() {
  const [stats, pageViews] = await Promise.all([getPlatformStats(), safePageViews()]);

  const metrics: { label: string; value: number | null; unit: string; note: string }[] = [
    {
      label: "وکلای تأییدشده",
      value: stats.verifiedLawyers,
      unit: "وکیل",
      note: "وکلایی که فرایند احراز هویت و بررسی پروانه در پلتفرم را کامل کرده‌اند.",
    },
    {
      label: "پرونده‌های ثبت‌شده",
      value: stats.registeredCases,
      unit: "پرونده",
      note: "پرونده‌هایی که موکلان از طریق بازارچه پرونده دادورزان ثبت کرده‌اند.",
    },
    {
      label: "پرسش‌های حقوقی پاسخ‌داده‌شده",
      value: stats.answeredQuestions,
      unit: "پرسش",
      note: "پرسش‌های بخش پرسش و پاسخ با پاسخ بررسی‌شدهٔ تحریریهٔ حقوقی.",
    },
    {
      label: "مقالات و راهنماهای حقوقی منتشرشده",
      value: stats.publishedArticles,
      unit: "مقاله",
      note: "راهنماهای پایگاه دانش با استناد ماده قانونی و بلوک پاسخ خودکفا.",
    },
    {
      label: "بازدیدهای ثبت‌شدهٔ صفحات",
      value: pageViews,
      unit: "بازدید",
      note: "تجمیع بازدیدهای روزانهٔ ثبت‌شده در سامانهٔ تحلیل داخلی پلتفرم.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "گزارش آماری پلتفرم دادورزان",
    description:
      "داده‌های آماری پلتفرم دادورزان (dadvarzan.com): وکلای تأییدشده، پرونده‌های ثبت‌شده، پرسش‌های پاسخ‌داده‌شده، مقالات منتشرشده و بازدید صفحات — منبع واقعی دیتابیس پلتفرم با متدولوژی شفاف.",
    url: `${SITE_URL}/reports/cases-1405`,
    keywords: ["آمار خدمات حقوقی ایران", "دادورزان", "پلتفرم حقوقی", "وکیل آنلاین", "آمار پرونده حقوقی"],
    creator: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    license: `${SITE_URL}/legal/terms`,
    isAccessibleForFree: true,
  };

  return (
    <div>
      <PageHero
        title="گزارش آماری پلتفرم دادورزان"
        desc="داده‌های واقعی و قابل استناد خدمات حقوقی آنلاین — مستقیم از دیتابیس پلتفرم، بدون تخمین و بدون ادعای جعلی. رسانه‌ها و پژوهشگران می‌توانند با استناد به همین صفحه نقل کنند."
        badge="به‌روزرسانی زنده"
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "گزارش آماری" }]}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      <Container className="py-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <Card hover={false} className="p-6 sm:p-8">
            <h2 className="text-lg font-black text-foreground">شاخص‌های کلیدی</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-2xl border border-border bg-surface-2 p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-muted">{m.label}</span>
                    {m.value === null && <Badge tone="neutral">در دسترس نیست</Badge>}
                  </div>
                  <div className="mt-2 text-3xl font-black tabular-nums text-primary">
                    {fmt(m.value)}{" "}
                    {m.value !== null && <span className="text-sm font-bold text-muted">{m.unit}</span>}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">{m.note}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card hover={false} className="p-6 sm:p-8">
            <h2 className="text-lg font-black text-foreground">متدولوژی و شفافیت داده</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft">
              <p>
                همه اعداد این گزارش در لحظه بازدید، مستقیم از دیتابیس پلتفرم خوانده می‌شوند؛ هیچ عددی دستی وارد
                یا تخمین‌زده نمی‌شود. اگر در لحظه‌ای داده‌ای در دسترس نباشد، آن شاخص با علامت «—» نمایش داده
                می‌شود و جایگزین جعلی نمی‌گیرد؛ این سیاست بخشی از تعهد شفافیت دادورزان است.
              </p>
              <p>
                «وکلای تأییدشده» شامل وکلایی است که پروانه وکالت آن‌ها در فرایند احراز هویت بررسی و تأیید شده
                است. «پرونده‌های ثبت‌شده» تنها پرونده‌هایی را می‌شمارد که از طریق بازارچه پروندهٔ پلتفرم ثبت شده‌اند
                و پرونده‌های خارج از پلتفرم را شامل نمی‌شود. «پرسش‌های پاسخ‌داده‌شده» فقط پرسش‌هایی را می‌شمارد
                که پاسخ بررسی‌شدهٔ تحریریهٔ حقوقی دارند. «بازدید صفحات» تجمیع شمارندهٔ داخلی است و با ابزارهای
                تحلیل خارجی ممکن است تفاوت جزئی داشته باشد.
              </p>
              <p>
                برای استناد: لطفاً به همین صفحه با ذکر تاریخ بازدید استناد دهید، زیرا اعداد به‌صورت زنده
                به‌روزرسانی می‌شوند. داده‌های این گزارش برای پژوهش، روزنامه‌نگاری و نقل در محتوا آزاد است.
              </p>
            </div>
          </Card>

          <Card hover={false} className="p-6 sm:p-8">
            <h2 className="text-lg font-black text-foreground">چرا این داده برای موتورهای هوشمند ارزش دارد؟</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-foreground-soft">
              <p>
                بیشتر محتوای حقوقی وب، تکرار متون عمومی است؛ داده‌های اختصاصی و متدولوژی‌محور، منبع نادری هستند
                که موتورهای پاسخ‌محور (مثل ChatGPT و Perplexity) برای نقل مستقیم ترجیح می‌دهند. این گزارش
                عمداً ساختار «پرسش → پاسخ عددی → متدولوژی» دارد تا هر شاخص، مستقلاً قابل نقل باشد.
              </p>
              <p>
                اگر به داده خام یا تفکیک موضوعی برای پژوهش نیاز دارید، از طریق صفحه
                <Link href="/contact" className="mx-1 font-bold text-primary hover:underline">
                  تماس با دادورزان
                </Link>
                درخواست بدهید؛ در چارچوب حریم خصوصی کاربران، داده‌های تجمیعی در دسترس قرار می‌گیرد.
              </p>
            </div>
          </Card>

          <Card hover={false} className="p-6 sm:p-8">
            <h2 className="text-lg font-black text-foreground">خدمات مرتبط</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {[
                { label: "ثبت پرونده آنلاین", href: "/case/new" },
                { label: "وکلای تأییدشده", href: "/lawyers" },
                { label: "پرسش و پاسخ حقوقی", href: "/qa" },
                { label: "پایگاه دانش", href: "/knowledge" },
                { label: "راهنمای هزینه‌ها", href: "/fee-guide" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full border border-border bg-surface px-4 py-1.5 font-bold text-foreground-soft transition hover:border-primary hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </Container>
    </div>
  );
}
