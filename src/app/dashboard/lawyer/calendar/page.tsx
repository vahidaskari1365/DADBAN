import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { getMyCases, getLawyerAppointments, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { CalendarManager } from "@/components/portal/lawyer/calendar-manager";
import { DpToaster } from "@/components/portal/lawyer/toaster";

export const metadata: Metadata = {
  title: "پنل وکیل — تقویم و مهلت‌ها",
  description: "جلسات رسیدگی، مشاوره‌ها و مهلت‌های قانونی پرونده‌های شما در یک تقویم واحد.",
};
export const dynamic = "force-dynamic";

export default async function LawyerCalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ctx = await resolveLawyerContext(user);
  const [appointmentsList, myCases] = await Promise.all([
    getLawyerAppointments(ctx.lawyerId, { limit: 80 }),
    getMyCases(ctx.lawyerId),
  ]);

  const caseOptions = myCases
    .filter((c) => c.status !== "closed")
    .slice(0, 10)
    .map((c) => ({ id: c.id, label: `${c.caseNumber} · ${c.subject}` }));

  return (
    <DashboardShell
      role="وکیل"
      title="تقویم و مهلت‌ها"
      subtitle="جلسات رسیدگی، مشاوره‌ها و مهلت‌های قانونی در یک نگاه"
      userName={ctx.lawyer?.name ?? user.name}
      userRole={ctx.demo ? "وکیل · حالت نمایش" : ctx.lawyerTitle}
      nav={lawyerNav("calendar")}
    >
      <DpToaster />

      <Card hover={false}>
        <h2 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-foreground">
          <Icon name="calendar" className="h-5 w-5 text-primary" />
          تقویم و مهلت‌های قانونی
        </h2>
        <CalendarManager initialItems={appointmentsList} caseOptions={caseOptions} canWrite={!ctx.demo} />
      </Card>
    </DashboardShell>
  );
}
