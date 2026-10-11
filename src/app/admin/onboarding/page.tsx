import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lawyerOnboarding } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import OnboardingClient from "./onboarding-client";
import { faNum } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("صف روی‌بوردینگ وکلا — پنل مدیریت دادبان"),
    description: t("بررسی و تأیید درخواست‌های همکاری وکلای واقعی: مدارک، پروانه، تخصص‌ها و قرارداد همکاری."),
  };
}
export const dynamic = "force-dynamic";

export default async function AdminOnboardingPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const t = await getT();
  const tf = templateT(t);

  // جدول روی‌بوردینگ — best-effort؛ در نبود دیتابیس صف خالی + پیام صادقانه
  try {
    await ensureExtendedSchema();
  } catch {
    /* non-fatal */
  }

  let rows: (typeof lawyerOnboarding.$inferSelect)[] = [];
  let degraded = false;
  try {
    rows = await db
      .select()
      .from(lawyerOnboarding)
      .orderBy(desc(lawyerOnboarding.createdAt))
      .limit(200);
    if (!Array.isArray(rows)) rows = [];
  } catch {
    degraded = true;
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHero
        badge={t("Admin · روی‌بوردینگ")}
        title={t("صف تأیید وکلای واقعی")}
        desc={t("بررسی درخواست‌های همکاری، راستی‌آزمایی پروانه و تأیید/رد متقاضیان — تأیید یعنی ساخت خودکار پروفایل عمومی و اتصال حساب کاربری متقاضی.")}
        breadcrumb={[
          { label: t("خانه"), href: "/" },
          { label: t("پنل مدیریت"), href: "/admin" },
          { label: t("روی‌بوردینگ وکلا") },
        ]}
      >
        <span
          data-testid="onboarding-pending-badge"
          className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(230_185_78/0.35)] bg-[rgb(230_185_78/0.14)] px-3 py-1.5 text-xs font-bold text-[#eec97b]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#eec97b] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#eec97b]" />
          </span>
          {tf("{n} درخواست در انتظار بررسی", { n: faNum(pendingCount) })}
        </span>
      </PageHero>

      <Container className="py-10">
        <OnboardingClient rows={rows} degraded={degraded} />
      </Container>
    </>
  );
}
