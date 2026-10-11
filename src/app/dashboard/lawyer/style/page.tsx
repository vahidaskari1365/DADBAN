import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { getLawyerStyleByUser } from "@/lib/lawyer-style";
import { getT } from "@/lib/i18n/server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { StyleProfileForm } from "@/components/lawyer/style-profile-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("سبک نگارش من — پنل وکیل"),
    description: t("پروفایل سبک نگارش خود را بسازید تا اسناد تولیدی دادبان مثل خودتان نوشته شود."),
  };
}
export const dynamic = "force-dynamic";

export default async function LawyerStylePage() {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isLawyerSideRole(user.role) && user.role !== "staff" && user.role !== "supervisor") {
    redirect("/dashboard/client");
  }

  const profile = await getLawyerStyleByUser(user.id);
  const filled = !!(profile && (profile.traits.trim() || profile.samples.length > 0));

  return (
    <DashboardShell
      role="وکیل"
      title={t("سبک نگارش من")}
      subtitle={t("سیستم مثل خودِ شما بنویسد — لحن و عادت‌های نگارش شما در اسناد تولیدی رعایت می‌شود")}
      userName={user.name}
      nav={lawyerNav("profile")}
      back={{ fallback: "/dashboard/lawyer/profile", label: t("پروفایل حرفه‌ای") }}
    >
      <div className="space-y-6">
        {/* توضیح کوتاه */}
        <Card hover={false} className="border-primary/30 bg-primary-soft/40">
          <div className="flex items-start gap-3">
            <Icon name="sparkles" className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" />
            <div className="text-sm leading-7 text-foreground-soft">
              <p className="font-semibold text-foreground">
                {t("سبک اختصاصی وکیل چطور کار می‌کند؟")}
                {filled && (
                  <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    <Icon name="check" className="h-3 w-3" /> {t("پروفایل فعال")}
                  </span>
                )}
              </p>
              <p>
                {t(
                  "یک تا سه نمونه از لایحه‌ها و اسناد قبلی خودتان را وارد کنید. دادبان ویژگی‌های سبک شما را استخراج می‌کند و از آن پس، دادخواست‌ساز و میز پرونده اسناد را با ادبیات و جمله‌بندی شما تولید می‌کنند. محتوای نمونه‌ها هرگز کپی نمی‌شود؛ فقط لحن و ساختار آن‌ها الگو می‌شود.",
                )}
              </p>
            </div>
          </div>
        </Card>

        <StyleProfileForm
          initial={{
            tone: profile?.tone ?? "formal",
            fixedOpening: profile?.fixedOpening ?? "",
            fixedClosing: profile?.fixedClosing ?? "",
            samples: profile?.samples ?? [],
            traits: profile?.traits ?? "",
          }}
        />

        <Card hover={false}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs leading-6 text-foreground-soft">
              {t("این پروفایل به‌صورت خودکار در «دادخواست‌ساز هوشمند» و «میز پرونده» اعمال می‌شود.")}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button href="/legal-forms" variant="outline" size="sm" icon="file">
                {t("دادخواست‌ساز")}
              </Button>
              <Button href="/workspace" variant="soft" size="sm" icon="briefcase">
                {t("جعبه‌ابزار وکیل")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
