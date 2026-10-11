import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { getT } from "@/lib/i18n/server";
import { resolveLawyerContext } from "@/components/portal/lawyer/portal-server";
import { getTeamMembersView } from "@/components/portal/lawyer/portal-team";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { TeamManager } from "@/components/portal/lawyer/team-manager";
import { DpToaster } from "@/components/portal/lawyer/toaster";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پنل وکیل — کارآموز و تیم"),
    description: t("مدیریت کارآموزان و همکاران، دامنه دسترسی و وضعیت اعضای تیم حقوقی شما."),
  };
}
export const dynamic = "force-dynamic";

export default async function LawyerTeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getT();

  const ctx = await resolveLawyerContext(user);
  const members = await getTeamMembersView(ctx.lawyerId);

  return (
    <DashboardShell
      role="وکیل"
      title={t("کارآموز و تیم")}
      subtitle={t("دعوت کارآموزان و همکاران و مدیریت دامنه دسترسی آن‌ها")}
      userName={ctx.lawyer?.name ?? user.name}
      userRole={ctx.demo ? t("وکیل · حالت نمایش") : t(ctx.lawyerTitle)}
      nav={lawyerNav("team")}
    >
      <DpToaster />

      <Card hover={false}>
        <h2 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-foreground">
          <Icon name="user" className="h-5 w-5 text-primary" />
          {t("تیم و کارآموزان")}
        </h2>
        <TeamManager initialMembers={members} canWrite={!ctx.demo} />
      </Card>
    </DashboardShell>
  );
}
