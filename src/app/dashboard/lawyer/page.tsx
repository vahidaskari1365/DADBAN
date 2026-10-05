import { formatJalaliLong as faDate } from "@/lib/jalali";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases, consultations, tickets, payments, serviceRequests, managedServices, users } from "@/db/schema";
import { desc, eq, inArray, notInArray } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice, CONSULT_TYPE_FA } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { StatusBadge, UrgencyBadge } from "@/components/managed";
import { CASE_STATUS_FA } from "@/lib/case-facts";
import { LAWYER_HIDDEN_STATUSES } from "@/lib/managed-services";

export const metadata: Metadata = {
  title: "پنل وکیل — داشبورد مدیریت",
  description: "درخواست‌های موکلان، پرونده‌ها، نوبت‌های مشاوره و وضعیت واقعی عملیات پلتفرم برای وکلای دادبان.",
};
export const dynamic = "force-dynamic";

export default async function LawyerDashboard() {
  await ensureProfileSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const linked = user.role === "lawyer" && !!user.lawyerId;

  // هر کوئری مستقل است تا خطای یک بخش، بقیه داشبورد را خالی نکند (درس E2E:
  // خطای کوئری payments کل داشبورد را خالی می‌کرد و «هیچی» نشان می‌داد).
  let allCases: typeof cases.$inferSelect[] = [];
  let myConsults: typeof consultations.$inferSelect[] = [];
  let openTickets = 0;
  let verifiedRevenue = 0;
  let serviceReqs: { req: typeof serviceRequests.$inferSelect; serviceTitle: string | null; clientName: string | null }[] = [];

  try {
    [allCases] = await Promise.all([db.select().from(cases).orderBy(desc(cases.createdAt)).limit(8)]);
  } catch (err) {
    console.error("[dadban] lawyer dashboard: cases query failed:", err);
  }
  try {
    // نوبت‌های وکیلِ خودِ کاربر؛ در نبود اتصال، نمای کل پلتفرم حفظ می‌شود
    myConsults = linked
      ? await db.select().from(consultations).where(eq(consultations.lawyerId, user.lawyerId as number)).orderBy(desc(consultations.createdAt)).limit(20)
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
    // درخواست‌های خدمات («پیگیری و انجام امور») که موکلان ثبت کرده‌اند —
    // وکیل همه درخواست‌های زنده را می‌بیند (پیش‌نویس/لغو/رد خصوصی می‌ماند).
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
  } catch (err) {
    console.error("[dadban] lawyer dashboard: service requests query failed:", err);
  }

  const allConsults = myConsults;

  const activeCases = allCases.filter((c) => c.status !== "closed");
  const pendingRequests = allConsults.filter((c) => c.status === "pending");
  const scheduled = allConsults.filter(
    (c) => c.startsAt && !["cancelled", "expired", "refunded"].includes(c.status),
  );

  const stats = [
    { label: "پرونده‌های اخیر پلتفرم", value: faNum(activeCases.length), icon: "folder" as const },
    { label: "درخواست‌های مشاوره در انتظار", value: faNum(pendingRequests.length), icon: "mail" as const },
    { label: "درخواست‌های خدمات فعال", value: faNum(serviceReqs.filter((r) => !["COMPLETED", "DELIVERED"].includes(r.req.status)).length), icon: "briefcase" as const },
    { label: "نوبت‌های ثبت‌شده", value: faNum(scheduled.length), icon: "calendar" as const },
  ];

  return (
    <DashboardShell
      role="وکیل"
      title={`داشبورد وکیل — ${user.name}`}
      nav={[
        { label: "نمای کلی", icon: "home", active: true, href: "/dashboard/lawyer" },
        { label: "پروفایل حرفه‌ای من", icon: "badge", href: "/dashboard/lawyer/profile" },
        { label: "درخواست‌های خدمات", icon: "briefcase", badge: serviceReqs.length ? faNum(serviceReqs.length) : undefined, href: "/dashboard/lawyer" },
        { label: "دایرکتوری وکلا", icon: "user", href: "/lawyers" },
        { label: "پرسش‌های نیازمند پاسخ", icon: "chat", href: "/qa" },
        { label: "پشتیبانی", icon: "shield", href: "/support" },
      ]}
    >
      {/* Greeting — real identity, real counts, no fabricated numbers */}
      <Card hover={false} className="bg-gradient-to-l from-primary to-primary-hover text-primary-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">سلام، {user.name}</p>
            <h2 className="mt-1 text-xl font-bold">به پنل وکیل خوش آمدید</h2>
            <p className="mt-1 text-xs text-white/70">
              {pendingRequests.length > 0
                ? `${faNum(pendingRequests.length)} درخواست مشاوره در انتظار بررسی است.`
                : "در حال حاضر درخواست مشاوره در انتظاری ثبت نشده است."}
            </p>
          </div>
          <div className="text-left">
            <p className="text-xs text-white/70">تسویه تأییدشده (واقعی)</p>
            <p className="text-2xl font-extrabold">{faPrice(verifiedRevenue)}</p>
          </div>
        </div>
      </Card>

      {/* Stats — all real counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} hover={false} className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* اتصال حساب به پروفایل حرفه‌ای — CTA صادقانه */}
      {!linked && (
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

      {/* درخواست‌های خدمات — با موضوع و جزئیات کامل */}
      <Card hover={false}>
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

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
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
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name={c.type === "video" ? "video" : c.type === "chat" ? "chat" : "phone"} className="h-4 w-4" />
                </span>
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

      {/* پرونده‌های اخیر — با موضوع و مرحله (نمای واقعی برای هماهنگی وکیل) */}
      <Card hover={false}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="folder" className="h-5 w-5 text-primary" /> پرونده‌های اخیر پلتفرم
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
              پرونده‌ای ثبت نشده است؛ به‌محض ثبت موکل، موضوع و مرحله آن همین‌جا نمایش داده می‌شود.
            </p>
          )}
        </div>
      </Card>
    </DashboardShell>
  );
}
