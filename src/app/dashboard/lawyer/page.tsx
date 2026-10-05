import { formatJalaliLong as faDate } from "@/lib/jalali";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases, consultations, tickets, payments, serviceRequests, managedServices, users, teamCaseAssignments } from "@/db/schema";
import { desc, eq, inArray, notInArray } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice, CONSULT_TYPE_FA } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { StatusBadge, UrgencyBadge } from "@/components/managed";
import { CASE_STATUS_FA } from "@/lib/case-facts";
import { LAWYER_HIDDEN_STATUSES } from "@/lib/managed-services";
import { CaseOffersPanel } from "@/components/lawyer/case-offers-panel";
import { TeamPanel } from "@/components/lawyer/team-panel";
import { RemindersPanel } from "@/components/lawyer/reminders-panel";
import Link from "next/link";

export const metadata: Metadata = {
  title: "پنل وکیل — داشبورد مدیریت",
  description: "درخواست‌های موکلان، پرونده‌ها، نوبت‌های مشاوره، تیم و یادآورها برای وکلای دادبان.",
};
export const dynamic = "force-dynamic";

type NavItem = { label: string; icon: "home" | "badge" | "briefcase" | "user" | "chat" | "shield" | "mail" | "clock" | "folder"; active?: boolean; badge?: string; href?: string };
type Tone = "primary" | "accent" | "success" | "neutral";

