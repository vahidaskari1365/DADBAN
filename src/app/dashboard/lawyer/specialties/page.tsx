import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui";
import { SpecialtiesPicker } from "@/components/lawyer/specialties-picker";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "تخصص‌های من — پنل وکیل",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/** صفحه «تخصص‌های من» — ویرایش حوزه‌های تخصصی وکیل (درخواست کارفرما، قابلیت ۱) */
export default async function LawyerSpecialtiesPage() {
  const t = await getT();
  await ensureProfileSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "lawyer" || !user.lawyerId) redirect("/dashboard/client");

  let specialties: string[] = [];
  try {
    const [l] = await db
      .select({ specialties: lawyers.specialties })
      .from(lawyers)
      .where(eq(lawyers.id, user.lawyerId))
      .limit(1);
    specialties = l?.specialties ?? [];
  } catch {
    /* degraded — فرم خالی رندر می‌شود */
  }

  return (
    <DashboardShell
      role="وکیل"
      title={t("تخصص‌های من")}
      name={user.name}
      nav={[
        { label: t("نمای کلی"), icon: "home", href: "/dashboard/lawyer" },
        { label: t("تخصص‌های من"), icon: "star", active: true },
        { label: t("جعبه‌ابزار وکیل"), icon: "briefcase", href: "/workspace" },
        { label: t("پروفایل حرفه‌ای من"), icon: "badge", href: "/dashboard/lawyer/profile" },
        { label: t("پشتیبانی"), icon: "shield", href: "/support" },
      ]}
    >
      <Card hover={false} className="mx-auto max-w-3xl">
        <h2 className="flex items-center gap-2 text-base font-black text-foreground">
          تخصص‌های حرفه‌ای خود را انتخاب کنید
        </h2>
        <p className="mt-1.5 text-sm leading-7 text-foreground-soft">
          تخصص‌های انتخابی در پروفایل عمومی شما، فیلتر جستجوی موکل‌ها و پیشنهاد پرونده‌های مرتبط استفاده می‌شود.
          هر زمان می‌توانید از همین صفحه تغییرشان دهید.
        </p>
        <div className="mt-5">
          <SpecialtiesPicker initial={specialties} />
        </div>
      </Card>
    </DashboardShell>
  );
}
