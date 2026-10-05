import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases, consultations, tickets } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, CONSULT_STATUS_FA, CONSULT_TYPE_FA } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { nextActionForCase, CASE_STATUS_FA, CASE_STAGE_FLOW } from "@/lib/case-facts";
import DocumentsManager from "@/components/documents-manager";
import Link from "next/link";
export const metadata: Metadata = {
  title: "پنل موکل — داشبورد حقوقی من",
  description: "مدیریت پرونده‌ها، مشاوره‌ها، اسناد، قراردادها، پرداخت‌ها و پیام‌های شما.",
};
export const dynamic = "force-dynamic";

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

export default async function ClientDashboard() {
  await ensureProfileSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // گارد نقش: وکیل/عضو تیم هرگز نباید پنل موکل را ببیند (باگ «هر یوزر میره پنل موکل»)
  if (isLawyerSideRole(user.role)) redirect("/dashboard/lawyer");
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

  const stats: { label: string; value: string; icon: IconKey; tone: Tone; href?: string }[] = [
    { label: "پرونده‌های من", value: faNum(myCases.length), icon: "folder", tone: "primary", href: "/dashboard/cases" },
    { label: "مشاوره‌های من", value: faNum(myConsults.length), icon: "chat", tone: "accent", href: "/consultation" },
    { label: "تیکت‌های پشتیبانی", value: faNum(myTickets.length), icon: "mail", tone: "success", href: "/support" },
    {
      label: user.province ? `استان شما: ${user.province}` : "استان شما",
      value: user.province ? "✓" : "تنظیم کنید",
      icon: "location",
      tone: "neutral",
      href: "/dashboard/client/profile",
    },
  ];

  /** دستورهای سریع — کاشی‌های گرافیکی مسیرهای پرکاربرد */
  const quickActions: { label: string; desc: string; icon: IconKey; tone: Tone; href: string }[] = [
    { label: "رزرو مشاوره", desc: "متنی، صوتی، تصویری", icon: "calendar", tone: "accent", href: "/consultation" },
    { label: "ثبت پرونده", desc: "ارزیابی اولیه رایگان", icon: "folder", tone: "primary", href: "/case/new" },
    { label: "دستیار حقوقی", desc: "پاسخ فوری با هوش مصنوعی", icon: "sparkles", tone: "accent", href: "/ai-assistant" },
    { label: "قرارداد و دادخواست", desc: "تنظیم تخصصی اسناد", icon: "file", tone: "primary", href: "/contracts" },
    { label: "پیگیری پرونده", desc: "با کد رهگیری", icon: "search", tone: "success", href: "/track-case" },
    { label: "پشتیبانی", desc: "تیکت و پیام به کارشناس", icon: "mail", tone: "neutral", href: "/support" },
  ];

  const toneTile: Record<Tone, string> = {
    primary: "from-primary-soft/90 via-surface to-surface hover:border-primary/40",
    accent: "from-accent-soft/80 via-surface to-surface hover:border-accent/40",
    success: "from-success/10 via-surface to-surface hover:border-success/40",
    neutral: "from-surface-2/80 via-surface to-surface hover:border-border-strong",
  };

  // Next Action — command centre: derived from the newest real case/consultation
  const latestCase = myCases[0] ?? null;
  const nextAction = latestCase
    ? nextActionForCase(latestCase.stage, latestCase.status)
    : myConsults.length > 0
      ? { action: "در انتظار تأیید مشاوره", detail: "کارشناسان برای تأیید نوبت مشاوره شما تماس می‌گیرند. از کد پیگیری در «پیگیری» وضعیت را ببینید.", href: "/track-case" }
      : { action: "اقدام بعدی شما: شروع اولین درخواست", detail: "هنوز پرونده یا مشاوره‌ای ثبت نکرده‌اید؛ از مسیر سریع شروع کنید تا بهترین اقدام مشخص شود.", href: "/case/new" };

  const recentItems = [
    ...myCases.map((c) => ({ kind: "پرونده", title: c.subject, meta: c.caseNumber + " • " + c.city, tone: "primary" as const })),
    ...myConsults.map((c) => ({ kind: "مشاوره", title: c.subject, meta: c.type + " • " + c.status, tone: "accent" as const })),
    ...myTickets.map((t) => ({ kind: "تیکت", title: t.message.slice(0, 60), meta: t.ticketNumber + " • " + t.status, tone: "neutral" as const })),
  ].slice(0, 6);

  return (
    <DashboardShell
      role="موکل"
      title="داشبورد حقوقی من"
      name={user.name}
      nav={[
        { label: "نمای کلی", icon: "home", active: true, href: "/dashboard/client" },
        { label: "پرونده‌های من", icon: "folder", badge: faNum(myCases.length), href: "/dashboard/cases" },
        { label: "مشاوره‌های من", icon: "chat", badge: faNum(myConsults.length), href: "/dashboard/client" },
        { label: "پیگیری پرونده", icon: "search", href: "/dashboard/cases" },
        { label: "درخواست‌های خدمات", icon: "briefcase", href: "/dashboard/services" },
        { label: "اسناد و مدارک", icon: "document", href: "/dashboard/client" },
        { label: "رزرو مشاوره", icon: "calendar", href: "/consultation" },
        { label: "ثبت پرونده جدید", icon: "folder", href: "/case/new" },
        { label: "پیگیری با کد رهگیری", icon: "location", href: "/track-case" },
        { label: "پیام‌ها و پشتیبانی", icon: "mail", badge: faNum(myTickets.length), href: "/support" },
        { label: "پروفایل من", icon: "user", href: "/dashboard/client/profile" },
      ]}
    >
      {/* اقدام بعدی — Command Center با نوار گرادیانی */}
      <Card hover={false} className="relative overflow-hidden border-primary/25 bg-gradient-to-l from-primary-soft/70 via-surface to-surface">
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-accent-soft/70 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <IconChip icon="bolt" tone="accent" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-accent-text">اقدام بعدی شما</p>
              <h2 className="mt-1 font-bold text-foreground">{nextAction.action}</h2>
              <p className="mt-1 text-sm leading-7 text-foreground-soft">{nextAction.detail}</p>
            </div>
          </div>
          {("href" in nextAction) && nextAction.href && (
            <Button href={nextAction.href} size="sm" icon="arrow" className="shrink-0">
              انجام بده
            </Button>
          )}
        </div>
      </Card>

      {/* Stats — کاشی‌های گرادیانی */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 [&>*]:min-w-0">
        {stats.map((s) => {
          const body = (
            <>
              <IconChip icon={s.icon} tone={s.tone} />
              <div className="min-w-0">
                <p className="truncate text-xl font-extrabold text-foreground">{s.value}</p>
                <p className="truncate text-xs text-muted">{s.label}</p>
              </div>
            </>
          );
          const cls = `flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-bl p-4 transition-all duration-200 ${toneTile[s.tone]}`;
          return s.href ? (
            <Link key={s.label} href={s.href} className="block rounded-2xl transition-transform hover:-translate-y-0.5">
              <Card hover={false} className={cls}>{body}</Card>
            </Link>
          ) : (
            <Card key={s.label} hover={false} className={cls}>{body}</Card>
          );
        })}
      </div>

      {/* دستورهای سریع — کاشی‌های گرافیکی */}
      <section aria-label="دسترسی سریع">
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

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
        {/* Cases — با نوار پیشرفت مرحله */}
        <Card hover={false}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="folder" className="h-5 w-5 text-primary" /> پرونده‌های من</h2>
            <Link href="/case/new" className="text-xs font-medium text-primary hover:text-primary-hover">+ پرونده جدید</Link>
          </div>
          <div className="mt-4 space-y-3">
            {myCases.length > 0 ? myCases.map((c) => {
              const idx = CASE_STAGE_FLOW.indexOf(c.stage as (typeof CASE_STAGE_FLOW)[number]);
              const stageIdx = idx === -1 ? 0 : idx;
              const pct = Math.round(((stageIdx + 1) / CASE_STAGE_FLOW.length) * 100);
              return (
                <Link key={c.id} href={`/dashboard/cases/${c.caseNumber}`} className="block rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-2/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{c.subject}</p>
                    <span className="shrink-0 font-mono text-xs text-muted" dir="ltr">{c.caseNumber}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{c.stage}</Badge>
                    <Badge tone="success">{CASE_STATUS_FA[c.status] ?? c.status}</Badge>
                    <span className="mr-auto text-xs text-muted">{c.city}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                      <span>مرحله {faNum(stageIdx + 1)} از {faNum(CASE_STAGE_FLOW.length)}</span>
                      <span className="font-bold text-primary">{faNum(pct)}٪</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-gradient-to-l from-primary to-primary-hover transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                هنوز پرونده‌ای ثبت نکرده‌اید.
                <Link href="/case/new" className="mr-2 text-primary hover:text-primary-hover">ثبت اولین پرونده</Link>
              </div>
            )}
          </div>
        </Card>

        {/* Recent activity — تایم‌لاین گرافیکی */}
        <Card hover={false}>
          <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="clock" className="h-5 w-5 text-accent-text" /> فعالیت‌های اخیر</h2>
          <div className="mt-4">
            {recentItems.length > 0 ? (
              <ol className="relative space-y-3 border-r-2 border-border pr-4">
                {recentItems.map((m, i) => (
                  <li key={i} className="relative rounded-xl bg-surface-2/50 p-2.5">
                    <span
                      className={`absolute -right-[23px] top-4 h-2.5 w-2.5 rounded-full ring-4 ring-background ${
                        m.tone === "primary" ? "bg-primary" : m.tone === "accent" ? "bg-accent" : "bg-foreground-soft"
                      }`}
                      aria-hidden
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{m.title}</p>
                      <span className="shrink-0 text-[10px] text-muted">{m.kind}</span>
                    </div>
                    <p className="truncate text-xs text-muted" dir="ltr">{m.meta}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">هنوز فعالیتی ثبت نشده است.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Tickets */}
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card hover={false}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="mail" className="h-5 w-5 text-success" /> تیکت‌های پشتیبانی</h2>
            <Link href="/contact" className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-soft/70"><Icon name="plus" className="h-3.5 w-3.5" /> تیکت جدید</Link>
          </div>
          <div className="mt-4 space-y-2">
            {myTickets.length > 0 ? myTickets.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <IconChip icon="chat" tone="success" size="sm" />
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
            <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="chat" className="h-5 w-5 text-accent-text" /> مشاوره‌های من</h2>
            <Link href="/consultation" className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text transition-colors hover:bg-accent-soft/70"><Icon name="calendar" className="h-3.5 w-3.5" /> رزرو مشاوره</Link>
          </div>
          <div className="mt-4 space-y-2">
            {myConsults.length > 0 ? myConsults.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <IconChip icon={c.type === "video" ? "video" : c.type === "voice" ? "phone" : "chat"} tone="accent" size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.subject}</p>
                  <p className="text-xs text-muted" dir="ltr">{CONSULT_TYPE_FA[c.type] ?? c.type} • {faNum(c.duration)} دقیقه</p>
                </div>
                <Badge tone="accent">{CONSULT_STATUS_FA[c.status] ?? c.status}</Badge>
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">مشاوره‌ای ثبت نکرده‌اید. <Link href="/consultation" className="text-accent-text hover:underline">رزرو مشاوره آنلاین</Link></p>
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
