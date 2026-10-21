import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases, documents, payments, consultations, serviceRequests } from "@/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import { formatJalaliLong } from "@/lib/jalali";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { CASE_STATUS_FA, buildCaseTimeline, nextActionForCase } from "@/lib/case-facts";
import { StatusBadge } from "@/components/managed";
import CaseDocumentsManager from "@/components/case-documents-manager";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { templateT } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("پرونده من — دادورزان") },
    description: t("جزئیات واقعی پرونده، مراحل، مدارک و پرداخت‌های شما."),
  };
}

export const dynamic = "force-dynamic";

const faDate = (d: Date | null | undefined) =>
  d ? formatJalaliLong(d as Date) : "—";

const PAYMENT_STATUS_FA: Record<string, string> = {
  initiated: "ایجاد شده",
  pending: "در انتظار تأیید",
  verified: "تأیید‌شده",
  failed: "ناکام",
  refunded: "عودت‌داده‌شده",
  manual_review: "در حال بررسی کارشناس",
};

/**
 * Real case detail for the signed-in client. Everything on this page comes
 * from this user's own rows — ownership is enforced by contactPhone match.
 */
export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const tf = templateT(t);
  const locale = await getServerLocale();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isLawyerSideRole(user.role)) redirect("/dashboard/lawyer");

  // درس E2E: کوئری‌های همراه (مدارک/پرداخت‌ها) در try واحد بودند و هر خطایی
  // کل صفحه را به «پرونده پیدا نشد» تبدیل می‌کرد — حالا هر بخش مستقل است.
  let row: typeof cases.$inferSelect | null = null;
  try {
    const rows = await db
      .select()
      .from(cases)
      .where(and(eq(cases.caseNumber, id), eq(cases.contactPhone, user.phone)))
      .limit(1);
    row = rows[0] ?? null;
  } catch (err) {
    console.error("[dadban] case detail: case query failed:", err);
    row = null;
  }

  let userDocs: typeof documents.$inferSelect[] = [];
  let userPayments: { payment: typeof payments.$inferSelect; consult: typeof consultations.$inferSelect | null }[] = [];
  let relatedRequests: typeof serviceRequests.$inferSelect[] = [];
  if (row) {
    try {
      userDocs = await db.select().from(documents).where(eq(documents.userPhone, user.phone)).orderBy(desc(documents.createdAt)).limit(10);
    } catch (err) {
      console.error("[dadban] case detail: documents query failed:", err);
    }
    try {
      const consultRows = await db
        .select()
        .from(consultations)
        .where(eq(consultations.clientPhone, user.phone))
        .orderBy(desc(consultations.createdAt))
        .limit(20);
      const refs = consultRows.map((c) => c.paymentRef).filter((r): r is string => !!r);
      // یک کوئری با inArray به‌جای N+1
      const payRows =
        refs.length > 0
          ? await db.select().from(payments).where(inArray(payments.reference, refs)).limit(40)
          : [];
      userPayments = payRows.map((payment) => ({
        payment,
        consult: consultRows.find((c) => c.paymentRef === payment.reference) ?? null,
      }));
    } catch (err) {
      console.error("[dadban] case detail: payments/consultations query failed:", err);
    }
    try {
      // درخواست‌های خدماتی که موکل با شماره همین پرونده ثبت کرده —
      // «پرونده در چه حالی است» با کارهای در جریان روی آن کامل می‌شود.
      relatedRequests = await db
        .select()
        .from(serviceRequests)
        .where(and(eq(serviceRequests.caseNumber, row.caseNumber), eq(serviceRequests.userId, user.id)))
        .orderBy(desc(serviceRequests.createdAt))
        .limit(10);
    } catch (err) {
      console.error("[dadban] case detail: related requests query failed:", err);
    }
  }

  if (!row) {
    return (
      <Container className="py-16">
        <EmptyState
          icon="folder"
          title={t("پرونده‌ای با این مشخصات پیدا نشد")}
          desc={t("یا شماره پرونده اشتباه است یا با این حساب دسترسی ندارید. می‌توانید با کد رهگیری، پرونده را پیگیری کنید.")}
        />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button href="/dashboard/cases" icon="folder">{t("پرونده‌های من")}</Button>
          <Button href="/track-case" variant="outline" icon="search">{t("پیگیری با کد رهگیری")}</Button>
        </div>
      </Container>
    );
  }

  const timeline = buildCaseTimeline(row.stage);
  const next = nextActionForCase(row.stage, row.status);

  // ترجمهٔ محتوای DB (موضوع/شهر/شرح پرونده) برای زبان‌های غیرفارسی
  const [subjectT, cityT, descT] = await Promise.all([
    tdyn(locale, row.subject, 300),
    tdyn(locale, row.city, 120),
    row.description ? tdyn(locale, row.description, 700) : Promise.resolve(row.description),
  ]);
  const relatedView = await Promise.all(
    relatedRequests.map(async (r) => ({ ...r, titleT: await tdyn(locale, r.title, 300) })),
  );
  const paymentsView = await Promise.all(
    userPayments.map(async ({ payment, consult }) => ({
      payment,
      consult,
      consultSubjectT: consult ? await tdyn(locale, consult.subject, 300) : null,
    })),
  );

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-dash-cases.png"
        title={tf("پرونده: {s}", { s: subjectT })}
        desc={tf("شماره {cn} • {city} • ثبت‌شده در {date}", { cn: row.caseNumber, city: cityT, date: faDate(row.createdAt) })}
        breadcrumb={[
          { label: t("خانه"), href: "/" },
          { label: t("پنل موکل"), href: "/dashboard/client" },
          { label: t("پرونده‌ها"), href: "/dashboard/cases" },
          { label: row.caseNumber },
        ]}
        badge={tf("وضعیت: {s}", { s: CASE_STATUS_FA[row.status] ?? row.status })}
      >
        <div className="flex flex-wrap items-center gap-2">
          {next.href && (
            <Button href={next.href} variant="accent" icon="arrow" size="sm">{t("اقدام بعدی")}</Button>
          )}
          {row.budget && <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90"><Icon name="money" className="h-3.5 w-3.5 text-[#eec97b]" />{tf("بودجه: {b}", { b: row.budget })}</span>}
        </div>
      </PageHero>

      <Container className="space-y-6 py-10">
        {/* اقدام بعدی — command center for this case */}
        <Card hover={false} className="border-primary/30 bg-primary-soft/40">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="bolt" className="h-5 w-5 text-accent-text" />
            {t(next.action)}
          </h2>
          <p className="mt-1.5 text-sm leading-7 text-foreground-soft">{t(next.detail)}</p>
          {next.href && (
            <Button href={next.href} size="sm" icon="arrow" className="mt-4">{t("همین حالا انجام بده")}</Button>
          )}
        </Card>

        {/* جزئیات ثبتی واقعی */}
        <Card hover={false} className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">{t("موضوع")}</p>
            <p className="mt-1 font-bold text-foreground">{subjectT}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("شهر")}</p>
            <p className="mt-1 font-bold text-foreground">{cityT}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("مرحله فعلی")}</p>
            <p className="mt-1 font-bold text-foreground">{t(row.stage)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("کد رهگیری (برای پیگیری سریع)")}</p>
            <p className="mt-1 font-mono text-sm font-bold text-primary" dir="ltr">{row.trackingToken}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted">{t("شرح پرونده (همان‌طور که ثبت کرده‌اید)")}</p>
            <p className="mt-1 text-sm leading-7 text-foreground-soft">{descT}</p>
          </div>
        </Card>

        {/* مدارک پرونده — آپلود واقعی فایل (پس از اطلاعات پرونده) */}
        <CaseDocumentsManager caseId={row.id} role={user.role} />

        {/* مراحل */}
        <Card hover={false}>
          <h2 className="font-bold text-foreground">{t("مراحل پرونده")}</h2>
          <div className="mt-5 space-y-0">
            {timeline.map((tl, i) => (
              <div key={tl.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                      tl.state === "done"
                        ? "border-success bg-success text-primary-foreground"
                        : tl.state === "current"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-muted"
                    }`}
                  >
                    {tl.state === "done" ? <Icon name="check" className="h-3.5 w-3.5" /> : faNum(i + 1)}
                  </span>
                  {i < timeline.length - 1 && (
                    <span className={`h-8 w-0.5 ${tl.state === "done" ? "bg-success" : "bg-border"}`} />
                  )}
                </div>
                <div className="-mt-0.5 pb-6">
                  <p className={`text-sm font-bold ${tl.state === "current" ? "text-primary" : "text-foreground"}`}>
                    {t(tl.title)}
                    {tl.state === "current" && (
                      <span className="mr-2 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">{t("مرحله فعلی")}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* درخواست‌های خدمات مرتبط با این پرونده */}
        <Card hover={false}>
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="briefcase" className="h-5 w-5 text-accent-text" />
            {t("درخواست‌های خدمات این پرونده")}
          </h2>
          {relatedView.length ? (
            <div className="mt-4 space-y-3">
              {relatedView.map((r) => (
                <a key={r.id} href={`/dashboard/services/${r.id}`} className="block rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-2/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{r.titleT}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-mono" dir="ltr">{r.requestNumber}</span>
                        {r.price ? <> • {faPrice(r.price)}</> : null}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-surface-2 p-4 text-sm leading-7 text-muted">
              {t("برای این پرونده درخواست خدمتی (پیگیری، ابلاغ‌ها، اجرای حکم و…) ثبت نشده است. اگر کاری را می‌خواهید کارشناسان دادورزان برایتان انجام دهند، از")}{" "}
              <Link href="/services" className="font-bold text-primary hover:underline">{t("خدمات پیگیری و انجام امور")}</Link>{" "}
              {t("با ذکر شماره همین پرونده ثبت کنید.")}
            </p>
          )}
        </Card>

        {/* مدارک — real uploads of this user */}
        <Card hover={false}>
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="document" className="h-5 w-5 text-primary" />
            {t("مدارک شما")}
          </h2>
          {userDocs.length ? (
            <ul className="mt-4 divide-y divide-border">
              {userDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Icon name="file" className="h-4 w-4 text-muted" />
                    {d.name}
                  </span>
                  <span className="text-xs text-muted">{d.type} • {faNum(Math.round(d.size / 1024))} {t("کیلوبایت")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-surface-2 p-4 text-sm leading-7 text-muted">
              {t("هنوز مدرکی بارگذاری نکرده‌اید. مدارک از پنل موکل اضافه می‌شوند تا بررسی پرونده سریع‌تر انجام شود.")}
            </p>
          )}
        </Card>

        {/* پرداخت‌ها — real payment facts only */}
        <Card hover={false}>
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="money" className="h-5 w-5 text-primary" />
            {t("پرداخت‌ها")}
          </h2>
          {paymentsView.length ? (
            <ul className="mt-4 divide-y divide-border">
              {paymentsView.map(({ payment, consultSubjectT }) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{consultSubjectT ?? tf("پرداخت {o}", { o: payment.orderType })}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted" dir="ltr">{payment.reference}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground">{faPrice(payment.amount)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{t(PAYMENT_STATUS_FA[payment.status] ?? payment.status)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-surface-2 p-4 text-sm leading-7 text-muted">
              {t("هنوز پرداختی برای شما ثبت نشده است. بعد از تأیید هر خدمت، صورتحساب واقعی همین‌جا نمایش داده می‌شود.")}
            </p>
          )}
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button href="/support" variant="outline" icon="mail">{t("سؤال از پشتیبانی")}</Button>
          <Button href="/consultation" variant="outline" icon="chat">{t("درخواست مشاوره")}</Button>
        </div>
      </Container>
    </>
  );
}
