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
    title: t("حریم خصوصی — دادورزان"),
    description: t("سیاست حفظ حریم خصوصی کاربران پلتفرم حقوقی دادورزان."),
  };
}

const SECTIONS = [
  ["۱. اطلاعات جمع‌آوری‌شده", "نام، شماره تماس، اطلاعات پرونده و محتوای گفتگوهایی که هنگام استفاده از خدمات ثبت می‌کنید."],
  ["۲. نحوه استفاده از اطلاعات", "اطلاعات شما برای ارائه خدمات، بررسی درخواست‌ها، بهبود پلتفرم و اطلاع‌رسانی پیرامون پرونده استفاده می‌شود."],
  ["۳. اشتراک‌گذاری اطلاعات", "اطلاعات پرونده فقط با وکیل منتخب شما و صرفاً برای ارائه خدمت به اشتراک گذاشته می‌شود. بدون رضایت شما داده‌ای فروخته یا اجاره داده نمی‌شود."],
  ["۴. امنیت داده‌ها", "داده‌ها با رمزنگاری محافظت شده و دسترسی به آن‌ها محدود به پرسنل مجاز است. رمز عبور شما به‌صورت هش‌شده ذخیره می‌شود."],
  ["۵. کوکی‌ها", "برای بهبود تجربه کاربری و تحلیل بازدید از کوکی استفاده می‌کنیم. می‌توانید کوکی‌ها را از مرورگر خود غیرفعال کنید."],
  ["۶. حقوق شما", "شما می‌توانید در هر زمان درخواست مشاهده، اصلاح یا حذف اطلاعات خود را از طریق صفحه تماس ثبت کنید."],
];

export default async function PrivacyPage() {
  const t = await getT();
  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-privacy.png"
        title={t("حریم خصوصی")}
        desc={t("حفظ حریم خصوصی شما برای ما اولویت است. آخرین به‌روزرسانی: بهار ۱۴۰۴")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("حریم خصوصی") }]}
      />
      <Container className="py-12">
        <div className="mx-auto max-w-3xl space-y-5">
          <LegalReviewBadge slug="privacy" />
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
