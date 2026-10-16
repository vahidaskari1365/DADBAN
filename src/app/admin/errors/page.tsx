import type { Metadata } from "next";
import { db } from "@/db";
import { appErrors } from "@/db/schema";
import { count, desc, gte } from "drizzle-orm";
import { guardAdminPage } from "@/lib/admin-auth";
import { PageHero } from "@/components/page-hero";
import { Container, Card, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { formatJalaliDateTime, relativeTimeJalali } from "@/lib/jalali";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";
import ErrorsRefreshButton from "./refresh-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پایش خطاهای داخلی — پنل مدیریت دادپیو"),
    description: t("خطاهای ثبت‌شدهٔ سمت سرور و کلاینت در جدول app_errors — جایگزین داخلی Sentry بدون کلید خارجی."),
  };
}
export const dynamic = "force-dynamic";

type ErrorRow = typeof appErrors.$inferSelect;

type ErrorsDashboard = {
  c24: number;
  c7: number;
  latest: Pick<ErrorRow, "message" | "level" | "source" | "createdAt"> | null;
  rows: ErrorRow[];
};

/** UA کوتاه برای نمایش — بدون ابزار parse خارجی. */
const shortUa = (ua: string | null) => (ua ? ua.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim().slice(0, 48) : "");

const SOURCE_FA: Record<string, string> = { server: "سرور", client: "کلاینت" };

/**
 * بارگذاری دادهٔ پایش — بیرون از بدنهٔ کامپوننت تا رندر خالص بماند.
 * خطاها جذب می‌شوند؛ بدون دیتابیس هم صفحهٔ ادمین امن رندر می‌شود.
 */
async function loadErrorsDashboard(): Promise<ErrorsDashboard> {
  const since24 = new Date(Date.now() - 24 * 3600_000);
  const since7 = new Date(Date.now() - 7 * 24 * 3600_000);
  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort */
    }
    const [r24, r7, latestRows, rows] = await Promise.all([
      db.select({ v: count() }).from(appErrors).where(gte(appErrors.createdAt, since24)),
      db.select({ v: count() }).from(appErrors).where(gte(appErrors.createdAt, since7)),
      db
        .select({ message: appErrors.message, level: appErrors.level, source: appErrors.source, createdAt: appErrors.createdAt })
        .from(appErrors)
        .orderBy(desc(appErrors.createdAt))
        .limit(1),
      db.select().from(appErrors).orderBy(desc(appErrors.createdAt)).limit(100),
    ]);
    return {
      c24: Number(r24[0]?.v ?? 0),
      c7: Number(r7[0]?.v ?? 0),
      latest: latestRows[0] ?? null,
      rows: Array.isArray(rows) ? rows : [],
    };
  } catch {
    return { c24: 0, c7: 0, latest: null, rows: [] };
  }
}

export default async function AdminErrorsPage() {
  // گارد ادمین + دسترسی — همان الگوی بقیهٔ صفحات پنل مدیریت
  await guardAdminPage("errors");
  const t = await getT();
  const tf = templateT(t);

  const { c24, c7, latest, rows } = await loadErrorsDashboard();

  return (
    <>
      <PageHero
        badge={t("Admin · پایش")}
        title={t("پایش خطاهای داخلی")}
        desc={t("خطاهای سمت سرور و کلاینت که در جدول app_errors ثبت شده‌اند — جایگزین داخلی Sentry، بدون کلید خارجی")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت"), href: "/admin" }, { label: t("خطاها") }]}
      >
        <ErrorsRefreshButton />
      </PageHero>

      <Container className="space-y-6 py-10">
        {/* کارت‌های آماری */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card hover={false}>
            <p className="text-xs font-bold text-muted">{t("خطاهای ۲۴ ساعت اخیر (سرور + کلاینت)")}</p>
            <p className={`mt-2 text-3xl font-extrabold ${c24 > 0 ? "text-danger" : "text-success"}`}>{faNum(c24)}</p>
          </Card>
          <Card hover={false}>
            <p className="text-xs font-bold text-muted">{t("خطاهای ۷ روز اخیر")}</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground">{faNum(c7)}</p>
          </Card>
          <Card hover={false}>
            <p className="text-xs font-bold text-muted">{t("آخرین خطا")}</p>
            {latest ? (
              <>
                <p className="mt-2 line-clamp-2 break-words text-sm font-bold text-foreground">{latest.message}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {t(SOURCE_FA[latest.source] ?? latest.source)} • {relativeTimeJalali(latest.createdAt)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm font-bold text-success">{t("ثبت نشده")}</p>
            )}
          </Card>
        </div>

        {/* فهرست ۱۰۰ خطای آخر */}
        {rows.length ? (
          <div className="space-y-3" data-testid="errors-table">
            {rows.map((row) => (
              <Card key={row.id} hover={false} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {row.level === "warning" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <Icon name="alert" className="h-3 w-3" /> {t("هشدار")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11px] font-bold text-danger">
                      <Icon name="alert" className="h-3 w-3" /> {t("خطا")}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      row.source === "server" ? "border-primary/20 bg-primary-soft text-primary" : "border-border bg-surface-2 text-foreground-soft"
                    }`}
                  >
                    {t(SOURCE_FA[row.source] ?? row.source)}
                  </span>
                  <span className="mr-auto text-[11px] text-muted" title={formatJalaliDateTime(row.createdAt)}>
                    {relativeTimeJalali(row.createdAt)} — {formatJalaliDateTime(row.createdAt)}
                  </span>
                </div>

                <p className="mt-2.5 break-words text-sm font-bold leading-6 text-foreground">{row.message}</p>

                {row.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline">{t("نمایش کامل stack")}</summary>
                    <pre
                      dir="ltr"
                      className="nice-scroll mt-2 max-h-64 overflow-auto rounded-xl bg-surface-2 p-3 text-left text-[11px] leading-5 text-muted"
                    >
                      {row.stack}
                    </pre>
                  </details>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                  {row.url && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <Icon name="link" className="h-3 w-3 shrink-0" />
                      <span dir="ltr" className="max-w-[320px] truncate">{row.url}</span>
                    </span>
                  )}
                  <span>{row.userId ? tf("کاربر #{n}", { n: faNum(row.userId) }) : t("مهمان")}</span>
                  {row.userAgent && <span className="max-w-[240px] truncate" dir="ltr" title={row.userAgent}>{shortUa(row.userAgent)}</span>}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div data-testid="errors-table">
            <EmptyState icon="check" title={t("خطای ثبت‌شده‌ای نیست — همه‌چیز سالم است")} desc={t("خطاهای سمت سرور و کلاینت به‌محض رخ دادن همین‌جا نمایش داده می‌شوند.")} />
          </div>
        )}
      </Container>
    </>
  );
}
