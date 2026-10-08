import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
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
      {/* بدون پس‌زمینه مات — بک‌گراند سراسری سایت دیده می‌شود */}
      <section className="border-b border-border bg-surface-2/40 py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">
              {t("خانه")}
            </Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">{t("وکیل کارمندان")}</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
            {t("وکیل کارمندان")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            {t("وکلای متخصص حقوق کار و تأمین اجتماعی؛ فقط وکلایی که حوزه «وکیل کارمندان» را در ثبت‌نام انتخاب کرده‌اند. مشکل خود را بنویسید، بهترین گزینه پیشنهاد می‌شود و با انتخاب وکیل، مستقیم به رزرو وقت مشاوره می‌روید.")}
          </p>
        </Container>
      </section>

      <Container className="py-8">
        <EmployeeLawyerFinder />
      </Container>
    </>
  );
}
