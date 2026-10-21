import { redirect } from "next/navigation";
import { db } from "@/db";
import { pageViewDaily, visitorDaily, pageViews, events } from "@/db/schema";
import { desc, eq, gte, sql } from "drizzle-orm";
import { getAdminSession } from "@/lib/admin-auth";
import { Container, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { PageHero } from "@/components/page-hero";
import { tehranDay, lastNDays, faDayLabel } from "@/lib/visit-analytics";
import { DailyTrafficChart } from "@/components/admin/daily-traffic-chart";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/* ----------------------------- شکل داده ----------------------------- */

interface DayRow {
  day: string;
  views: number;
  uniq: number;
}

interface AnalyticsData {
  ok: boolean;
  today: number;
  yesterday: number;
  d7: number;
  d30: number;
  total: number;
  uniqToday: number;
  uniq7: number;
  uniq30: number;
  series: DayRow[]; // ۱۴ روز اخیر
  daily: DayRow[]; // ۳۰ روز اخیر برای جدول
  topToday: { path: string; views: number }[];
  top7: { path: string; views: number }[];
  ev7: { event: string; c: number }[];
}

const EMPTY: AnalyticsData = {
  ok: false,
  today: 0,
  yesterday: 0,
  d7: 0,
  d30: 0,
  total: 0,
  uniqToday: 0,
  uniq7: 0,
  uniq30: 0,
  series: [],
  daily: [],
  topToday: [],
  top7: [],
  ev7: [],
};

const EVENT_LABELS: Record<string, string> = {
  landing_view: "مشاهدهٔ صفحهٔ اصلی",
  quickstart_started: "شروع راهنمای سریع",
  quickstart_completed: "پایان راهنمای سریع",
  lawyer_viewed: "مشاهدهٔ پروفایل وکیل",
  consultation_started: "شروع مشاوره",
  booking_started: "شروع رزرو نوبت",
  payment_started: "شروع پرداخت",
  payment_completed: "پرداخت کامل‌شده",
  case_created: "ثبت پرونده",
  contract_builder_started: "شروع ساخت قرارداد",
  contract_completed: "قرارداد تکمیل‌شده",
  ai_started: "شروع دستیار هوشمند",
  ai_to_lawyer_clicked: "ارجاع دستیار به وکیل",
  business_pricing_viewed: "مشاهدهٔ تعرفه کسب‌وکار",
  lead_created: "ثبت سرنخ",
  availability_viewed: "مشاهدهٔ تقویم نوبت‌ها",
  slot_selected: "انتخاب اسلات نوبت",
  employee_match_success: "تطبیق موفق کارشناس",
  employee_lawyer_select: "انتخاب وکیل کارشناس",
  lawyer_picked_from_directory: "انتخاب وکیل از فهرست",
  lawyer_removed_from_booking: "حذف وکیل از رزرو",
  consult_chat_started: "شروع چت مشاوره",
};

/* ----------------------------- واکشی داده ----------------------------- */

async function getAnalytics(): Promise<AnalyticsData> {
  const days30 = lastNDays(30);
  const day30 = days30[0];
  const day6 = lastNDays(7)[0];
  const today = tehranDay();
  const yesterday = lastNDays(2)[0];
  const since7 = new Date(Date.now() - 7 * 86400000);

  try {
    const [viewRows, uniqRows, topTodayRows, top7Rows, uniqTodayRows, uniq7Rows, uniq30Rows, totalRows, evRows] =
      await Promise.all([
        db
          .select({ day: pageViewDaily.day, views: sql<number>`SUM(${pageViewDaily.views})::int` })
          .from(pageViewDaily)
          .where(gte(pageViewDaily.day, day30))
          .groupBy(pageViewDaily.day),
        db
          .select({ day: visitorDaily.day, uniq: sql<number>`COUNT(*)::int` })
          .from(visitorDaily)
          .where(gte(visitorDaily.day, day30))
          .groupBy(visitorDaily.day),
        db
          .select({ path: pageViewDaily.path, views: sql<number>`SUM(${pageViewDaily.views})::int` })
          .from(pageViewDaily)
          .where(eq(pageViewDaily.day, today))
          .groupBy(pageViewDaily.path)
          .orderBy(desc(sql`SUM(${pageViewDaily.views})`))
          .limit(15),
        db
          .select({ path: pageViewDaily.path, views: sql<number>`SUM(${pageViewDaily.views})::int` })
          .from(pageViewDaily)
          .where(gte(pageViewDaily.day, day6))
          .groupBy(pageViewDaily.path)
          .orderBy(desc(sql`SUM(${pageViewDaily.views})`))
          .limit(15),
        db
          .select({ c: sql<number>`COUNT(*)::int` })
          .from(visitorDaily)
          .where(eq(visitorDaily.day, today)),
        db
          .select({ c: sql<number>`COUNT(DISTINCT ${visitorDaily.visitor})::int` })
          .from(visitorDaily)
          .where(gte(visitorDaily.day, day6)),
        db
          .select({ c: sql<number>`COUNT(DISTINCT ${visitorDaily.visitor})::int` })
          .from(visitorDaily)
          .where(gte(visitorDaily.day, day30)),
        db.select({ v: sql<number>`COALESCE(SUM(${pageViews.views}),0)::int` }).from(pageViews),
        db
          .select({ event: events.event, c: sql<number>`COUNT(*)::int` })
          .from(events)
          .where(gte(events.createdAt, since7))
          .groupBy(events.event)
          .orderBy(desc(sql`COUNT(*)`))
          .limit(8),
      ]);

    const viewsMap = new Map(viewRows.map((r) => [r.day, Number(r.views) || 0]));
    const uniqMap = new Map(uniqRows.map((r) => [r.day, Number(r.uniq) || 0]));
    const daily: DayRow[] = days30.map((d) => ({
      day: d,
      views: viewsMap.get(d) ?? 0,
      uniq: uniqMap.get(d) ?? 0,
    }));

    const d7 = daily.slice(-7).reduce((a, r) => a + r.views, 0);
    const d30 = daily.reduce((a, r) => a + r.views, 0);

    return {
      ok: true,
      today: viewsMap.get(today) ?? 0,
      yesterday: viewsMap.get(yesterday) ?? 0,
      d7,
      d30,
      total: Number(totalRows[0]?.v ?? 0),
      uniqToday: Number(uniqTodayRows[0]?.c ?? 0),
      uniq7: Number(uniq7Rows[0]?.c ?? 0),
      uniq30: Number(uniq30Rows[0]?.c ?? 0),
      series: daily.slice(-14),
      daily,
      topToday: topTodayRows.map((r) => ({ path: r.path, views: Number(r.views) || 0 })),
      top7: top7Rows.map((r) => ({ path: r.path, views: Number(r.views) || 0 })),
      ev7: evRows.map((r) => ({ event: r.event, c: Number(r.c) || 0 })),
    };
  } catch {
    return EMPTY;
  }
}

/* ----------------------------- اجزای گرافیکی ----------------------------- */

function Kpi({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: Parameters<typeof Icon>[0]["name"];
  tone: "primary" | "accent" | "success" | "neutral";
}) {
  const toneCls =
    tone === "primary"
      ? "bg-primary-soft text-primary"
      : tone === "accent"
        ? "bg-accent-soft text-accent-text"
        : tone === "success"
          ? "bg-success/15 text-success"
          : "bg-surface-2 text-foreground-soft";
  return (
    <Card hover className="flex items-center gap-3">
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneCls}`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-black leading-6 text-foreground">{faNum(value)}</span>
        <span className="block truncate text-xs font-semibold text-foreground-soft">{label}</span>
        {sub && <span className="block text-[10px] font-medium text-foreground-soft/80">{sub}</span>}
      </span>
    </Card>
  );
}

/** جدول پربازدیدترین صفحات با نوار نسبی */
function TopPages({
  title,
  rows,
  testid,
}: {
  title: string;
  rows: { path: string; views: number }[];
  testid: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  return (
    <Card hover={false} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
          <Icon name="file" className="h-4 w-4 text-primary" />
          {title}
        </h3>
      </div>
      <div className="max-h-80 space-y-1.5 overflow-y-auto px-4 py-3 [scrollbar-width:thin]" data-testid={testid}>
        {rows.length === 0 && (
          <p className="py-6 text-center text-xs font-semibold text-foreground-soft">هنوز بازدیدی ثبت نشده است.</p>
        )}
        {rows.map((r, i) => (
          <div key={r.path} className="rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2/60">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-primary-soft text-[10px] font-black text-primary">{faNum(i + 1)}</span>
                <span className="truncate text-xs font-bold text-foreground" dir="ltr">{r.path}</span>
              </span>
              <span className="shrink-0 text-xs font-black text-foreground-soft">{faNum(r.views)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" dir="ltr">
              <div className="h-full rounded-full bg-gradient-to-l from-primary/80 to-primary/50" style={{ width: `${Math.max((r.views / max) * 100, 4)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ----------------------------- صفحه ----------------------------- */

export default async function AdminAnalyticsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const t = await getT();
  const d = await getAnalytics();

  const delta = d.yesterday > 0 ? Math.round(((d.today - d.yesterday) / d.yesterday) * 100) : null;

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-admin.png"
        badge={t("Admin · گزارش بازدید")}
        title={t("گزارش بازدید روزانهٔ سایت")}
        desc={t("آمار واقعی و لحظه‌ای بازدید صفحات — به وقت تهران، بدون ربات‌ها.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت"), href: "/admin" }, { label: t("گزارش بازدید") }]}
      />
      <Container className="py-10">
        {!d.ok && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            {t("دیتابیس در دسترس نیست — آمار موقتاً نمایش داده نمی‌شود.")}
          </div>
        )}

        {/* کارت‌های شاخص */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Kpi label={t("بازدید امروز")} value={d.today} icon="eye" tone="accent" sub={delta !== null ? `${delta >= 0 ? "+" : "−"}${faNum(Math.abs(delta))}٪ ${t("نسبت به دیروز")}` : undefined} />
          <Kpi label={t("بازدید دیروز")} value={d.yesterday} icon="clock" tone="neutral" />
          <Kpi label={t("بازدید ۷ روز اخیر")} value={d.d7} icon="chart-bar" tone="primary" />
          <Kpi label={t("بازدید ۳۰ روز اخیر")} value={d.d30} icon="chart-bar" tone="primary" />
          <Kpi label={t("بازدیدکنندهٔ یکتای امروز")} value={d.uniqToday} icon="user" tone="success" />
          <Kpi label={t("بازدیدکنندهٔ یکتای ۷ روز")} value={d.uniq7} icon="user" tone="success" />
          <Kpi label={t("بازدیدکنندهٔ یکتای ۳۰ روز")} value={d.uniq30} icon="user" tone="success" />
          <Kpi label={t("بازدید کل صفحات (همه زمان)")} value={d.total} icon="sparkles" tone="neutral" />
        </div>

        {/* نمودار ۱۴ روز اخیر */}
        <Card hover={false} className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
              <Icon name="chart-bar" className="h-5 w-5 text-primary" />
              {t("روند بازدید — ۱۴ روز اخیر")}
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-bold text-foreground-soft">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/70" />{t("بازدید روزانه")}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent" />{t("امروز")}</span>
            </div>
          </div>
          <DailyTrafficChart series={d.series} testid="analytics-chart" />
        </Card>

        {/* پربازدیدترین صفحات */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <TopPages title={t("پربازدیدترین صفحات — امروز")} rows={d.topToday} testid="top-pages-today" />
          <TopPages title={t("پربازدیدترین صفحات — ۷ روز اخیر")} rows={d.top7} testid="top-pages-7d" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* جدول گزارش روزانه */}
          <Card hover={false} className="lg:col-span-2">
            <div className="border-b border-border/60 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
                <Icon name="calendar" className="h-4 w-4 text-primary" />
                {t("گزارش روزانه — ۳۰ روز اخیر")}
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto [scrollbar-width:thin]">
              <table className="w-full text-right text-xs" data-testid="daily-table">
                <thead className="sticky top-0 bg-surface text-foreground-soft">
                  <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:font-bold">
                    <th>{t("روز")}</th>
                    <th>{t("بازدید صفحات")}</th>
                    <th>{t("بازدیدکنندهٔ یکتا")}</th>
                    <th className="w-1/3">{t("سهم روز")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...d.daily].reverse().map((r) => {
                    const max = Math.max(1, ...d.daily.map((x) => x.views));
                    return (
                      <tr key={r.day} className="border-t border-border/40 transition-colors hover:bg-surface-2/50 [&>td]:px-4 [&>td]:py-2.5">
                        <td className="font-bold text-foreground">{faDayLabel(r.day)}</td>
                        <td className="font-black text-foreground">{faNum(r.views)}</td>
                        <td className="font-bold text-foreground-soft">{faNum(r.uniq)}</td>
                        <td>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" dir="ltr">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.max((r.views / max) * 100, 2)}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* رویدادهای کلیدی ۷ روز اخیر */}
          <Card hover={false}>
            <div className="border-b border-border/60 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
                <Icon name="bolt" className="h-4 w-4 text-accent-text" />
                {t("رویدادهای کلیدی — ۷ روز اخیر")}
              </h3>
            </div>
            <div className="max-h-96 space-y-2.5 overflow-y-auto px-4 py-4 [scrollbar-width:thin]" data-testid="events-7d">
              {d.ev7.length === 0 && (
                <p className="py-6 text-center text-xs font-semibold text-foreground-soft">هنوز رویدادی ثبت نشده است.</p>
              )}
              {(() => {
                const max = Math.max(1, ...d.ev7.map((e) => e.c));
                return d.ev7.map((e) => (
                  <div key={e.event}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-foreground">{EVENT_LABELS[e.event] ?? e.event}</span>
                      <Badge tone="neutral">{faNum(e.c)}</Badge>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" dir="ltr">
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.max((e.c / max) * 100, 4)}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </Card>
        </div>
      </Container>
    </>
  );
}
