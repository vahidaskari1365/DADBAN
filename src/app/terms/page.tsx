import type { Metadata } from "next";
import { Fragment } from "react";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import LegalReviewBadge from "@/components/legal-review-badge";
import { getT } from "@/lib/i18n/server";

/** چندزبانه: تیتر/توضیح با generateMetadata و getT به زبان انتخابی کاربر می‌رود */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("قوانین و مقررات استفاده — دادورزان"),
    description: t("قوانین و شرایط استفاده از خدمات پلتفرم حقوقی دادورزان."),
  };
}

const SECTIONS = [
  ["۱. پذیرش شرایط", "استفاده از خدمات دادورزان به معنای پذیرش کامل این قوانین است. چنانچه با هر یک از بندها موافق نیستید، از استفاده از خدمات خودداری کنید."],
  ["۲. خدمات پلتفرم", "دادورزان بستری برای ارتباط موکل و وکیل، مشاوره حقوقی، تنظیم قرارداد و پیگیری پرونده فراهم می‌کند. مطالب آموزشی سایت جنبه اطلاع‌رسانی دارد و جایگزین مشاوره حقوقی تخصصی نیست."],
  ["۳. تعهدات کاربر", "کاربر متعهد است اطلاعات صحیح و کامل ارائه دهد، از داده‌های دیگران سوءاستفاده نکند و پاسخ‌گویی محتوای ارسالی خود باشد."],
  ["۴. محرمانگی", "اطلاعات پرونده و گفتگوهای شما محرمانه تلقی می‌شود و جز برای ارائه خدمت یا الزام قانونی در اختیار شخص ثالث قرار نمی‌گیرد."],
  ["۵. مسئولیت وکیل", "وکلای معرفی‌شده مسئول صحت خدمات خود هستند. دادورزان صحت مدارک و پروانه وکلا را پیش از انتشار پروفایل بررسی می‌کند."],
  ["۶. هزینه و پرداخت", "هزینه مشاوره و خدمات بر اساس تعرفه اعلام‌شده در صفحات مربوطه است. پرداخت‌ها از طریق درگاه امن انجام می‌شود."],
  ["۷. خاتمه خدمات", "دادورزان می‌تواند در صورت نقض قوانین، دسترسی کاربر را موقتاً یا دائم مسدود کند."],
];

export default async function TermsPage() {
  const t = await getT();
  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-laws.png"
        title={t("قوانین و مقررات استفاده")}
        desc={t("آخرین به‌روزرسانی: بهار ۱۴۰۴")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("قوانین و مقررات استفاده") }]}
      />
      <Container className="py-12">
        <div className="mx-auto max-w-3xl space-y-5">
          <LegalReviewBadge slug="terms" />
          {SECTIONS.map(([heading, body]) => (
            <Fragment key={heading}>
              <div className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-base font-bold text-foreground">{t(heading)}</h2>
                <p className="mt-2 text-sm leading-7 text-muted">{t(body)}</p>
              </div>
            </Fragment>
          ))}
        </div>
      </Container>
    </>
  );
}
