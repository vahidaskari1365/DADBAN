import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { loadCaseForDesk, listCaseDeskDocs, latestCaseAnalysis } from "@/lib/case-desk";
import { getLawyerStyleByUser, buildStyleBlock } from "@/lib/lawyer-style";
import { getT } from "@/lib/i18n/server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { CaseDeskClient } from "@/components/lawyer/case-desk-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("میز اختصاصی پرونده — پنل وکیل"),
    description: t("تحلیل کل پرونده، کشف تناقض‌های احتمالی اسناد، نقاط قوت و ضعف، و تولید لایحهٔ دفاعیه."),
    robots: { index: false, follow: false },
  };
}
export const dynamic = "force-dynamic";

export default async function CaseDeskPage({ params }: { params: Promise<{ caseNumber: string }> }) {
  const t = await getT();
  const { caseNumber } = await params;
  const decoded = decodeURIComponent(caseNumber);

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // ناحیهٔ وکیل: موکل به صفحهٔ پروندهٔ خودش برمی‌گردد
  if (user.role === "client") redirect("/dashboard/cases");
  if (user.role !== "lawyer" && user.role !== "team" && user.role !== "staff" && user.role !== "supervisor") {
    redirect("/dashboard/client");
  }

  const access = await loadCaseForDesk(user, decoded);
  if (!access.ok) {
    return (
      <DashboardShell role="وکیل" title={t("میز پرونده")} nav={lawyerNav("cases")} userName={user.name}>
        <EmptyState
          icon="folder"
          title={access.reason === "forbidden" ? t("دسترسی به این پرونده ممکن نیست") : t("پرونده‌ای با این شماره پیدا نشد")}
          desc={access.reason === "forbidden" ? t("این پرونده به شما سپرده نشده یا مجوز لازم را ندارید.") : t("شمارهٔ پرونده را بررسی کنید یا از فهرست «پرونده‌های من» وارد شوید.")}
        />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button href="/dashboard/lawyer#my-cases" icon="folder">{t("پرونده‌های من")}</Button>
        </div>
      </DashboardShell>
    );
  }

  const row = access.case;
  const [docs, analysis, styleProfile] = await Promise.all([
    listCaseDeskDocs(row.id),
    latestCaseAnalysis(row.id),
    getLawyerStyleByUser(user.id),
  ]);
  const hasStyle = !!buildStyleBlock(styleProfile);

  return (
    <DashboardShell
      role="وکیل"
      title={`${t("میز پرونده")}: ${row.subject}`}
      subtitle={`${row.caseNumber} • ${row.city} • ${t("مرحله")}: ${row.stage}`}
      userName={user.name}
      nav={lawyerNav("cases")}
      back={{ fallback: "/dashboard/lawyer#my-cases", label: t("پرونده‌های من") }}
    >
      <div className="space-y-6">
        {/* خلاصهٔ پرونده */}
        <Card hover={false} className="border-primary/30 bg-primary-soft/30" data-testid="desk-summary">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-foreground">
                <Icon name="folder" className="h-5 w-5 text-primary" />
                {row.subject}
                <Badge tone="neutral">{row.stage}</Badge>
                {row.specialty && row.specialty !== "عمومی" && <Badge tone="accent">{row.specialty}</Badge>}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-7 text-foreground-soft">
                {row.description || t("شرحی ثبت نشده است.")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button href="/dashboard/lawyer#my-cases" variant="outline" size="sm" icon="folder">
                {t("پرونده‌های من")}
              </Button>
            </div>
          </div>
        </Card>

        <CaseDeskClient
          caseRow={{
            caseNumber: row.caseNumber,
            subject: row.subject,
            city: row.city,
            province: row.province,
            stage: row.stage,
            description: row.description,
          }}
          initialDocs={docs}
          initialAnalysis={
            analysis
              ? {
                  overview: analysis.overview,
                  strengths: analysis.strengths,
                  weaknesses: analysis.weaknesses,
                  contradictions: analysis.contradictions,
                  missingDocs: analysis.missingDocs,
                  nextSteps: analysis.nextSteps,
                  createdAt: analysis.createdAt.toISOString(),
                  docCount: analysis.docCount,
                }
              : null
          }
          hasStyle={hasStyle}
        />

        <p className="text-center text-[11px] leading-6 text-foreground-soft">
          {t(
            "تحلیل‌ها و لایحه‌های این ابزار یارِ وکیل است، نه رأی: همهٔ یافته‌ها «احتمالی» و نیازمند راستی‌آزمایی وکیل‌اند و هیچ تضمینی برای نتیجهٔ دادگاه وجود ندارد.",
          )}
        </p>
      </div>
    </DashboardShell>
  );
}
