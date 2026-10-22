import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { lawyers, articles, contracts, qaQuestions, cases, consultations, tickets, pageViews, pageViewDaily, visitorDaily, lawyerOnboarding, lawyerVerifications, qaSubmissions, appErrors } from "@/db/schema";
import { count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { getAdminSession, hasPerm } from "@/lib/admin-auth";
import { roleLabel } from "@/lib/admin-permissions";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { PageHero } from "@/components/page-hero";
import LogoutButton from "@/components/admin/logout-button";
import PendingLawyersAlert, { type PendingLawyerRow } from "@/components/admin/pending-lawyers-alert";
import { DailyTrafficChart, type TrafficDayRow } from "@/components/admin/daily-traffic-chart";
import { ADMIN_GROUPS, ADMIN_MENU } from "@/components/admin/nav-config";
import { tehranDay, lastNDays } from "@/lib/visit-analytics";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

async function getStats() {
  const empty = { value: 0 };
  try {
    const [l, a, c, q, cs, co, t, pv] = await Promise.all([
      db.select({ value: count() }).from(lawyers),
      db.select({ value: count() }).from(articles),
      db.select({ value: count() }).from(contracts),
      db.select({ value: count() }).from(qaQuestions),
      db.select({ value: count() }).from(cases),
      db.select({ value: count() }).from(consultations),
      db.select({ value: count() }).from(tickets),
      db.select({ value: sum(pageViews.views) }).from(pageViews),
    ]);
    return {
      dbOk: true,
      lawyers: l[0]?.value ?? 0,
      articles: a[0]?.value ?? 0,
      contracts: c[0]?.value ?? 0,
      qa: q[0]?.value ?? 0,
      cases: cs[0]?.value ?? 0,
      consultations: co[0]?.value ?? 0,
      tickets: t[0]?.value ?? 0,
      views: Number(pv[0]?.value ?? 0),
    };
  } catch {
    return { dbOk: false, lawyers: 0, articles: 0, contracts: 0, qa: 0, cases: 0, consultations: 0, tickets: 0, views: 0 };
  }
}

export interface ActionItem {
  key: string;
  label: string;
  href: string;
  icon: "fingerprint" | "mail" | "chat" | "alert";
  count: number;
  tone: "warning" | "danger" | "primary";
}

/** مرکز اقدام — اقلام در انتظار رسیدگی ادمین؛ هر شمارش مستقل تا خطای یک جدول بقیه را نیندازد */
async function getActionItems(): Promise<ActionItem[]> {
  const safe = async (fn: () => Promise<number>): Promise<number> => {
    try {
      return await fn();
    } catch {
      return 0;
    }
  };
  const errSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [verifications, openTickets, qaPending, recentErrors] = await Promise.all([
    safe(async () => (await db.select({ value: count() }).from(lawyerVerifications).where(eq(lawyerVerifications.status, "pending")))[0]?.value ?? 0),
    safe(async () => (await db.select({ value: count() }).from(tickets).where(eq(tickets.status, "open")))[0]?.value ?? 0),
    safe(async () => (await db.select({ value: count() }).from(qaSubmissions).where(eq(qaSubmissions.status, "pending_review")))[0]?.value ?? 0),
    safe(async () => (await db.select({ value: count() }).from(appErrors).where(gte(appErrors.createdAt, errSince)))[0]?.value ?? 0),
  ]);
  const items: ActionItem[] = [
    { key: "verifications", label: "احراز هویت در انتظار", href: "/admin/verifications", icon: "fingerprint", count: verifications, tone: "warning" },
    { key: "tickets", label: "تیکت باز پشتیبانی", href: "/admin/tickets", icon: "mail", count: openTickets, tone: "primary" },
    { key: "qa", label: "پرسش در انتظار بررسی", href: "/admin/qa-submissions", icon: "chat", count: qaPending, tone: "primary" },
    { key: "errors", label: "خطای ۲۴ ساعت اخیر", href: "/admin/errors", icon: "alert", count: recentErrors, tone: "danger" },
  ];
  return items;
}

interface TrafficStats {
  ok: boolean;
  today: number;
  yesterday: number;
  uniqToday: number;
  series: TrafficDayRow[];
  topToday: { path: string; views: number }[];
}

/** آمار واقعی بازدید روزانه به وقت تهران — مبنای کارت‌ها و نمودار داشبورد */
async function getTraffic(): Promise<TrafficStats> {
  const days14 = lastNDays(14);
  const from = days14[0];
  const today = tehranDay();
  const yesterday = lastNDays(2)[0];
  try {
    const [viewRows, uniqRows, topRows] = await Promise.all([
      db
        .select({ day: pageViewDaily.day, views: sql<number>`SUM(${pageViewDaily.views})::int` })
        .from(pageViewDaily)
        .where(gte(pageViewDaily.day, from))
        .groupBy(pageViewDaily.day),
      db
        .select({ c: sql<number>`COUNT(*)::int` })
        .from(visitorDaily)
        .where(eq(visitorDaily.day, today)),
      db
        .select({ path: pageViewDaily.path, views: sql<number>`SUM(${pageViewDaily.views})::int` })
        .from(pageViewDaily)
        .where(eq(pageViewDaily.day, today))
        .groupBy(pageViewDaily.path)
        .orderBy(desc(sql`SUM(${pageViewDaily.views})`))
        .limit(5),
    ]);
    const viewsMap = new Map(viewRows.map((r) => [r.day, Number(r.views) || 0]));
    return {
      ok: true,
      today: viewsMap.get(today) ?? 0,
      yesterday: viewsMap.get(yesterday) ?? 0,
      uniqToday: Number(uniqRows[0]?.c ?? 0),
      series: days14.map((d) => ({ day: d, views: viewsMap.get(d) ?? 0, uniq: 0 })),
      topToday: topRows.map((r) => ({ path: r.path, views: Number(r.views) || 0 })),
    };
  } catch {
    return {
      ok: false,
      today: 0,
      yesterday: 0,
      uniqToday: 0,
      series: days14.map((d) => ({ day: d, views: 0, uniq: 0 })),
      topToday: [],
    };
  }
}

/* منوی کامل مدیریت — منبع واحد: src/components/admin/nav-config.ts (مشترک با سایدبار شِل ادمین) */

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const t = await getT();
  const tf = templateT(t);
  const sp = await searchParams;
  const s = await getStats();
  const tr = await getTraffic();
  const actionItems = await getActionItems();
  let recent: { id: number; slug: string; title: string; views: number; publishedAt: Date }[] = [];
  try {
    recent = await db
      .select({ id: articles.id, slug: articles.slug, title: articles.title, views: articles.views, publishedAt: articles.publishedAt })
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(8);
  } catch {
    recent = [];
  }

  /* ── اعلان ثبت‌نام وکلای جدید (فرم مستقیم کانون/مرکز وکلا) — صف pending ── */
  let pendingLawyerRows: PendingLawyerRow[] = [];
  let pendingLawyersTotal = 0;
  try {
    const rows = await db
      .select({
        id: lawyerOnboarding.id,
        name: lawyerOnboarding.name,
        phone: lawyerOnboarding.phone,
        licenseNo: lawyerOnboarding.licenseNo,
        barType: lawyerOnboarding.barType,
        lawyerType: lawyerOnboarding.lawyerType,
        province: lawyerOnboarding.province,
        createdAt: lawyerOnboarding.createdAt,
      })
      .from(lawyerOnboarding)
      .where(eq(lawyerOnboarding.status, "pending"))
      .orderBy(desc(lawyerOnboarding.createdAt))
      .limit(5);
    pendingLawyerRows = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      licenseNo: r.licenseNo,
      barType: r.barType,
      lawyerType: r.lawyerType,
      province: r.province,
      createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
    }));
    const c = await db.select({ value: count() }).from(lawyerOnboarding).where(eq(lawyerOnboarding.status, "pending"));
    pendingLawyersTotal = c[0]?.value ?? pendingLawyerRows.length;
  } catch {
    pendingLawyerRows = [];
  }

  const stats = [
    { label: "وکلا", value: s.lawyers, icon: "badge" as const, tone: "primary" as const, href: "/admin/lawyers" },
    { label: "مقالات", value: s.articles, icon: "book" as const, tone: "accent" as const, href: "/admin/articles" },
    { label: "قراردادها", value: s.contracts, icon: "file" as const, tone: "success" as const, href: "/admin/contracts" },
    { label: "پرسش و پاسخ", value: s.qa, icon: "chat" as const, tone: "neutral" as const, href: "/admin/qa" },
    { label: "پرونده‌ها", value: s.cases, icon: "folder" as const, tone: "primary" as const, href: "/admin/cases" },
    { label: "مشاوره‌ها", value: s.consultations, icon: "calendar" as const, tone: "accent" as const, href: "/admin/consultations" },
    { label: "تیکت‌ها", value: s.tickets, icon: "mail" as const, tone: "neutral" as const, href: "/admin/tickets" },
    { label: "بازدید امروز", value: tr.today, icon: "eye" as const, tone: "success" as const, href: "/admin/analytics" },
    { label: "بازدید دیروز", value: tr.yesterday, icon: "clock" as const, tone: "neutral" as const, href: "/admin/analytics" },
    { label: "بازدیدکنندهٔ یکتای امروز", value: tr.uniqToday, icon: "user" as const, tone: "accent" as const, href: "/admin/analytics" },
  ];

  const menu = ADMIN_MENU.filter((m) => !m.perm || hasPerm(session, m.perm));
  const canArticles = hasPerm(session, "articles");
  /* کارت‌های مرکز اقدام فقط با دسترسی مربوطه نمایش داده می‌شوند */
  const actionPermByKey: Record<string, string> = { verifications: "lawyers", tickets: "tickets", qa: "qa", errors: "errors" };
  const visibleActions = actionItems.filter((a) => !actionPermByKey[a.key] || hasPerm(session, actionPermByKey[a.key]));

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-admin.png"
        badge={t("Admin · پنل مدیریت")}
        title={t("داشبورد مدیریت دادورزان")}
        desc={t("مدیریت محتوا، داده‌های سایت و آمار بازدید — با ورود امن مدیر.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت") }]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
            <Icon name="user" className="h-3.5 w-3.5" />
            {session.name} — {t(roleLabel(session.role))}
          </span>
          {canArticles && <Button href="/admin/articles/new" variant="accent" icon="plus" size="sm">{t("مقاله جدید")}</Button>}
          {canArticles && (
            <Link href="/admin/articles" className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20"><Icon name="book" className="h-3.5 w-3.5" />{t("مدیریت مقالات")}</Link>
          )}
          <LogoutButton />
        </div>
      </PageHero>
      <Container className="py-12">
        {sp.denied && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive" data-testid="denied-notice">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            {t("به این بخش دسترسی ندارید — با مدیر کل تماس بگیرید.")}
          </div>
        )}
        {!s.dbOk && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive" data-testid="db-offline-notice">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            {t("اتصال دیتابیس برقرار نیست — آمار و فهرست‌ها ممکن است ناقص باشد.")}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((st) => (
            <Link key={st.label} href={st.href}>
              <Card hover className="flex items-center gap-3">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${st.tone === "primary" ? "bg-primary-soft text-primary" : st.tone === "accent" ? "bg-accent-soft text-accent-text" : st.tone === "success" ? "bg-success/15 text-success" : "bg-surface-2 text-foreground-soft"}`}>
                  <Icon name={st.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xl font-black text-foreground">{faNum(st.value)}</span>
                  <span className="text-xs font-semibold text-foreground-soft">{t(st.label)}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>

        {/* مرکز اقدام — اقلام در انتظار رسیدگی */}
        {visibleActions.length > 0 && (
          <div className="mt-6" data-testid="admin-action-center">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-foreground">
              <Icon name="bolt" className="h-5 w-5 text-accent" />
              {t("نیازمند اقدام")}
            </h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {visibleActions.map((a) => {
                const urgent = a.count > 0;
                return (
                  <Link key={a.key} href={a.href}>
                    <Card
                      hover
                      className={`flex items-center gap-3 ${
                        urgent
                          ? a.tone === "danger"
                            ? "border-destructive/40"
                            : a.tone === "warning"
                              ? "border-warning/50"
                              : "border-primary/30"
                          : ""
                      }`}
                      data-testid={`action-${a.key}`}
                    >
                      <span
                        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          urgent
                            ? a.tone === "danger"
                              ? "bg-destructive/10 text-destructive"
                              : a.tone === "warning"
                                ? "bg-warning/10 text-warning"
                                : "bg-primary-soft text-primary"
                            : "bg-surface-2 text-foreground-soft"
                        }`}
                      >
                        <Icon name={a.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xl font-black text-foreground">{faNum(a.count)}</span>
                        <span className="block truncate text-xs font-semibold text-foreground-soft">{t(a.label)}</span>
                      </span>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* اعلان ثبت‌نام وکیل جدید — با دکمه‌های تأیید / عدم تأیید */}
        <div className="mt-6">
          <PendingLawyersAlert
            rows={pendingLawyerRows}
            total={pendingLawyersTotal}
            canReview={hasPerm(session, "lawyers")}
          />
        </div>

        {/* نمودار بازدید ۱۴ روز اخیر — گزارش کامل در /admin/analytics */}
        <div className="mt-10">
          <Card hover={false} data-testid="dashboard-traffic">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
                <Icon name="chart-bar" className="h-5 w-5 text-primary" />
                {t("بازدید سایت — ۱۴ روز اخیر")}
              </h2>
              <Button href="/admin/analytics" variant="ghost" size="sm" icon="arrow">{t("گزارش کامل بازدید")}</Button>
            </div>
            <DailyTrafficChart series={tr.series} testid="dashboard-traffic-chart" compact />
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Badge tone="accent" icon="eye">{tf("امروز: {n} بازدید", { n: faNum(tr.today) })}</Badge>
              <Badge tone="neutral" icon="clock">{tf("دیروز: {n} بازدید", { n: faNum(tr.yesterday) })}</Badge>
              <Badge tone="success" icon="user">{tf("بازدیدکنندهٔ یکتای امروز: {n}", { n: faNum(tr.uniqToday) })}</Badge>
            </div>
            {tr.topToday.length > 0 && (
              <div className="mt-4 border-t border-border/60 pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-black text-foreground-soft">
                  <Icon name="file" className="h-3.5 w-3.5 text-primary" />
                  {t("پربازدیدترین صفحات امروز")}
                </p>
                <div className="space-y-1.5" data-testid="dashboard-top-pages">
                  {tr.topToday.map((r, i) => (
                    <div key={r.path} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-primary-soft text-[10px] font-black text-primary">{faNum(i + 1)}</span>
                        <span className="truncate font-bold text-foreground" dir="ltr">{r.path}</span>
                      </span>
                      <span className="shrink-0 font-black text-foreground-soft">{faNum(r.views)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {canArticles ? (
          <>
            <div className="mb-4 mt-10 flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground">{t("آخرین مقالات")}</h2>
              <Button href="/admin/articles" variant="ghost" size="sm">{t("همه مقالات")}</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {recent.length === 0 && <Card hover={false} className="md:col-span-2"><p className="text-sm text-foreground-soft">{t("دیتابیس در دسترس نیست یا مقاله‌ای ثبت نشده است.")}</p></Card>}
              {recent.map((a) => (
                <Card key={a.id} hover className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{a.title}</p>
                    <p className="mt-0.5 text-xs text-foreground-soft" dir="ltr">/{a.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="neutral">{tf("{n} بازدید", { n: faNum(a.views) })}</Badge>
                    <Link href={`/admin/articles/${a.id}/edit`} className="text-sm font-semibold text-primary hover:underline">{t("ویرایش")}</Link>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card hover={false} className="mt-10">
            <div className="flex items-center gap-3 p-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name="shield" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{t("خوش آمدید")}</p>
                <p className="mt-0.5 text-xs text-foreground-soft">
                  {t("شما به بخش‌های محدودشدهٔ منوی «مدیریت سریع» دسترسی دارید — بخش‌های دیگر پنهان شده‌اند.")}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* منوی مدیریت سریع — فقط موبایل/تبلت؛ در دسکتاپ سایدبار پایدار شِل ادمین جای آن را می‌گیرد */}
        <div id="tracking" className="mt-10 lg:hidden">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">{t("مدیریت سریع")}</h2>
          </div>
          <div className="nice-scroll max-h-[40rem] space-y-5 overflow-y-auto pl-1" data-testid="admin-menu">
            {ADMIN_GROUPS.map((g) => {
              const items = menu.filter((m) => m.group === g.key);
              if (items.length === 0) return null;
              return (
                <div key={g.key}>
                  <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-black uppercase tracking-wide text-muted">
                    <Icon name={g.icon} className="h-3.5 w-3.5 text-primary" />
                    {t(g.label)}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((m) => (
                      <Link key={m.label + m.href} href={m.href} className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2 transition-all hover:border-primary/40 hover:bg-primary-soft/40">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                          <Icon name={m.icon} className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[13px] font-bold text-foreground">{t(m.label)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </>
  );
}
