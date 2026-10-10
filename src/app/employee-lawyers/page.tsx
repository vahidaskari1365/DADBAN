import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { EmployeeLawyerFinder } from "@/components/employee-lawyer-finder";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("وکیل کارمندان | حقوق کار و تأمین اجتماعی"),
    description: t("مشکل کاری‌ات را بنویس؛ بر اساس مشکل تو بهترین وکیل کارمندان (حقوق کار و تأمین اجتماعی) پیشنهاد می‌شود و همان‌جا وقت مشاوره رزرو می‌کنی."),
    alternates: { canonical: "/employee-lawyers" },
  };
}

export default async function EmployeeLawyersPage() {
  const t = await getT();
  return (
    <>
      {/* باکس هیروی همسان سایت (پنل سرمه‌ای با عکس موضوعی) */}
      <PageHero
        variant="market"
        image="/images/hero-employee.png"
        title={t("وکیل کارمندان")}
        desc={t("وکلای متخصص حقوق کار و تأمین اجتماعی؛ فقط وکلایی که حوزه «وکیل کارمندان» را در ثبت‌نام انتخاب کرده‌اند. مشکل خود را بنویسید، بهترین گزینه پیشنهاد می‌شود و با انتخاب وکیل، مستقیم به رزرو وقت مشاوره می‌روید.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("وکیل کارمندان") }]}
      />

      <Container className="py-8">
        <EmployeeLawyerFinder />
      </Container>
    </>
  );
}
