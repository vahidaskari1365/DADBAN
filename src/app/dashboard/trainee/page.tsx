import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { caseEvents, appointments } from "@/db/schema-marketplace";
import { count, desc, eq, gte, isNotNull, or } from "drizzle-orm";
import { DashboardShell, StatCard, Progress, StatusBadge } from "@/components/dashboard-shell";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { toFa, formatJalaliLong, formatTime, timeAgo, labelStatus } from "@/lib/money";
import TraineeActionForm from "./trainee-action-form";

export const metadata: Metadata = {
  title: "پنل کارآموز — کارتابل ارجاعی دادپیو",
  description: "کارتابل کارآموزان و همکاران حقوقی دادپیو: پرونده‌های ارجاعی، ثبت اقدام، مهلت‌ها و مسیر یادگیری.",
};
export const dynamic = "force-dynamic";

export default async function TraineeDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  /* ---------------- داده‌ها (همه try/catch — حالت بدون دیتابیس امن است) ---------------- */
  type ReferredCase = {
    id: number;
    caseNumber: string;
    subject: string;
    specialty: string;
    city: string;
    status: string;
    progress: number;
    urgency: string;
  };

  let referred: ReferredCase[] = [];
  let demo = false;
  let myActions: {
    id: number;
    caseId: number;
    title: string;
    description: string;
    visibleToClient: boolean;
    createdAt: Date;
    caseSubject: string | null;
  }[] = [];
  let actionsTotal = 0;
  let upcoming: {
    id: number;
    caseId: number | null;
    title: string;
    kind: string;
    location: string;
    startsAt: Date;
  }[] = [];

  try {
    const assignedRows = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        subject: cases.subject,
        specialty: cases.specialty,
        city: cases.city,
        status: cases.status,
        progress: cases.progress,
        urgency: cases.urgency,
      })
      .from(cases)
      .where(isNotNull(cases.assignedLawyerId))
      .orderBy(desc(cases.createdAt))
      .limit(10);

    referred = Array.isArray(assignedRows) ? assignedRows : [];
    if (referred.length === 0) {
      demo = true;
      const activeRows = await db
        .select({
          id: cases.id,
          caseNumber: cases.caseNumber,
          subject: cases.subject,
          specialty: cases.specialty,
          city: cases.city,
          status: cases.status,
          progress: cases.progress,
          urgency: cases.urgency,
        })
        .from(cases)
        .where(or(eq(cases.status, "active"), eq(cases.status, "matched")))
        .orderBy(desc(cases.createdAt))
        .limit(10);
      referred = Array.isArray(activeRows) ? activeRows : [];
    }

    const events = await db
      .select({
        id: caseEvents.id,
        caseId: caseEvents.caseId,
        title: caseEvents.title,
        description: caseEvents.description,
        visibleToClient: caseEvents.visibleToClient,
        createdAt: caseEvents.createdAt,
        caseSubject: cases.subject,
      })
      .from(caseEvents)
      .leftJoin(cases, eq(caseEvents.caseId, cases.id))
      .where(or(eq(caseEvents.actorName, user.name), eq(caseEvents.actor, "trainee")))
      .orderBy(desc(caseEvents.createdAt))
      .limit(8);
    myActions = Array.isArray(events) ? events : [];

    const [total] = await db
      .select({ v: count() })
      .from(caseEvents)
      .where(or(eq(caseEvents.actorName, user.name), eq(caseEvents.actor, "trainee")));
    actionsTotal = Number(total?.v ?? myActions.length);

    const appts = await db
      .select({
        id: appointments.id,
        caseId: appointments.caseId,
        title: appointments.title,
        kind: appointments.kind,
        location: appointments.location,
        startsAt: appointments.startsAt,
      })
      .from(appointments)
      .where(gte(appointments.startsAt, new Date(Date.now() - 24 * 3600 * 1000)))
      .orderBy(appointments.startsAt)
      .limit(8);
    upcoming = Array.isArray(appts) ? appts : [];
  } catch {
    /* حالت تنزل‌یافته — بدون دیتابیس */
  }

  const deadlineCount = upcoming.filter((a) => a.kind === "deadline" || a.kind === "hearing").length;

  const nav = [
    { label: "داشبورد", icon: "home" as const, active: true, href: "/dashboard/trainee" },
    { label: "پرونده‌های ارجاعی", icon: "folder" as const, badge: toFa(referred.length), href: "/dashboard/trainee#cases" },
    { label: "اقدامات ثبت‌شده", icon: "check" as const, badge: toFa(actionsTotal), href: "/dashboard/trainee#actions" },
    { label: "مدارک", icon: "document" as const, href: "/dashboard/documents" },
    { label: "یادگیری", icon: "book" as const, href: "/knowledge" },
    { label: "تنظیمات", icon: "id" as const, href: "/dashboard/trainee#settings" },
  ];

  return (
    <DashboardShell
      role="کارآموز"
      title={`کارتابل ارجاعی ${user.name}`}
      subtitle="پرونده‌های ارجاعی سرپرست تیم، ثبت اقدام در روند پرونده و مهلت‌های پیش‌رو"
      userName={user.name}
      userRole="کارآموز حقوقی"
      nav={nav}
    >
      {/* ---------------- آمار ---------------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="پرونده‌های ارجاعی"
          value={toFa(referred.length)}
          hint={demo ? "حالت نمایشی — پرونده‌های فعال بازار" : "ارجاع‌شده از سرپرست تیم"}
          icon="folder"
        />
        <StatCard label="اقدامات ثبت‌شدهٔ من" value={toFa(actionsTotal)} hint="در روند پرونده‌ها" tone="gold" icon="check" />
        <StatCard
          label="مهلت‌های نزدیک"
          value={toFa(deadlineCount)}
          hint="جلسه رسیدگی و مهلت قانونی"
          tone={deadlineCount > 0 ? "danger" : "default"}
          icon="clock"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ---------------- ستون اصلی: پرونده‌های ارجاعی ---------------- */}
        <div id="cases" className="scroll-mt-24 lg:col-span-2">
          <Card hover={false}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
                <Icon name="folder" className="h-4.5 w-4.5 text-accent" />
                پرونده‌های ارجاعی
              </h2>
              {demo && (
                <StatusBadge tone="cyan">حالت نمایشی — همهٔ پرونده‌های فعال</StatusBadge>
              )}
            </div>
            <div className="max-h-96 space-y-3 overflow-y-auto pl-1">
              {referred.length === 0 && (
                <p className="rounded-xl bg-surface-2/60 p-4 text-sm text-muted">
                  هنوز پرونده‌ای به شما ارجاع نشده است. هنگام ارجاع سرپرست، اینجا نمایش داده می‌شود.
                </p>
              )}
              {referred.map((c) => {
                const st = labelStatus("case", c.status);
                const urgent = c.urgency === "high";
                return (
                  <div key={c.id} className="rounded-xl border border-border p-4 transition-colors hover:border-border-strong">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-foreground">{c.subject}</h3>
                        <p className="mt-1 text-[11px] text-muted">
                          {c.caseNumber} · {c.specialty} · {c.city}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {urgent && <StatusBadge tone="red">فوری</StatusBadge>}
                        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={c.progress} />
                      <span className="shrink-0 text-[11px] font-bold text-foreground-soft">{toFa(c.progress)}٪</span>
                      <Link
                        href={`/dashboard/cases/${c.id}`}
                        className="btn-gold shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold"
                      >
                        ورود به کارتابل
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ---------------- ستون کنار: ثبت اقدام ---------------- */}
        <div id="actions" className="scroll-mt-24">
          <Card hover={false}>
            <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
              <Icon name="plus" className="h-4.5 w-4.5 text-accent" />
              ثبت اقدام در پرونده
            </h2>
            <TraineeActionForm
              cases={referred.map((c) => ({ id: c.id, label: `${c.subject} (${c.caseNumber})` }))}
              actorName={user.name}
            />
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ---------------- اقدامات ثبت‌شدهٔ من ---------------- */}
        <Card hover={false}>
          <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
            <Icon name="check" className="h-4.5 w-4.5 text-success" />
            آخرین اقدامات ثبت‌شدهٔ من
          </h2>
          <div className="dp-timeline max-h-96 space-y-5 overflow-y-auto pr-1">
            {myActions.length === 0 && (
              <p className="text-sm text-muted">هنوز اقدامی ثبت نکرده‌اید. از فرم «ثبت اقدام» شروع کنید.</p>
            )}
            {myActions.map((ev) => (
              <div key={ev.id} className="dp-timeline-item done relative pr-8">
                <span className="dp-timeline-dot" aria-hidden="true" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-[13px] text-foreground">{ev.title}</b>
                  <small className="text-[11px] text-muted">{timeAgo(ev.createdAt)}</small>
                </div>
                <p className="mt-1 text-xs leading-6 text-muted">
                  {ev.caseSubject ? `پرونده: ${ev.caseSubject}` : `شناسه پرونده: ${toFa(ev.caseId)}`}
                  {ev.description ? ` — ${ev.description}` : ""}
                </p>
                <div className="mt-1.5">
                  <StatusBadge tone={ev.visibleToClient ? "green" : "gray"}>
                    {ev.visibleToClient ? "قابل مشاهده برای موکل" : "داخلی"}
                  </StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ---------------- مهلت‌ها و جلسات ---------------- */}
        <div id="schedule" className="scroll-mt-24">
          <Card hover={false}>
            <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
              <Icon name="calendar" className="h-4.5 w-4.5 text-danger" />
              مهلت‌ها و جلسات پیش‌رو
            </h2>
            <div className="max-h-96 space-y-3 overflow-y-auto pl-1">
              {upcoming.length === 0 && (
                <p className="text-sm text-muted">جلسه یا مهلتی در روزهای آینده ثبت نشده است.</p>
              )}
              {upcoming.map((a) => {
                const k = labelStatus("appointment", a.kind);
                return (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3.5">
                    <div className="min-w-0">
                      <b className="block truncate text-[13px] text-foreground">{a.title}</b>
                      <p className="mt-1 text-[11px] text-muted">
                        {formatJalaliLong(a.startsAt)} · ساعت {formatTime(a.startsAt)}
                        {a.location ? ` · ${a.location}` : ""}
                      </p>
                    </div>
                    <StatusBadge tone={k.tone}>{k.label}</StatusBadge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ---------------- در حال یادگیری ---------------- */}
      <div id="learning" className="mt-6 scroll-mt-24">
        <Card hover={false}>
          <h2 className="mb-1 flex items-center gap-2 text-base font-extrabold text-foreground">
            <Icon name="book" className="h-4.5 w-4.5 text-accent" />
            در حال یادگیری — آکادمی دادپیو
          </h2>
          <p className="mb-4 text-sm text-muted">مسیرهای پیشنهادی برای ارتقای مهارت‌های حقوقی و ابزارهای هوش مصنوعی</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: "sparkles" as const,
                title: "مسیرهای هوش مصنوعی",
                desc: "۱۸ پروژهٔ آموزشی AI در ۶ مسیر — از دستیار حقوقی تا تحلیل اسناد",
                href: "/ai/resources",
                cta: "مشاهدهٔ مسیرها",
              },
              {
                icon: "book" as const,
                title: "مقالات آکادمی",
                desc: "مطالب آموزشی حقوقی دادپیو برای کارآموزان و همکاران",
                href: "/knowledge",
                cta: "ورود به آکادمی",
              },
              {
                icon: "scale" as const,
                title: "پرونده‌های نمونه",
                desc: "تحلیل پرونده‌های فعال بازار و الگوبرداری از روند وکلا",
                href: "/dashboard/trainee#cases",
                cta: "کارتابل پرونده‌ها",
              },
            ].map((it) => (
              <Link
                key={it.title}
                href={it.href}
                className="group rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon name={it.icon} className="h-5 w-5" />
                </span>
                <b className="mt-3 block text-sm font-bold text-foreground">{it.title}</b>
                <p className="mt-1 text-xs leading-6 text-muted">{it.desc}</p>
                <span className="mt-2 inline-block text-xs font-bold text-accent group-hover:underline">{it.cta} ←</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ---------------- تنظیمات / حساب ---------------- */}
      <div id="settings" className="mt-6 scroll-mt-24">
        <Card hover={false}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-foreground">
            <Icon name="id" className="h-4.5 w-4.5 text-muted" />
            حساب و تنظیمات
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary">{user.name}</span>
            <span className="text-xs text-muted" dir="ltr">
              {user.phone}
            </span>
            <StatusBadge tone="gold">کارآموز حقوقی</StatusBadge>
            <a
              href="/api/auth/logout"
              className="mr-auto rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-danger transition-colors hover:bg-danger/10"
            >
              خروج از حساب
            </a>
          </div>
          <p className="mt-3 text-xs leading-6 text-muted">
            محدودهٔ دسترسی شما: پرونده‌های ارجاعی و ثبت اقدام — تغییر نقش و سطوح دسترسی توسط سرپرست تیم از پنل مدیریت انجام می‌شود.
          </p>
        </Card>
      </div>
    </DashboardShell>
  );
}
