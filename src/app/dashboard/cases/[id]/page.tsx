import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { cases, lawyers } from "@/db/schema";
import {
  caseEvents,
  caseMessages,
  caseProposals,
  creditRequests,
  installments,
} from "@/db/schema-marketplace";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import CaseWorkspace from "@/components/portal/client/case-workspace";

export const metadata: Metadata = {
  title: "فضای کاری پرونده — دادپیو",
  description: "جزئیات پرونده، تایم‌لاین، پیام‌رسان، اقساط، قرارداد و پیشنهادهای وکلا در یک فضای کاری واحد.",
};

export const dynamic = "force-dynamic";

const TABS = ["overview", "timeline", "messages", "payments", "contract", "proposals"] as const;
type Tab = (typeof TABS)[number];

type CreditItem = {
  id: number;
  provider: string;
  amount: string;
  months: number;
  status: string;
  statusDetail: string;
  referenceCode: string;
  createdAt: string | null;
};
type EventItem = {
  id: number;
  actor: string;
  actorName: string;
  title: string;
  description: string;
  progress: number | null;
  createdAt: string | null;
};
type InstallmentItem = {
  id: number;
  number: number;
  amount: string;
  dueDate: string | null;
  status: string;
  source: string;
  paidAt: string | null;
  trackingCode: string;
};
type LawyerLite = { id: number; name: string; slug: string; title: string; rating: number };
type MessageItem = { id: number; senderRole: string; senderName: string; body: string; createdAt: string | null };
type ProposalItem = {
  id: number;
  lawyerId: number;
  amount: string;
  note: string;
  durationMonths: number;
  status: string;
  aiMatchScore: number;
  createdAt: string | null;
};
type WorkspaceCase = {
  id: number;
  caseNumber: string;
  subject: string;
  description: string;
  city: string;
  province: string;
  specialty: string;
  stage: string;
  status: string;
  budget: string | null;
  progress: number;
  urgency: string;
  feeAgreed: string | null;
  contractStatus: string;
  contractCode: string;
  contractSignedAt: string | null;
  createdAt: string | null;
};

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/**
 * فضای کاری واحد پرونده برای موکل و وکیل.
 * دسترسی: موکل صاحب پرونده (تلفن تماس یا حساب کاربری) یا همکاران پلتفرم.
 */
