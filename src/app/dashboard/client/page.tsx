import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases, consultations, tickets } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { nextActionForCase } from "@/lib/case-facts";
import DocumentsManager from "@/components/documents-manager";
import Link from "next/link";
export const metadata: Metadata = {
  title: "پنل موکل — داشبورد حقوقی من",
  description: "مدیریت پرونده‌ها، مشاوره‌ها، اسناد، قراردادها، پرداخت‌ها و پیام‌های شما.",
};
export const dynamic = "force-dynamic";
export default async function ClientDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const phone = user.phone;

  let myCases: typeof cases.$inferSelect[] = [];
  let myConsults: typeof consultations.$inferSelect[] = [];
  let myTickets: typeof tickets.$inferSelect[] = [];
  try {
    [myCases, myConsults, myTickets] = await Promise.all([
      db.select().from(cases).where(eq(cases.contactPhone, phone)).orderBy(desc(cases.createdAt)).limit(5),
      db.select().from(consultations).where(eq(consultations.clientPhone, phone)).orderBy(desc(consultations.createdAt)).limit(5),
      db.select().from(tickets).where(eq(tickets.phone, phone)).orderBy(desc(tickets.createdAt)).limit(5),
    ]);
  } catch {
    /* degraded mode */
  }

  const stats = [
    { label: "پرونده‌های من", value: faNum(myCases.length), icon: "folder" as const, tone: "primary" as const },
    { label: "مشاوره‌های من", value: faNum(myConsults.length), icon: "chat" as const, tone: "accent" as const },
    { label: "تیکت‌های پشتیبانی", value: faNum(myTickets.length), icon: "mail" as const, tone: "success" as const },
    { label: "خوش آمدید", value: user.name.split(" ")[0], icon: "user" as const, tone: "neutral" as const },
  ];

  // Next Action — command centre: derived from the newest real case/consultation
  const latestCase = myCases[0] ?? null;
  const nextAction = latestCase
    ? nextActionForCase(latestCase.stage, latestCase.status)
    : myConsults.length > 0
      ? { action: "در انتظار تأیید مشاوره", detail: "کارشناسان برای تأیید نوبت مشاوره شما تماس می‌گیرند. از کد پیگیری در «پیگیری» وضعیت را ببینید.", href: "/track-case" }
      : { action: "اقدام بعدی شما: شروع اولین درخواست", detail: "هنوز پرونده یا مشاوره‌ای ثبت نکرده‌اید؛ از مسیر سریع شروع کنید تا بهترین اقدام مشخص شود.", href: "/#quickstart" };

  const recentItems = [
    ...myCases.map((c) => ({ kind: "پرونده", title: c.subject, meta: c.caseNumber + " • " + c.city, tone: "primary" as const })),
    ...myConsults.map((c) => ({ kind: "مشاوره", title: c.subject, meta: c.type + " • " + c.status, tone: "accent" as const })),
    ...myTickets.map((t) => ({ kind: "تیکت", title: t.message.slice(0, 60), meta: t.ticketNumber + " • " + t.status, tone: "neutral" as const })),
  ].slice(0, 6);

  return (
    <DashboardShell
      role="موکل"
      title={`داشبورد حقوقی ${user.name}`}
      nav={[
        { label: "نمای کلی", icon: "home", active: true, href: "/dashboard/client" },
        { label: "پرونده‌های من", icon: "folder", badge: faNum(myCases.length), href: "/dashboard/cases" },
        { label: "مشاوره‌های من", icon: "chat", badge: faNum(myConsults.length), href: "/dashboard/client" },
        { label: "پیگیری پرونده", icon: "search", href: "/track-case" },
        { label: "اسناد و مدارک", icon: "document", href: "/dashboard/client" },
        { label: "رزرو مشاوره", icon: "calendar", href: "/consultation" },
        { label: "ثبت پرونده جدید", icon: "folder", href: "/case/new" },
        { label: "پیام‌ها و پشتیبانی", icon: "mail", badge: faNum(myTickets.length), href: "/support" },
      ]}
    >
      {/* اقدام بعدی — Command Center */}
      <Card hover={false} className="border-primary/30 bg-primary-soft/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-accent">اقدام بعدی شما</p>
            <h2 className="mt-1 font-bold text-foreground">{nextAction.action}</h2>
            <p className="mt-1 text-sm leading-7 text-foreground-soft">{nextAction.detail}</p>
          </div>
          {("href" in nextAction) && nextAction.href && (
            <Button href={nextAction.href} size="sm" icon="arrow" className="shrink-0">
              انجام بده
            </Button>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} hover={false} className="flex items-center gap-3">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
              s.tone === "primary" ? "bg-primary-soft text-primary" :
              s.tone === "accent" ? "bg-accent-soft text-accent" :
              s.tone === "success" ? "bg-success/15 text-success" : "bg-surface-2 text-foreground-soft"
            }`}>
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Cases */}
        <Card hover={false}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="folder" className="h-5 w-5 text-primary" /> پرونده‌های من</h2>
            <Link href="/case/new" className="text-xs font-medium text-primary hover:text-primary-hover">+ پرونده جدید</Link>
          </div>
          <div className="mt-4 space-y-3">
            {myCases.length > 0 ? myCases.map((c) => (
              <Link key={c.id} href={`/dashboard/cases/${c.caseNumber}`} className="block rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-2/60">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{c.subject}</p>
                  <span className="font-mono text-xs text-muted" dir="ltr">{c.caseNumber}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone="primary">{c.stage}</Badge>
                  <Badge tone="success">{c.status}</Badge>
                  <span className="mr-auto text-xs text-muted">{c.city}</span>
                </div>
              </Link>
            )) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                هنوز پرونده‌ای ثبت نکرده‌اید.
                <Link href="/case/new" className="mr-2 text-primary hover:text-primary-hover">ثبت اولین پرونده</Link>
              </div>
            )}
          </div>
        </Card>
        {/* Recent activity */}
        <Card hover={false}>
          <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="clock" className="h-5 w-5 text-accent" /> فعالیت‌های اخیر</h2>
          <div className="mt-4 space-y-2">
            {recentItems.length > 0 ? recentItems.map((m, i) => (
              <div key={i} className="flex gap-3 rounded-xl p-2.5 bg-surface-2/50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.tone === "primary" ? "bg-primary" : m.tone === "accent" ? "bg-accent" : "bg-foreground-soft"}`} />
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{m.title}</p>
                    <span className="shrink-0 text-[10px] text-muted">{m.kind}</span>
                  </div>
                  <p className="truncate text-xs text-muted" dir="ltr">{m.meta}</p>
                </div>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">هنوز فعالیتی ثبت نشده است.</p>
            )}
          </div>
        </Card>
      </div>
      {/* Tickets */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card hover={false}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="mail" className="h-5 w-5 text-success" /> تیکت‌های پشتیبانی</h2>
            <Link href="/contact" className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary"><Icon name="plus" className="h-3.5 w-3.5" /> تیکت جدید</Link>
          </div>
          <div className="mt-4 space-y-2">
            {myTickets.length > 0 ? myTickets.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-foreground-soft"><Icon name="chat" className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{t.message}</p>
                  <p className="text-xs text-muted" dir="ltr">{t.ticketNumber} • {t.category}</p>
                </div>
                <Badge tone={t.status === "open" ? "primary" : "success"}>{t.status === "open" ? "باز" : "بسته"}</Badge>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">تیکتی ثبت نکرده‌اید. برای ارتباط با پشتیبانی <Link href="/contact" className="text-primary hover:underline">اینجا</Link> کلیک کنید.</p>
            )}
          </div>
        </Card>
        <Card hover={false}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="chat" className="h-5 w-5 text-accent" /> مشاوره‌های من</h2>
            <Link href="/consultation" className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"><Icon name="calendar" className="h-3.5 w-3.5" /> رزرو مشاوره</Link>
          </div>
          <div className="mt-4 space-y-2">
            {myConsults.length > 0 ? myConsults.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-foreground-soft"><Icon name="calendar" className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.subject}</p>
                  <p className="text-xs text-muted" dir="ltr">{c.type} • {c.duration} دقیقه</p>
                </div>
                <Badge tone="accent">{c.status}</Badge>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">مشاوره‌ای ثبت نکرده‌اید. <Link href="/consultation" className="text-accent hover:underline">رزرو مشاوره آنلاین</Link></p>
            )}
          </div>
        </Card>
      </div>
      {/* Documents */}
      <Card hover={false}>
        <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="document" className="h-5 w-5 text-success" /> اسناد و مدارک من</h2>
        <DocumentsManager />
      </Card>
    </DashboardShell>
  );
}
