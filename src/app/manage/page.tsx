import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { getCurrentUser } from "@/lib/user-auth";
import { isOperative } from "@/lib/managed-services";
import ManagedOperations from "@/components/managed-ops";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { absolute: t("پنل عملیات — خدمات و پیگیری‌ها — دادورزان") } };
}
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  staff: "کارشناس عملیات",
  supervisor: "ناظر",
  lawyer: "وکیل ناظر",
  admin: "مدیر",
};

export default async function ManagePage() {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isOperative(user.role)) redirect("/dashboard/client");

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHero
        variant="market"
        image="/images/hero-manage.png"
        badge={t("خدمات و پیگیری‌ها")}
        title={t("پنل عملیات دادورزان")}
        desc={t("مدیریت درخواست‌های خدمات پیگیری و انجام امور — واگذاری، پیش‌فاکتور، پرداخت و تحویل نتیجه.")}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
          {t("شما با نقش:")} {t(ROLE_LABEL[user.role] ?? user.role)}
        </span>
      </PageHero>
      <Container className="mt-8">
        <ManagedOperations currentRole={user.role} />
      </Container>
    </div>
  );
}
