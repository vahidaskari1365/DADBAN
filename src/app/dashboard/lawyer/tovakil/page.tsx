import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { TovakilPanel } from "@/components/lawyer/tovakil-panel";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "توکیل — واگذاری پرونده بین وکلا",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/**
 * صفحه توکیل — فقط حساب‌های سمت وکیل (role=lawyer متصل به پروفایل).
 * موکل/کاربر عادی به پنل موکل هدایت می‌شود؛ محتوای بازار هرگز برای موکل رندر نمی‌شود.
 */
export default async function TovakilPage() {
  const t = await getT();
  await ensureProfileSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "lawyer" || !user.lawyerId) redirect("/dashboard/client");

  let verified = true;
  try {
    const [l] = await db
      .select({ verified: lawyers.verified })
      .from(lawyers)
      .where(eq(lawyers.id, user.lawyerId))
      .limit(1);
    verified = l?.verified ?? false;
  } catch {
    /* degraded — پنل با حالت قفل رندر می‌شود */
  }

  return (
    <DashboardShell
      role="وکیل"
      title={t("توکیل — واگذاری پرونده")}
      name={user.name}
      nav={[
        { label: t("نمای کلی"), icon: "home", href: "/dashboard/lawyer" },
        { label: t("تخصص‌های من"), icon: "star", href: "/dashboard/lawyer/specialties" },
        { label: t("توکیل"), icon: "link", active: true },
        { label: t("جعبه‌ابزار وکیل"), icon: "briefcase", href: "/workspace" },
        { label: t("پروفایل حرفه‌ای من"), icon: "badge", href: "/dashboard/lawyer/profile" },
        { label: t("پشتیبانی"), icon: "shield", href: "/support" },
      ]}
    >
      <TovakilPanel verified={verified} />
    </DashboardShell>
  );
}
