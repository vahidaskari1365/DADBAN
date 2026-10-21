import type { Metadata } from "next";
import { db, isDbConfigured } from "@/db";
import { emailOutbox, newsletterSubscribers } from "@/db/schema";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { guardAdminPage } from "@/lib/admin-auth";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { PageHero } from "@/components/page-hero";
import { Card, Badge, Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { toFa } from "@/lib/money";
import { formatJalaliDateTime } from "@/lib/jalali";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("صندوق خروجی ایمیل — پنل مدیریت دادورزان") },
    description: t("آرشیو صادقانهٔ ایمیل‌های سامانه (رسید، خوش‌آمد، …) و اعضای خبرنامهٔ دادورزان."),
  };
}
export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  receipt: "رسید پرداخت",
  welcome: "خوش‌آمد",
  password_reset: "بازیابی رمز",
  onboarding: "روی‌بوردینگ وکیل",
  broadcast: "عمومی",
};

const PROVIDER_LABELS: Record<string, string> = {
  resend: "Resend",
  smtp: "SMTP",
  log: "حالت ثبت",
};

type OutboxStatus = "sent" | "failed" | "logged";
const STATUS_BADGE: Record<OutboxStatus, { label: string; tone: "success" | "danger" | "accent" }> = {
  sent: { label: "ارسال‌شده", tone: "success" },
  failed: { label: "ناموفق", tone: "danger" },
  logged: { label: "ثبت‌شده — بدون کلید ارسال", tone: "accent" },
};