export default async function CaseWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isStaff = user.role !== "client";
  const roleLabel = user.role === "client" ? "موکل" : user.role === "lawyer" ? "وکیل" : user.role === "admin" ? "ادمین" : "همکار";
  const dashboardHref = isStaff ? "/dashboard/lawyer" : "/dashboard/client";

  const shellNav = isStaff
    ? [
        { label: "داشبورد وکیل", icon: "home" as const, href: "/dashboard/lawyer" },
        { label: "فضای کاری پرونده", icon: "folder" as const, active: true },
        { label: "پنل موکل", icon: "user" as const, href: "/dashboard/client" },
      ]
    : [
        { label: "داشبورد", icon: "home" as const, href: "/dashboard/client" },
        { label: "پرونده‌های من", icon: "folder" as const, href: "/dashboard/cases" },
        { label: "فضای کاری پرونده", icon: "gavel" as const, active: true },
        { label: "پیام‌ها", icon: "chat" as const, href: "/dashboard/client#messages" },
        { label: "پرداخت و اقساط", icon: "money" as const, href: "/dashboard/client#payments" },
        { label: "تقویم", icon: "calendar" as const, href: "/dashboard/client#calendar" },
      ];

  /* ---------------- خواندن پرونده (شناسهٔ عددی یا شمارهٔ پرونده) ---------------- */
  let row: typeof cases.$inferSelect | null = null;
  try {
    if (/^\d+$/.test(id)) {
      const rows = await db.select().from(cases).where(eq(cases.id, Number(id))).limit(1);
      row = rows[0] ?? null;
    }
    if (!row) {
      const rows = await db.select().from(cases).where(eq(cases.caseNumber, id)).limit(1);
      row = rows[0] ?? null;
    }
  } catch {
    row = null;
  }

  const isClientOwner = !!row && (row.contactPhone === user.phone || (!!row.clientUserPhone && row.clientUserPhone === user.phone));

  if (!row || (!isClientOwner && !isStaff)) {
    return (
      <DashboardShell
        role={roleLabel}
        title="فضای کاری پرونده"
        userName={user.name}
        userRole={roleLabel}
        nav={shellNav}
      >
        <Card hover={false} className="py-10 text-center">
          <Icon name="lock" className="mx-auto h-10 w-10 text-muted" />
          <h2 className="mt-3 font-bold text-foreground">دسترسی به این پرونده ممکن نیست</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
            پرونده‌ای با این شناسه پیدا نشد یا این پرونده به حساب شما متصل نیست. از فهرست «پرونده‌های من» پروندهٔ خود را باز کنید.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button href="/dashboard/cases" icon="folder">پرونده‌های من</Button>
            <Link
              href="/case/new"
              className="btn-gold inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold"
            >
              <Icon name="plus" className="h-4 w-4" /> ثبت پرونده جدید
            </Link>
          </div>
        </Card>
      </DashboardShell>
    );
  }

  /* ---------------- داده‌های اولیهٔ فضای کاری (همه با حالت degraded) ---------------- */
  const caseId = row.id;

  let lawyerLite: LawyerLite | null = null;
  let lawyerDirectory: LawyerLite[] = [];
  let events: EventItem[] = [];
  let messages: MessageItem[] = [];
  let unreadCount = 0;
  let installmentsList: InstallmentItem[] = [];
  let credits: CreditItem[] = [];
  let proposals: ProposalItem[] = [];

  try {
    if (row.assignedLawyerId) {
      const lw = await db
        .select({ id: lawyers.id, slug: lawyers.slug, name: lawyers.name, title: lawyers.title, rating: lawyers.rating })
        .from(lawyers)
        .where(eq(lawyers.id, row.assignedLawyerId))
        .limit(1);
      lawyerLite = lw[0] ?? null;
    }

    lawyerDirectory = await db
      .select({ id: lawyers.id, slug: lawyers.slug, name: lawyers.name, title: lawyers.title, rating: lawyers.rating })
      .from(lawyers)
      .orderBy(lawyers.name)
      .limit(200);

    const evRows = await db
      .select()
      .from(caseEvents)
      .where(and(eq(caseEvents.caseId, caseId), eq(caseEvents.visibleToClient, true)))
      .orderBy(desc(caseEvents.createdAt))
      .limit(100);
    events = evRows
      .slice()
      .reverse()
      .map((e) => ({
        id: e.id,
        actor: e.actor,
        actorName: e.actorName,
        title: e.title,
        description: e.description,
        progress: e.progress,
        createdAt: iso(e.createdAt),
      }));

    const msgRows = await db
      .select()
      .from(caseMessages)
      .where(eq(caseMessages.caseId, caseId))
      .orderBy(desc(caseMessages.createdAt))
      .limit(200);
    messages = msgRows
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        senderName: m.senderName,
        body: m.body,
        createdAt: iso(m.createdAt),
      }));
    try {
      const unreadRows = await db
        .select({ id: caseMessages.id })
        .from(caseMessages)
        .where(
          and(
            eq(caseMessages.caseId, caseId),
            isNull(caseMessages.readAt),
            isStaff ? eq(caseMessages.senderRole, "client") : ne(caseMessages.senderRole, "client"),
          ),
        )
        .limit(200);
      unreadCount = unreadRows.length;
    } catch {
      unreadCount = 0;
    }

    const instRows = await db
      .select()
      .from(installments)
      .where(eq(installments.caseId, caseId))
      .orderBy(asc(installments.number));
    installmentsList = instRows.map((i) => ({
      id: i.id,
      number: i.number,
      amount: String(i.amount),
      dueDate: iso(i.dueDate),
      status: i.status,
      source: i.source,
      paidAt: iso(i.paidAt),
      trackingCode: i.trackingCode,
    }));

    const creditRows = await db
      .select()
      .from(creditRequests)
      .where(eq(creditRequests.caseId, caseId))
      .orderBy(desc(creditRequests.createdAt))
      .limit(20);
    credits = creditRows.map((c) => ({
      id: c.id,
      provider: c.provider,
      amount: String(c.amount),
      months: c.months,
      status: c.status,
      statusDetail: c.statusDetail,
      referenceCode: c.referenceCode,
      createdAt: iso(c.createdAt),
    }));

    const propRows = await db
      .select()
      .from(caseProposals)
      .where(eq(caseProposals.caseId, caseId))
      .orderBy(desc(caseProposals.createdAt))
      .limit(30);
    proposals = propRows.map((p) => ({
      id: p.id,
      lawyerId: p.lawyerId,
      amount: String(p.amount),
      note: p.note,
      durationMonths: p.durationMonths,
      status: p.status,
      aiMatchScore: p.aiMatchScore,
      createdAt: iso(p.createdAt),
    }));
  } catch {
    /* degraded — تب‌ها با دادهٔ خالی رندر می‌شوند */
  }

  const kase: WorkspaceCase = {
    id: row.id,
    caseNumber: row.caseNumber,
    subject: row.subject,
    description: row.description,
    city: row.city,
    province: row.province,
    specialty: row.specialty,
    stage: row.stage,
    status: row.status,
    budget: row.budget,
    progress: row.progress,
    urgency: row.urgency,
    feeAgreed: row.feeAgreed ? String(row.feeAgreed) : null,
    contractStatus: row.contractStatus,
    contractCode: row.contractCode,
    contractSignedAt: iso(row.contractSignedAt),
    createdAt: iso(row.createdAt),
  };

  const initialTab: Tab = TABS.includes((tabParam ?? "") as Tab) ? ((tabParam ?? "overview") as Tab) : "overview";

  return (
    <DashboardShell
      role={roleLabel}
      title="فضای کاری پرونده"
      subtitle={`${row.subject} — همهٔ بخش‌های پرونده در یک نگاه`}
      userName={user.name}
      userRole={roleLabel}
      nav={shellNav}
    >
      <CaseWorkspace
        viewerRole={isStaff ? "lawyer" : "client"}
        kase={kase}
        lawyer={lawyerLite}
        events={events}
        messages={messages}
        unreadCount={unreadCount}
        installments={installmentsList}
        credits={credits}
        proposals={proposals}
        lawyers={lawyerDirectory}
        initialTab={initialTab}
      />
    </DashboardShell>
  );
}
