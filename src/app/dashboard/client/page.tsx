import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cases, consultations, lawyers } from "@/db/schema";
import { appointments, caseMessages, installments } from "@/db/schema-marketplace";
import { DashboardShell, StatCard, Progress, StatusBadge } from "@/components/dashboard-shell";
import { Icon } from "@/components/icons";
import { toFa, formatToman, formatJalaliLong, formatTime, timeAgo, labelStatus } from "@/lib/money";
import { getCurrentUser } from "@/lib/user-auth";
import { nextActionForCase } from "@/lib/case-facts";
import DocumentsManager from "@/components/documents-manager";

export const metadata: Metadata = {
  title: "پنل موکل — دادپیو",
  description: "داشبورد موکل دادپیو: پرونده‌های من، مشاوره سریع، پیام‌ها، تقویم اقدامات، پرداخت و اقساط و اسناد.",
};

export const dynamic = "force-dynamic";

const CONSULT_TYPE_FA: Record<string, string> = { chat: "متنی", voice: "تلفنی", video: "تصویری" };
const CONSULT_STATUS_FA: Record<string, string> = {
  pending: "در انتظار تأیید",
  payment_pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  confirmed: "تأییدشده",
  scheduled: "زمان‌بندی‌شده",
  in_progress: "در حال برگزاری",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
  expired: "منقضی‌شده",
  refunded: "بازگشت وجه",
};

const QUICK_CONSULT = [
  {
    icon: "chat" as const,
    title: "مشاوره متنی",
    desc: "پرسش حقوقی خود را بنویسید و پاسخ کتبی وکیل متخصص را دریافت کنید.",
  },
  {
    icon: "phone" as const,
    title: "مشاوره تلفنی",
    desc: "گفتگوی مستقیم با وکیل؛ بدون نیاز به مراجعه حضوری و در سریع‌ترین زمان.",
  },
  {
    icon: "video" as const,
    title: "مشاوره تصویری",
    desc: "جلسه آنلاین با وکیل و امکان بررسی اسناد به‌صورت زنده و امن.",
  },
];