export default async function AdminOutboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await guardAdminPage("outbox");
  const t = await getT();
  const tf = templateT(t);
  const sp = await searchParams;
  const tab = sp.tab === "newsletter" ? "newsletter" : "outbox";

  /* ---------------- داده‌ها (try/catch — بدون دیتابیس هم امن) ---------------- */
  let stats = { sent30: 0, failed30: 0, logged30: 0, subscribers: 0 };
  let outboxRows: (typeof emailOutbox.$inferSelect)[] = [];
  let subscribers: (typeof newsletterSubscribers.$inferSelect)[] = [];
  let dbDown = false;

  try {
    if (isDbConfigured()) await ensureExtendedSchema();
    const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [sentQ, failedQ, loggedQ, subsQ, outboxQ, subsRowsQ] = await Promise.all([
      db.select({ v: count() }).from(emailOutbox).where(and(eq(emailOutbox.status, "sent"), gte(emailOutbox.createdAt, monthAgo))),
      db.select({ v: count() }).from(emailOutbox).where(and(eq(emailOutbox.status, "failed"), gte(emailOutbox.createdAt, monthAgo))),
      db.select({ v: count() }).from(emailOutbox).where(and(eq(emailOutbox.status, "logged"), gte(emailOutbox.createdAt, monthAgo))),
      db.select({ v: count() }).from(newsletterSubscribers),
      db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(50),
      db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(50),
    ]);
    stats = {
      sent30: Number(sentQ[0]?.v ?? 0),
      failed30: Number(failedQ[0]?.v ?? 0),
      logged30: Number(loggedQ[0]?.v ?? 0),
      subscribers: Number(subsQ[0]?.v ?? 0),
    };
    outboxRows = Array.isArray(outboxQ) ? outboxQ : [];
    subscribers = Array.isArray(subsRowsQ) ? subsRowsQ : [];
  } catch {
    dbDown = true; /* حالت تنزل‌یافته */
  }

  const hasLogged = stats.logged30 > 0 || outboxRows.some((r) => r.status === "logged");
  const tabHref = (t: "outbox" | "newsletter") => `/admin/outbox?tab=${t}`;

  return (
    <>
      <PageHero
        badge={t("Admin · ایمیل")}
        title={t("صندوق خروجی ایمیل و خبرنامه")}
        desc={t("آرشیو صادقانهٔ همهٔ ایمیل‌های سامانه — چه ارسال‌شده، چه ناموفق و چه فقط ثبت‌شده — به‌همراه اعضای خبرنامه")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت"), href: "/admin" }, { label: t("صندوق ایمیل") }]}
      />
      <Container className="py-10">
        {/* ---------------- بنر صداقت: حالت ثبت (بدون کلید ارسال) ---------------- */}
        {hasLogged && (
          <div
            data-testid="outbox-banner"
            role="status"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 text-sm leading-7 text-accent-text"
          >
            <Icon name="alert" className="mt-1 h-5 w-5 shrink-0" aria-hidden />
            <p>
              {t("درگاه ایمیل تنظیم نشده؛ ایمیل‌ها فقط ثبت می‌شوند. کلید")} <span dir="ltr" className="font-bold">RESEND_API_KEY</span> {t("یا")}{" "}
              <span dir="ltr" className="font-bold">SMTP_URL</span> {t("را در تنظیمات Vercel اضافه کنید.")}
            </p>
          </div>
        )}

        {/* ---------------- آمار ۳۰ روز اخیر ---------------- */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: t("ارسال‌شده (۳۰ روز)"), value: stats.sent30, icon: "check" as const, tone: "text-success" },
            { label: t("ناموفق (۳۰ روز)"), value: stats.failed30, icon: "alert" as const, tone: "text-danger" },
            { label: t("فقط ثبت‌شده (۳۰ روز)"), value: stats.logged30, icon: "clock" as const, tone: "text-accent" },
            { label: t("اعضای خبرنامه"), value: stats.subscribers, icon: "mail" as const, tone: "text-foreground" },
          ].map((s) => (
            <Card key={s.label} hover={false} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name={s.icon} className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <strong className={`block text-xl font-black ${s.tone}`}>{toFa(s.value)}</strong>
                <small className="text-xs text-muted">{s.label}</small>
              </span>
            </Card>
          ))}
        </div>

        {/* ---------------- تب‌ها ---------------- */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5 rounded-xl border border-border bg-surface p-1.5">
            <a
              href={tabHref("outbox")}
              className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                tab === "outbox" ? "bg-primary-soft text-primary" : "text-foreground-soft hover:bg-surface-2"
              }`}
            >
              {t("صندوق خروجی")}
            </a>
            <a
              href={tabHref("newsletter")}
              className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                tab === "newsletter" ? "bg-primary-soft text-primary" : "text-foreground-soft hover:bg-surface-2"
              }`}
            >
              {t("خبرنامه")}
            </a>
          </div>

          {tab === "newsletter" && (
            <a
              href="/api/newsletter?export=csv"
              download
              className="btn-gold inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold"
            >
              <Icon name="file" className="h-4 w-4" aria-hidden />
              {t("خروجی CSV اعضا")}
            </a>
          )}
        </div>

        {dbDown && (
          <p className="mt-5 rounded-2xl border border-border bg-surface-2/60 p-4 text-sm text-muted">
            {t("دیتابیس در دسترس نیست؛ داده‌های ایمیل و خبرنامه موقتاً نمایش داده نمی‌شوند.")}
          </p>
        )}

        {/* ---------------- جدول تب فعال ---------------- */}
        {tab === "outbox" ? (
          <Card hover={false} className="mt-5">
            <div className="overflow-x-auto">
              <table data-testid="outbox-table" className="w-full min-w-[880px] text-right">
                <thead>
                  <tr className="border-b border-border text-xs font-bold text-muted">
                    <th className="p-3">{t("زمان")}</th>
                    <th className="p-3">{t("گیرنده")}</th>
                    <th className="p-3">{t("نوع")}</th>
                    <th className="p-3">{t("موضوع")}</th>
                    <th className="p-3">{t("وضعیت")}</th>
                    <th className="p-3">{t("سرویس")}</th>
                    <th className="p-3">{t("خطا")}</th>
                  </tr>
                </thead>
                <tbody>
                  {outboxRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-sm text-muted">
                        {t("هنوز ایمیلی ثبت نشده است.")}
                      </td>
                    </tr>
                  )}
                  {outboxRows.map((r) => {
                    const st = STATUS_BADGE[(r.status as OutboxStatus) in STATUS_BADGE ? (r.status as OutboxStatus) : "logged"];
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0 align-top hover:bg-surface-2/40">
                        <td className="whitespace-nowrap p-3 text-sm text-muted">{formatJalaliDateTime(r.createdAt)}</td>
                        <td className="p-3 text-sm text-foreground" dir="ltr">
                          {r.toEmail}
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm text-muted">{t(KIND_LABELS[r.kind] ?? r.kind)}</td>
                        <td className="max-w-[260px] p-3">
                          <span className="line-clamp-2 text-sm font-bold text-foreground" title={r.subject}>
                            {r.subject}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge tone={st.tone}>{t(st.label)}</Badge>
                        </td>
                        <td className="whitespace-nowrap p-3 text-sm text-muted" dir="ltr">
                          {t(PROVIDER_LABELS[r.provider] ?? r.provider)}
                        </td>
                        <td className="max-w-[200px] p-3">
                          {r.error ? (
                            <span className="line-clamp-2 text-xs text-danger" title={r.error} dir="ltr">
                              {r.error}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">{tf("آخرین {n} ردیف از صندوق خروجی.", { n: toFa(outboxRows.length) })}</p>
          </Card>
        ) : (
          <Card hover={false} className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-foreground">{t("اعضای خبرنامه")}</h2>
              <span data-testid="newsletter-count" className="rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary">
                {tf("{n} عضو", { n: toFa(stats.subscribers) })}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-right">
                <thead>
                  <tr className="border-b border-border text-xs font-bold text-muted">
                    <th className="p-3">#</th>
                    <th className="p-3">{t("ایمیل")}</th>
                    <th className="p-3">{t("وضعیت")}</th>
                    <th className="p-3">{t("تاریخ عضویت")}</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-sm text-muted">
                        {t("هنوز عضوی ثبت نشده است.")}
                      </td>
                    </tr>
                  )}
                  {subscribers.map((s, i) => (
                    <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                      <td className="p-3 text-sm text-muted">{toFa(i + 1)}</td>
                      <td className="p-3 text-sm font-bold text-foreground" dir="ltr">
                        {s.email}
                      </td>
                      <td className="p-3">
                        {s.active ? <Badge tone="success">{t("فعال")}</Badge> : <Badge tone="neutral">{t("غیرفعال")}</Badge>}
                      </td>
                      <td className="whitespace-nowrap p-3 text-sm text-muted">{formatJalaliDateTime(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">{tf("آخرین {n} عضو از مجموع {m} عضو.", { n: toFa(subscribers.length), m: toFa(stats.subscribers) })}</p>
          </Card>
        )}
      </Container>
    </>
  );
}
