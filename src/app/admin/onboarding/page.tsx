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

export const metadata: Metadata = {
  title: "صف روی‌بوردینگ وکلا — پنل مدیریت دادبان",
  description: "بررسی و تأیید درخواست‌های همکاری وکلای واقعی: مدارک، پروانه، تخصص‌ها و قرارداد همکاری.",
};
export const dynamic = "force-dynamic";

export default async function AdminOnboardingPage() {
  if (!(await isAdmin())) redirect("/admin/login");

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
        badge="Admin · روی‌بوردینگ"
        title="صف تأیید وکلای واقعی"
        desc="بررسی درخواست‌های همکاری، راستی‌آزمایی پروانه و تأیید/رد متقاضیان — تأیید یعنی ساخت خودکار پروفایل عمومی و اتصال حساب کاربری متقاضی."
        breadcrumb={[
          { label: "خانه", href: "/" },
          { label: "پنل مدیریت", href: "/admin" },
          { label: "روی‌بوردینگ وکلا" },
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
          {faNum(pendingCount)} درخواست در انتظار بررسی
        </span>
      </PageHero>

      <Container className="py-10">
        <OnboardingClient rows={rows} degraded={degraded} />
      </Container>
    </>
  );
}