export default async function ClientDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const phone = user.phone;

  /* ---------------- داده‌های داشبورد (همه با حالت degraded) ---------------- */
  type CaseRow = typeof cases.$inferSelect & { lawyerName: string | null; lawyerSlug: string | null };
  let myCases: CaseRow[] = [];
  let myConsults: (typeof consultations.$inferSelect)[] = [];
  let latestMessages: { id: number; caseId: number; senderName: string; body: string; createdAt: Date | null }[] = [];
  let upcoming: (typeof appointments.$inferSelect)[] = [];
  let nextInstallments: (typeof installments.$inferSelect)[] = [];
  let unread = 0;

  try {
    myCases = await db
      .select({ case: cases, lawyerName: lawyers.name, lawyerSlug: lawyers.slug })
      .from(cases)
      .leftJoin(lawyers, eq(cases.assignedLawyerId, lawyers.id))
      .where(or(eq(cases.contactPhone, phone), eq(cases.clientUserPhone, phone)))
      .orderBy(desc(cases.createdAt))
      .limit(50)
      .then((rows) => rows.map((r) => ({ ...r.case, lawyerName: r.lawyerName, lawyerSlug: r.lawyerSlug })));
  } catch {
    myCases = [];
  }
  const caseIds = myCases.map((c) => c.id);
  const subjectMap = new Map(myCases.map((c) => [c.id, c.subject] as const));

  try {
    myConsults = await db
      .select()
      .from(consultations)
      .where(eq(consultations.clientPhone, phone))
      .orderBy(desc(consultations.createdAt))
      .limit(6);
  } catch {
    myConsults = [];
  }

  if (caseIds.length > 0) {
    try {
      latestMessages = await db
        .select({
          id: caseMessages.id,
          caseId: caseMessages.caseId,
          senderName: caseMessages.senderName,
          body: caseMessages.body,
          createdAt: caseMessages.createdAt,
        })
        .from(caseMessages)
        .where(inArray(caseMessages.caseId, caseIds))
        .orderBy(desc(caseMessages.createdAt))
        .limit(8);
    } catch {
      latestMessages = [];
    }
    try {
      const unreadRows = await db
        .select({ id: caseMessages.id })
        .from(caseMessages)
        .where(
          and(
            inArray(caseMessages.caseId, caseIds),
            ne(caseMessages.senderRole, "client"),
            isNull(caseMessages.readAt),
          ),
        )
        .limit(100);
      unread = unreadRows.length;
    } catch {
      unread = 0;
    }
    try {
      nextInstallments = await db
        .select()
        .from(installments)
        .where(
          and(
            inArray(installments.caseId, caseIds),
            or(eq(installments.status, "pending"), eq(installments.status, "late")),
          ),
        )
        .orderBy(asc(installments.dueDate))
        .limit(12);
    } catch {
      nextInstallments = [];
    }
  }

  try {
    upcoming = caseIds.length
      ? await db
          .select()
          .from(appointments)
          .where(
            and(
              or(eq(appointments.clientPhone, phone), inArray(appointments.caseId, caseIds)),
              gte(appointments.startsAt, sql`now() - interval '1 day'`),
            ),
          )
          .orderBy(asc(appointments.startsAt))
          .limit(6)
      : await db
          .select()
          .from(appointments)
          .where(and(eq(appointments.clientPhone, phone), gte(appointments.startsAt, sql`now() - interval '1 day'`)))
          .orderBy(asc(appointments.startsAt))
          .limit(6);
  } catch {
    upcoming = [];
  }

  /* ---------------- مشتقات ---------------- */
  const activeCases = myCases.filter((c) => c.status !== "closed").length;
  const latestCase = myCases[0] ?? null;
  const nextAction = latestCase
    ? nextActionForCase(latestCase.stage, latestCase.status)
    : myConsults.length > 0
      ? { action: "در انتظار تأیید مشاوره", detail: "کارشناسان برای تأیید نوبت مشاوره شما تماس می‌گیرند؛ وضعیت را از بخش مشاوره‌ها دنبال کنید.", href: "/consultation" }
      : { action: "اقدام بعدی شما: ثبت اولین پرونده", detail: "هنوز پرونده‌ای ثبت نکرده‌اید. با ثبت پرونده، پرونده شما تحلیل هوشمند می‌شود و پیشنهاد قیمت وکلای متخصص را دریافت می‌کنید.", href: "/case/new" };

  const nextInstallment = nextInstallments[0] ?? null;
  const contractCase = myCases.find((c) => c.contractStatus && c.contractStatus !== "none") ?? null;
  const caseForPayments = (nextInstallment?.caseId ?? null) ?? (contractCase?.id ?? latestCase?.id ?? null);

  const shellNav = [
    { label: "داشبورد", icon: "home" as const, active: true, href: "/dashboard/client" },
    { label: "پرونده‌های من", icon: "folder" as const, badge: myCases.length > 0 ? toFa(myCases.length) : undefined, href: "/dashboard/cases" },
    { label: "مشاوره‌های من", icon: "chat" as const, href: "/dashboard/client#consultations" },
    { label: "پیام‌ها", icon: "send" as const, badge: unread > 0 ? toFa(unread) : undefined, href: "/dashboard/client#messages" },
    { label: "پرداخت و اقساط", icon: "money" as const, href: "/dashboard/client#payments" },
    { label: "تقویم", icon: "calendar" as const, href: "/dashboard/client#calendar" },
    { label: "اسناد", icon: "document" as const, href: "/dashboard/client#documents" },
    { label: "تنظیمات", icon: "id" as const, href: "/dashboard/client#settings" },
  ];

  return (
    <DashboardShell
      role="موکل"
      title="داشبورد موکل"
      subtitle={`خوش آمدید، ${user.name} — خلاصهٔ وضعیت پرونده‌ها، مشاوره‌ها و پرداخت‌های شما`}
      userName={user.name}
      userRole="موکل"
      nav={shellNav}
      actions={
        <Link
          href="/case/new"
          className="btn-gold inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-bold"
        >
          <Icon name="plus" className="h-4 w-4" />
          پرونده جدید
        </Link>
      }
    >
      {/* ================= کارت‌های آمار ================= */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="پرونده‌های فعال"
          value={toFa(activeCases)}
          hint={myCases.length > 0 ? `از مجموع ${toFa(myCases.length)} پرونده` : "هنوز پرونده‌ای ثبت نکرده‌اید"}
          icon="folder"
        />
        <StatCard label="مشاوره‌های من" value={toFa(myConsults.length)} hint="متنی، تلفنی و تصویری" icon="chat" />
        <StatCard
          label="پیام‌های خوانده‌نشده"
          value={toFa(unread)}
          hint={unread > 0 ? "پاسخ جدید در گفتگوی پرونده‌ها" : "همه پیام‌ها خوانده شده‌اند"}
          tone={unread > 0 ? "danger" : "default"}
          icon="send"
        />
        <StatCard label="نمره اعتماد" value={toFa("4.8")} hint="امتیاز اعتماد شما در دادپیو" tone="gold" icon="star" />
      </div>

      {/* ================= اقدام بعدی هوشمند ================= */}
      <section aria-labelledby="dp-next-h" className="rounded-2xl border border-accent/30 bg-accent-soft/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p id="dp-next-h" className="flex items-center gap-1.5 text-xs font-bold text-accent">
              <Icon name="bolt" className="h-4 w-4" /> اقدام بعدی شما
            </p>
            <h2 className="mt-1 font-bold text-foreground">{nextAction.action}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-7 text-foreground-soft">{nextAction.detail}</p>
          </div>
          {nextAction.href && (
            <Link
              href={nextAction.href}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              انجام بده <Icon name="arrow" className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>

      {/* ================= پرونده‌های من ================= */}
      <section aria-labelledby="dp-cases-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="dp-cases-h" className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="folder" className="h-5 w-5 text-accent" /> پرونده‌های من
          </h2>
          <Link href="/dashboard/cases" className="inline-flex h-9 items-center text-xs font-semibold text-primary transition-colors hover:text-accent">
            مشاهده همه
          </Link>
        </div>

        {myCases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
            <Icon name="folder" className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-sm font-semibold text-foreground">هنوز پرونده‌ای ثبت نکرده‌اید</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-6 text-muted">
              موضوع حقوقی خود را ثبت کنید؛ پرونده شما تحلیل هوشمند می‌شود و وکلای متخصص پیشنهاد قیمت ارسال می‌کنند.
            </p>
            <Link href="/case/new" className="btn-gold mt-4 inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold">
              <Icon name="plus" className="h-4 w-4" /> ثبت اولین پرونده
            </Link>
          </div>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto pl-1">
            {myCases.map((c) => {
              const st = labelStatus("case", c.status);
              const contractSt = labelStatus("contract", c.contractStatus);
              const pendingProposalsBadge = !c.assignedLawyerId;
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/cases/${c.id}`}
                  className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-bold text-foreground">{c.subject}</p>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
                      <span>پیشرفت پرونده</span>
                      <span className="font-bold text-accent">{toFa(c.progress)}٪</span>
                    </div>
                    <Progress value={c.progress} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">{c.specialty}</span>
                    {c.assignedLawyerId && c.lawyerName ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-foreground-soft">
                        <Icon name="gavel" className="h-3 w-3" /> وکیل: {c.lawyerName}
                      </span>
                    ) : (
                      pendingProposalsBadge && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan/15 px-2.5 py-1 font-semibold text-[#1d7a8c]">
                          <Icon name="mail" className="h-3 w-3" /> در انتظار انتخاب وکیل از پیشنهادها
                        </span>
                      )
                    )}
                    {c.feeAgreed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-foreground-soft">
                        <Icon name="money" className="h-3 w-3 text-accent" /> حق‌الوکاله: <b className="dp-money">{formatToman(c.feeAgreed)}</b>
                      </span>
                    )}
                    {c.contractStatus !== "none" && (
                      <StatusBadge tone={contractSt.tone}>{contractSt.label}</StatusBadge>
                    )}
                    <span className="mr-auto flex items-center gap-1 text-muted">
                      <Icon name="location" className="h-3 w-3" /> {c.city}
                      <span className="mx-1">·</span>
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= مشاوره سریع + مشاوره‌های من ================= */}
      <section id="consultations" aria-labelledby="dp-consult-h" className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 id="dp-consult-h" className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="sparkles" className="h-5 w-5 text-accent" /> مشاوره سریع
          </h2>
          <p className="mt-1 text-xs text-muted">با وکلای تأییدشدهٔ دادپیو گفتگو کنید؛ رزرو در چند دقیقه.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {QUICK_CONSULT.map((q) => (
              <Link
                key={q.title}
                href="/consultation"
                className="group flex min-h-44 flex-col rounded-2xl border border-border bg-surface-2/30 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft/30"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon name={q.icon} className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-bold text-foreground">{q.title}</p>
                <p className="mt-1 flex-1 text-[11px] leading-5 text-muted">{q.desc}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent">
                  رزرو مشاوره <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="chat" className="h-5 w-5 text-accent" /> مشاوره‌های اخیر
          </h2>
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pl-1">
            {myConsults.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs leading-6 text-muted">
                مشاوره‌ای ثبت نکرده‌اید. از کارت‌های «مشاوره سریع» شروع کنید.
              </p>
            ) : (
              myConsults.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-foreground-soft">
                    <Icon name={c.type === "video" ? "video" : c.type === "voice" ? "phone" : "chat"} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.subject}</p>
                    <p className="text-[11px] text-muted">
                      {CONSULT_TYPE_FA[c.type] ?? c.type} · {timeAgo(c.createdAt)}
                    </p>
                  </div>
                  <StatusBadge tone={c.status === "completed" ? "green" : c.status === "cancelled" ? "red" : "gold"}>
                    {CONSULT_STATUS_FA[c.status] ?? c.status}
                  </StatusBadge>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ================= پیام‌ها + تقویم اقدامات ================= */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section id="messages" aria-labelledby="dp-msgs-h" className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 id="dp-msgs-h" className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="send" className="h-5 w-5 text-accent" /> آخرین پیام‌ها
            {unread > 0 && <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">{toFa(unread)} خوانده‌نشده</span>}
          </h2>
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pl-1">
            {latestMessages.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs leading-6 text-muted">
                هنوز گفتگویی ثبت نشده است. پیام‌های شما و وکیل پرونده در همین بخش نمایش داده می‌شود.
              </p>
            ) : (
              latestMessages.map((m) => (
                <Link
                  key={m.id}
                  href={`/dashboard/cases/${m.caseId}?tab=messages`}
                  className="block rounded-xl border border-border p-3 transition-colors hover:border-accent/40 hover:bg-surface-2/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-foreground">
                      <Icon name="user" className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="truncate">{m.senderName || "کاربر"}</span>
                    </p>
                    <span className="shrink-0 text-[10px] text-muted">{timeAgo(m.createdAt)}</span>
                  </div>
                  <p className="mt-1 truncate text-[13px] text-foreground-soft">{m.body}</p>
                  <p className="mt-1 truncate text-[10px] text-muted">پرونده: {subjectMap.get(m.caseId) ?? "—"}</p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section id="calendar" aria-labelledby="dp-cal-h" className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 id="dp-cal-h" className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="calendar" className="h-5 w-5 text-accent" /> تقویم اقدامات
          </h2>
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pl-1">
            {upcoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs leading-6 text-muted">
                جلسه یا مهلتی در روزهای آینده ثبت نشده است؛ وقت‌های رسیدگی و مهلت‌های قانونی پرونده‌های شما همین‌جا نمایش داده می‌شود.
              </p>
            ) : (
              upcoming.map((a) => {
                const ks = labelStatus("appointment", a.kind);
                return (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-foreground-soft">
                      <Icon name={a.kind === "hearing" ? "gavel" : a.kind === "consultation" ? "video" : a.kind === "deadline" ? "alert" : "check"} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-foreground">{a.title}</p>
                        <StatusBadge tone={ks.tone}>{ks.label}</StatusBadge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        {formatJalaliLong(a.startsAt)} · ساعت {formatTime(a.startsAt)}
                        {a.location ? ` · ${a.location}` : ""}
                      </p>
                      {a.caseId && subjectMap.has(a.caseId) && (
                        <Link href={`/dashboard/cases/${a.caseId}`} className="mt-0.5 inline-block truncate text-[10px] text-primary hover:text-accent">
                          پرونده: {subjectMap.get(a.caseId)}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ================= پرداخت و اقساط ================= */}
      <section id="payments" aria-labelledby="dp-pay-h" className="scroll-mt-24">
        <h2 id="dp-pay-h" className="mb-3 flex items-center gap-2 font-bold text-foreground">
          <Icon name="money" className="h-5 w-5 text-accent" /> پرداخت و اقساط
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* قسط بعدی */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Icon name="clock" className="h-4 w-4 text-accent" /> قسط بعدی
            </p>
            {nextInstallment ? (
              <>
                <p className="dp-money mt-3 text-2xl font-extrabold">{formatToman(nextInstallment.amount)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{nextInstallment.number === 0 ? "پیش‌پرداخت حق‌الوکاله" : `قسط شماره ${toFa(nextInstallment.number)}`}</span>
                  <span>·</span>
                  <span>سرسید: {formatJalaliLong(nextInstallment.dueDate)}</span>
                  {(() => {
                    const s = labelStatus("installment", nextInstallment.status);
                    return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
                  })()}
                </div>
                {nextInstallments.length > 1 && (
                  <p className="mt-1 text-[11px] text-muted">{toFa(nextInstallments.length)} قسط پرداخت‌نشده در برنامهٔ فعلی</p>
                )}
              </>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-xs leading-6 text-muted">
                قسط پرداخت‌نشده‌ای وجود ندارد. پس از توافق حق‌الوکاله و تنظیم قرارداد، برنامهٔ پرداخت همین‌جا نمایش داده می‌شود.
              </p>
            )}
            {caseForPayments && (
              <Link
                href={`/dashboard/cases/${caseForPayments}?tab=payments`}
                className="mt-4 inline-flex h-11 items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 text-xs font-bold text-foreground transition-colors hover:bg-surface-2"
              >
                مشاهده برنامهٔ اقساط <Icon name="arrow" className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {/* قرارداد و تأمین اعتبار */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Icon name="stamp" className="h-4 w-4 text-accent" /> وضعیت قرارداد
            </p>
            {contractCase ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(() => {
                  const s = labelStatus("contract", contractCase.contractStatus);
                  return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
                })()}
                {contractCase.feeAgreed && (
                  <span className="text-xs text-muted">
                    مبلغ قرارداد: <b className="dp-money">{formatToman(contractCase.feeAgreed)}</b>
                  </span>
                )}
                {contractCase.contractSignedAt && (
                  <span className="text-xs text-muted">امضا: {formatJalaliLong(contractCase.contractSignedAt)}</span>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs leading-6 text-muted">
                هنوز قراردادی برای پرونده‌های شما صادر نشده است؛ پس از پذیرش پیشنهاد وکیل، قرارداد الکترونیکی صادر می‌شود.
              </p>
            )}

            <div className="mt-4 rounded-xl bg-surface-2/50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground-soft">
                <Icon name="landmark" className="h-4 w-4 text-accent" /> تأمین اعتبار حق‌الوکاله
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                هزینهٔ وکالت را می‌توانید اقساطی بپردازید (ازکی‌وام یا بانک همکار). نرخ و شرایط نهایی از پنل تأمین‌کننده اعلام می‌شود.
              </p>
              {caseForPayments ? (
                <Link
                  href={`/dashboard/cases/${caseForPayments}?tab=payments`}
                  className="btn-gold mt-3 inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-bold"
                >
                  <Icon name="landmark" className="h-4 w-4" /> درخواست اعتبار (ازکی‌وام)
                </Link>
              ) : (
                <p className="mt-2 text-[11px] text-muted">برای ثبت درخواست اعتبار، ابتدا یک پرونده ثبت کنید.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= اسناد ================= */}
      <section id="documents" aria-labelledby="dp-doc-h" className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 id="dp-doc-h" className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="document" className="h-5 w-5 text-accent" /> اسناد و مدارک من
        </h2>
        <DocumentsManager />
      </section>

      {/* ================= تنظیمات ================= */}
      <section id="settings" aria-labelledby="dp-set-h" className="scroll-mt-24 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 id="dp-set-h" className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="id" className="h-5 w-5 text-accent" /> تنظیمات حساب
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted">نام و نام خانوادگی</p>
            <p className="mt-1 text-sm font-bold text-foreground">{user.name}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted">شمارهٔ موبایل (شناسهٔ ورود)</p>
            <p className="mt-1 text-sm font-bold text-foreground" dir="ltr">
              {toFa(user.phone)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/support"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border-strong bg-surface px-4 text-xs font-bold text-foreground transition-colors hover:bg-surface-2"
          >
            <Icon name="mail" className="h-4 w-4" /> پشتیبانی و تیکت جدید
          </Link>
          <a
            href="/api/auth/logout"
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/5 px-4 text-xs font-bold text-danger transition-colors hover:bg-danger/10"
          >
            <Icon name="x" className="h-4 w-4" /> خروج از حساب
          </a>
        </div>
      </section>

      {/* ================= CTA بزرگ ================= */}
      <section
        aria-labelledby="dp-cta-h"
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg sm:p-8"
        style={{ background: "linear-gradient(135deg, #101b35 0%, #17264a 100%)" }}
      >
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full opacity-10" style={{ background: "#d5a84c" }} aria-hidden />
        <div className="absolute -bottom-12 left-1/3 h-44 w-44 rounded-full opacity-10" style={{ background: "#7fd8ee" }} aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <h2 id="dp-cta-h" className="text-lg font-extrabold sm:text-xl">پرونده حقوقی دارید؟ همین حالا شروع کنید</h2>
            <p className="mt-2 text-[13px] leading-7 text-white/70">
              پرونده شما به‌صورت هوشمند تحلیل و به وکلای متخصص همان حوزه ارسال می‌شود؛ پیشنهاد قیمت‌ها را مقایسه کنید
              و با قرارداد الکترونیکی امن شروع کنید.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/60">
              <span className="rounded-full bg-white/10 px-2.5 py-1">تحلیل هوشمند رایگان اولیه</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">فقط وکلای تأییدشده</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1">امکان پرداخت اقساطی</span>
            </div>
          </div>
          <Link
            href="/case/new"
            className="btn-gold inline-flex h-12 shrink-0 items-center gap-2 rounded-xl px-6 text-sm font-extrabold"
          >
            <Icon name="plus" className="h-5 w-5" /> ثبت پرونده جدید
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