/** چیپ آیکونی رنگی — پایهٔ گرافیک کارت‌های پنل */
function IconChip({ icon, tone, size = "md" }: { icon: IconKey; tone: Tone; size?: "sm" | "md" }) {
  const tones: Record<Tone, string> = {
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent-text",
    success: "bg-success/15 text-success",
    neutral: "bg-surface-2 text-foreground-soft",
  };
  const sizes = size === "sm" ? "h-9 w-9 rounded-lg" : "h-11 w-11 rounded-xl";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${sizes} ${tones[tone]}`}>
      <Icon name={icon} className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
}

export default async function LawyerDashboard() {
  await ensureProfileSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isBoss = user.role === "lawyer";
  const isTeam = user.role === "team";
  if (!isBoss && !isTeam) redirect("/dashboard/client");

  const lawyerId = isBoss ? user.lawyerId : user.parentLawyerId;
  const linked = !!lawyerId;
  const perms = (user.teamPermissions ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const can = (p: string) => (isBoss ? true : perms.includes(p));

  // هر کوئری مستقل است تا خطای یک بخش، بقیه داشبورد را خالی نکند (درس E2E:
  // خطای کوئری payments کل داشبورد را خالی می‌کرد و «هیچی» نشان می‌داد).
  let allCases: typeof cases.$inferSelect[] = [];
  let myConsults: typeof consultations.$inferSelect[] = [];
  let openTickets = 0;
  let verifiedRevenue = 0;
  let serviceReqs: { req: typeof serviceRequests.$inferSelect; serviceTitle: string | null; clientName: string | null }[] = [];
  let teamMembersCount = 0;

  try {
    if (isTeam && perms.includes("cases")) {
      // عضو تیم فقط پرونده‌های سپرده‌شده به خودش را می‌بیند؛ اگر چیزی سپرده نشده باشد لیست خالی است
      const assigned = await db
        .select({ caseId: teamCaseAssignments.caseId })
        .from(teamCaseAssignments)
        .where(eq(teamCaseAssignments.memberUserId, user.id));
      allCases = assigned.length
        ? await db
            .select()
            .from(cases)
            .where(inArray(cases.id, assigned.map((a) => a.caseId)))
            .orderBy(desc(cases.createdAt))
            .limit(8)
        : [];
    } else if (isBoss) {
      [allCases] = await Promise.all([db.select().from(cases).orderBy(desc(cases.createdAt)).limit(8)]);
    }
  } catch (err) {
    console.error("[dadban] lawyer dashboard: cases query failed:", err);
  }
  try {
    // نوبت‌های وکیلِ خودِ کاربر؛ در نبود اتصال، نمای کل پلتفرم حفظ می‌شود
    myConsults = linked
      ? await db.select().from(consultations).where(eq(consultations.lawyerId, lawyerId as number)).orderBy(desc(consultations.createdAt)).limit(20)
      : await db.select().from(consultations).orderBy(desc(consultations.createdAt)).limit(20);
  } catch (err) {
    console.error("[dadban] lawyer dashboard: consultations query failed:", err);
  }
  try {
    const t = await db.select().from(tickets);
    openTickets = t.filter((x) => x.status === "open").length;
  } catch (err) {
    console.error("[dadban] lawyer dashboard: tickets query failed:", err);
  }
  try {
    const payRows = await db.select().from(payments).where(inArray(payments.status, ["verified"])).limit(200);
    verifiedRevenue = payRows.reduce((s, p) => s + p.amount, 0);
  } catch (err) {
    console.error("[dadban] lawyer dashboard: payments query failed:", err);
  }
  try {
    if (can("services")) {
      serviceReqs = await db
        .select({
          req: serviceRequests,
          serviceTitle: managedServices.title,
          clientName: users.name,
        })
        .from(serviceRequests)
        .leftJoin(managedServices, eq(serviceRequests.serviceId, managedServices.id))
        .leftJoin(users, eq(serviceRequests.userId, users.id))
        .where(notInArray(serviceRequests.status, [...LAWYER_HIDDEN_STATUSES]))
        .orderBy(desc(serviceRequests.createdAt))
        .limit(8);
    }
  } catch (err) {
    console.error("[dadban] lawyer dashboard: service requests query failed:", err);
  }
  try {
    if (isBoss && linked) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.parentLawyerId, lawyerId as number));
      teamMembersCount = rows.length;
    }
  } catch (err) {
    console.error("[dadban] lawyer dashboard: team query failed:", err);
  }

  const activeCases = allCases.filter((c) => c.status !== "closed");
  const pendingRequests = myConsults.filter((c) => c.status === "pending");
  const scheduled = myConsults.filter(
    (c) => c.startsAt && !["cancelled", "expired", "refunded"].includes(c.status),
  );

  const stats: { label: string; value: string; icon: IconKey; tone: Tone }[] = [];
  if (can("cases")) stats.push({ label: isTeam ? "پرونده‌های سپرده‌شده به شما" : "پرونده‌های اخیر پلتفرم", value: faNum(activeCases.length), icon: "folder", tone: "primary" });
  if (can("consultations")) stats.push({ label: "درخواست‌های مشاوره در انتظار", value: faNum(pendingRequests.length), icon: "mail", tone: "accent" });
  if (can("services")) stats.push({ label: "درخواست‌های خدمات فعال", value: faNum(serviceReqs.filter((r) => !["COMPLETED", "DELIVERED"].includes(r.req.status)).length), icon: "briefcase", tone: "success" });
  if (can("reminders")) stats.push({ label: isBoss && teamMembersCount ? "اعضای تیم" : "یادآورهای باز", value: faNum(isBoss ? teamMembersCount : 0), icon: "user", tone: "neutral" });

  const toneTile: Record<Tone, string> = {
    primary: "from-primary-soft/90 via-surface to-surface hover:border-primary/40",
    accent: "from-accent-soft/80 via-surface to-surface hover:border-accent/40",
    success: "from-success/10 via-surface to-surface hover:border-success/40",
    neutral: "from-surface-2/80 via-surface to-surface hover:border-border-strong",
  };

  /** دستورهای سریع وکیل — با فیلتر دسترسی */
  const quickActions: { label: string; desc: string; icon: IconKey; tone: Tone; href: string }[] = [
    ...(isBoss ? [{ label: "پروفایل حرفه‌ای", desc: "ویرایش اطلاعات عمومی", icon: "badge" as IconKey, tone: "primary" as Tone, href: "/dashboard/lawyer/profile" }] : []),
    ...(can("consultations") ? [{ label: "کارتابل مشاوره", desc: "درخواست‌های زنده و آنلاین‌شدن", icon: "chat" as IconKey, tone: "accent" as Tone, href: "/consultation/live" }] : []),
    { label: "دایرکتوری وکلا", desc: "جستجوی همکاران", icon: "search", tone: "primary", href: "/lawyers" },
    { label: "پرسش‌های موکلان", desc: "پاسخ‌دهی تخصصی", icon: "shield", tone: "success", href: "/qa" },
    { label: "پشتیبانی", desc: "تیکت و پیام", icon: "mail", tone: "neutral", href: "/support" },
  ];

  const nav: NavItem[] = [
    { label: "نمای کلی", icon: "home", active: true, href: "/dashboard/lawyer" },
    ...(isBoss ? [{ label: "پروفایل حرفه‌ای من", icon: "badge" as const, href: "/dashboard/lawyer/profile" }] : []),
    ...(can("offers") ? [{ label: "پیشنهادهای پرونده", icon: "mail" as const, href: "/dashboard/lawyer#offers" }] : []),
    ...(can("services") ? [{ label: "درخواست‌های خدمات", icon: "briefcase" as const, badge: serviceReqs.length ? faNum(serviceReqs.length) : undefined, href: "/dashboard/lawyer#services" }] : []),
    ...(can("reminders") ? [{ label: "یادآورها", icon: "clock" as const, href: "/dashboard/lawyer#reminders" }] : []),
    ...(isBoss ? [{ label: "تیم من", icon: "user" as const, href: "/dashboard/lawyer#team" }] : []),
    { label: "دایرکتوری وکلا", icon: "user", href: "/lawyers" },
    { label: "پشتیبانی", icon: "shield", href: "/support" },
  ];

  const showConsultCards = can("consultations");
  const showCasesCard = can("cases");

  return (
    <DashboardShell
      role="وکیل"
      title={isTeam ? "پنل همکاران" : "پنل مدیریت وکالت"}
      name={user.name}
      nav={nav}
    >
      {/* خلاصه وضعیت — نوار گرافیکی با داده‌های واقعی */}
      <Card hover={false} className="relative overflow-hidden border-accent/25 bg-gradient-to-l from-accent-soft/60 via-surface to-surface">
        <span aria-hidden className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-primary-soft/80 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <IconChip icon={isTeam ? "shield" : "mail"} tone={isTeam ? "neutral" : "accent"} />
            <p className="min-w-0 text-sm leading-7 text-foreground-soft">
              {isTeam
                ? <>دسترسی شما توسط وکیل تعیین شده است؛ فقط بخش‌های مجاز نمایش داده می‌شود.</>
                : pendingRequests.length > 0
                  ? <><b className="text-foreground">{faNum(pendingRequests.length)} درخواست مشاوره</b> در انتظار بررسی است.</>
                  : <>در حال حاضر <b className="text-foreground">درخواست مشاورهٔ در انتظاری</b> ثبت نشده است.</>}
            </p>
          </div>
          {isBoss && (
            <>
              <span aria-hidden className="hidden h-10 w-px bg-border sm:block" />
              <div className="flex items-center gap-3">
                <IconChip icon="money" tone="success" />
                <div>
                  <p className="text-[11px] text-muted">تسویه تأییدشده (واقعی)</p>
                  <p className="text-lg font-extrabold text-foreground">{faPrice(verifiedRevenue)}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Stats — کاشی‌های گرادیانی */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 [&>*]:min-w-0">
          {stats.map((s) => (
            <Card key={s.label} hover={false} className={`flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-bl p-4 ${toneTile[s.tone]}`}>
              <IconChip icon={s.icon} tone={s.tone} />
              <div>
                <p className="text-xl font-extrabold text-foreground">{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* دستورهای سریع وکیل — کاشی‌های گرافیکی */}
      <section aria-label="دسترسی سریع وکیل">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground-soft">
          <Icon name="bolt" className="h-4 w-4 text-accent-text" /> دسترسی سریع
        </h2>
        <div data-testid="quick-actions" className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*]:min-w-0">
          {quickActions.map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className="group flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex items-center justify-between">
                <IconChip icon={q.icon} tone={q.tone} />
                <Icon name="chevron" className="h-4 w-4 rotate-180 text-muted transition-all group-hover:-translate-x-1 group-hover:text-primary" />
              </span>
              <span>
                <span className="block text-sm font-bold text-foreground">{q.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted">{q.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* اتصال حساب به پروفایل حرفه‌ای — CTA صادقانه (فقط خود وکیل) */}
      {isBoss && !linked && (
        <Card hover={false} className="border-accent/30 bg-accent-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-accent-text">گام بعدی برای وکلا</p>
              <h3 className="mt-1 font-bold text-foreground">حساب شما به پروفایل حرفه‌ای متصل نیست</h3>
              <p className="mt-1 text-sm leading-7 text-foreground-soft">
                با اتصال حساب، پروفایل عمومی‌تان را ویرایش کنید: تخصص‌ها، خدمات، تعرفه مشاوره متنی/صوتی/تصویری و استان.
              </p>
            </div>
            <a
              href="/dashboard/lawyer/profile"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-colors hover:bg-accent-hover"
            >
              تکمیل پروفایل حرفه‌ای
            </a>
          </div>
        </Card>
      )}

      {/* پیشنهادهای پروندهٔ استان — broadcast موکل‌ها */}
      {can("offers") && <CaseOffersPanel />}

      {/* درخواست‌های خدمات — با موضوع و جزئیات کامل */}
      {can("services") && (
        <Card hover={false} id="services" className="scroll-mt-20">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="briefcase" className="h-5 w-5 text-primary" /> درخواست‌های خدمات موکلان
            </h2>
            {serviceReqs.length > 0 && <Badge tone="primary">{faNum(serviceReqs.length)} مورد اخیر</Badge>}
          </div>
          <div className="mt-4 space-y-3">
            {serviceReqs.length > 0 ? serviceReqs.map(({ req, serviceTitle, clientName }) => (
              <a key={req.id} href={`/dashboard/services/${req.id}`} className="block rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-2/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{req.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {serviceTitle ?? "خدمت"} • موکل: {clientName ?? "—"} • <span className="font-mono" dir="ltr">{req.requestNumber}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      {req.city && <span className="inline-flex items-center gap-1"><Icon name="location" className="h-3 w-3" />{req.city}</span>}
                      {req.caseNumber && <span dir="ltr" className="font-mono">{req.caseNumber}</span>}
                      <span>{faDate(req.createdAt)}</span>
                      {req.price ? <span>{faPrice(req.price)}</span> : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <UrgencyBadge urgency={req.urgency} />
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              </a>
            )) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                درخواست خدمتی ثبت نشده است؛ به‌محض ثبت توسط موکل، موضوع و جزئیات آن همین‌جا نمایش داده می‌شود.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* یادآورها */}
      {can("reminders") && <RemindersPanel />}

      {/* ساخت تیم — فقط خود وکیل */}
      {isBoss && <TeamPanel />}

      {showConsultCards && (
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
          {/* New consultation requests — real pending consultations */}
          <Card hover={false}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-foreground">
                <Icon name="mail" className="h-5 w-5 text-accent-text" /> درخواست‌های مشاوره جدید
              </h2>
              {pendingRequests.length > 0 && <Badge tone="accent">{faNum(pendingRequests.length)} مورد</Badge>}
            </div>
            <div className="mt-4 space-y-3">
              {pendingRequests.length > 0 ? pendingRequests.slice(0, 4).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
                  <IconChip icon={r.type === "video" ? "video" : r.type === "voice" ? "phone" : "chat"} tone="accent" size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{r.clientName}</p>
                      <Badge tone="primary">{CONSULT_TYPE_FA[r.type] ?? r.type}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {r.subject.slice(0, 60)} • {faPrice(Number(r.price ?? 0))}
                    </p>
                  </div>
                  <span className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] text-muted">
                    در انتظار بررسی کارشناس
                  </span>
                </div>
              )) : (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                  درخواست مشاوره‌ای در صف نیست؛ به‌محض ثبت، این‌جا نمایش داده می‌شود.
                </p>
              )}
            </div>
          </Card>

          {/* Upcoming schedule — real booked slots */}
          <Card hover={false}>
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="calendar" className="h-5 w-5 text-primary" /> نوبت‌های آینده
            </h2>
            <div className="mt-4 space-y-2">
              {scheduled.length > 0 ? scheduled.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <IconChip icon={c.type === "video" ? "video" : c.type === "chat" ? "chat" : "phone"} tone="primary" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{c.subject}</p>
                    <p className="text-xs text-muted">
                      {c.startsAt ? faDate(c.startsAt) : "زمان در حال هماهنگی"} • {c.clientName}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                  نوبت قطعی‌شده‌ای وجود ندارد.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* پرونده‌ها — وکیل: همهٔ پلتفرم / عضو تیم: فقط پرونده‌های سپرده‌شده */}
      {showCasesCard && (
        <Card hover={false}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="folder" className="h-5 w-5 text-primary" /> {isTeam ? "پرونده‌های سپرده‌شده به شما" : "پرونده‌های اخیر پلتفرم"}
            </h2>
            {allCases.length > 0 && <Badge tone="primary">{faNum(allCases.length)} مورد اخیر</Badge>}
          </div>
          <div className="mt-4 space-y-3">
            {allCases.length > 0 ? allCases.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{c.subject}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    <span className="font-mono" dir="ltr">{c.caseNumber}</span> • {c.city} • {faDate(c.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="primary">{c.stage}</Badge>
                  <Badge tone="success">{CASE_STATUS_FA[c.status] ?? c.status}</Badge>
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                {isTeam
                  ? "هنوز پرونده‌ای به شما سپرده نشده است؛ وکیل از بخش «تیم من» پرونده‌ها را به شما واگذار می‌کند."
                  : "پرونده‌ای ثبت نشده است؛ به‌محض ثبت موکل، موضوع و مرحله آن همین‌جا نمایش داده می‌شود."}
              </p>
            )}
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
