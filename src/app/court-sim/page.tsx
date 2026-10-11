import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases, courtSessions, teamCaseAssignments } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { getT } from "@/lib/i18n/server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { CourtSimClient, type PastSession, type SimCaseOption, type SimMessage } from "@/components/lawyer/court-sim-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("شبیه‌سازی دادگاه — تمرین جلسه با قاضی و وکیل خصم"),
    description: t("قبل از جلسهٔ واقعی، پاسخ‌گویی به قاضی و وکیلِ خصم را تمرین کنید و بازخورد بگیرید."),
    robots: { index: false, follow: false },
  };
}
export const dynamic = "force-dynamic";

interface StoredMessage {
  speaker: string;
  text: string;
  at?: string;
}

function parseStoredMessages(raw: string): SimMessage[] {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((m): m is StoredMessage => !!m && typeof (m as StoredMessage).text === "string").map((m) => ({ speaker: String(m.speaker ?? "system"), text: m.text, at: m.at }));
    }
  } catch {
    /* بدون پیام */
  }
  return [];
}

export default async function CourtSimPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string; session?: string }>;
}) {
  const t = await getT();
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isLawyerSide = user.role === "lawyer" || user.role === "team" || user.role === "staff" || user.role === "supervisor";

  /* فهرست پرونده‌های قابل انتخاب برای سناریو — هم‌قاعدهٔ میز پرونده */
  let simCases: SimCaseOption[] = [];
  try {
    if (user.role === "lawyer" || user.role === "staff" || user.role === "supervisor") {
      const rows = await db
        .select({ caseNumber: cases.caseNumber, subject: cases.subject })
        .from(cases)
        .orderBy(desc(cases.createdAt))
        .limit(15);
      simCases = rows;
    } else if (user.role === "team") {
      const perms = (user.teamPermissions ?? "").split(",").map((s) => s.trim());
      if (perms.includes("cases")) {
        const assigned = await db
          .select({ caseId: teamCaseAssignments.caseId })
          .from(teamCaseAssignments)
          .where(eq(teamCaseAssignments.memberUserId, user.id));
        if (assigned.length) {
          const rows = await db
            .select({ caseNumber: cases.caseNumber, subject: cases.subject })
            .from(cases)
            .where(inArray(cases.id, assigned.map((a) => a.caseId)))
            .orderBy(desc(cases.createdAt))
            .limit(15);
          simCases = rows;
        }
      }
    } else {
      // موکل — پرونده‌های خودش را ببیند تا بتواند تمرین کند
      const rows = await db
        .select({ caseNumber: cases.caseNumber, subject: cases.subject })
        .from(cases)
        .where(eq(cases.contactPhone, user.phone))
        .orderBy(desc(cases.createdAt))
        .limit(15);
      simCases = rows;
    }
  } catch (err) {
    console.error("[dadban] court-sim: cases list failed:", err);
  }

  /* جلسات قبلی کاربر */
  let past: PastSession[] = [];
  try {
    const rows = await db
      .select()
      .from(courtSessions)
      .where(eq(courtSessions.userId, user.id))
      .orderBy(desc(courtSessions.createdAt))
      .limit(8);
    past = rows.map((r) => ({
      id: r.id,
      title: r.title,
      turns: r.turns,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      messages: parseStoredMessages(r.messages),
      feedback: r.feedback,
    }));
  } catch (err) {
    console.error("[dadban] court-sim: past sessions failed:", err);
  }

  /* جلسهٔ درخواستی (?session=) یا جلسهٔ فعالِ تازه */
  const requestedId = sp.session ? Number(sp.session) : NaN;
  const selected = past.find((p) => p.id === requestedId) ?? null;
  const active = selected ?? past.find((p) => p.status === "active" && p.messages.length > 0) ?? null;

  return (
    <DashboardShell
      role={isLawyerSide ? "وکیل" : "موکل"}
      title={t("شبیه‌سازی دادگاه")}
      subtitle={t("تمرین جلسه با قاضی و وکیلِ خصم — پیش از جلسهٔ واقعی آماده شوید")}
      userName={user.name}
      nav={
        isLawyerSide
          ? lawyerNav("cases")
          : [
              { label: t("نمای کلی"), icon: "home", href: "/dashboard/client" },
              { label: t("پرونده‌های من"), icon: "folder", href: "/dashboard/cases" },
              { label: t("شبیه‌سازی دادگاه"), icon: "gavel", active: true },
            ]
      }
      back={{ fallback: isLawyerSide ? "/workspace" : "/dashboard/client", label: isLawyerSide ? t("جعبه‌ابزار") : t("پنل موکل") }}
    >
      <div className="space-y-6">
        <CourtSimClient
          cases={simCases}
          initialMessages={active?.messages ?? []}
          initialFeedback={active?.feedback ?? ""}
          initialSessionId={active?.id ?? null}
          initialTurns={active?.turns ?? 0}
          initialTitle={active?.title ?? ""}
        />

        {/* جلسات قبلی */}
        {past.length > 0 && (
          <Card hover={false}>
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-foreground">
              <Icon name="clock" className="h-5 w-5 text-primary" />
              {t("جلسات تمرین قبلی")}
            </h3>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {past.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-strong bg-background px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-foreground">{p.title || t("جلسهٔ تمرین")}</div>
                    <div className="text-[11px] text-foreground-soft">
                      {new Date(p.createdAt).toLocaleString("fa-IR")} • {t("نوبت‌ها")}: {p.turns.toLocaleString("fa-IR")} •{" "}
                      {p.status === "active" ? t("در جریان") : t("پایان‌یافته")}
                    </div>
                  </div>
                  <a
                    href={`/court-sim?session=${p.id}`}
                    className="rounded-lg bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary-soft"
                  >
                    {t("مشاهده")}
                  </a>
                </div>
              ))}
            </div>
            {!isLawyerSide && (
              <p className="mt-3 text-[11px] leading-6 text-foreground-soft">
                {t("این ابزار برای وکلای دادبان طراحی شده اما موکلان هم می‌توانند با پروندهٔ خودشان تمرین کنند.")}
              </p>
            )}
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
