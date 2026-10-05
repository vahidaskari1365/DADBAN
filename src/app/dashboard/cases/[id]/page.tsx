import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases, documents, payments, consultations, serviceRequests } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import { formatJalaliLong } from "@/lib/jalali";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { CASE_STATUS_FA, buildCaseTimeline, nextActionForCase } from "@/lib/case-facts";
import { StatusBadge } from "@/components/managed";

export const metadata: Metadata = {
  title: "پرونده من — دادبان",
  description: "جزئیات واقعی پرونده، مراحل، مدارک و پرداخت‌های شما.",
};

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
      const pays: typeof payments.$inferSelect[] = [];
      // Fetch each payment by its unique reference (indexed) — simple and safe.
      for (const r of refs) {
        const pr = await db.select().from(payments).where(eq(payments.reference, r)).limit(1);
        if (pr[0]) pays.push(pr[0]);
      }
      userPayments = pays.map((payment) => ({
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
          title="پرونده‌ای با این مشخصات پیدا نشد"
          desc="یا شماره پرونده اشتباه است یا با این حساب دسترسی ندارید. می‌توانید با کد رهگیری، پرونده را پیگیری کنید."
        />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button href="/dashboard/cases" icon="folder">پرونده‌های من</Button>
          <Button href="/track-case" variant="outline" icon="search">پیگیری با کد رهگیری</Button>
        </div>
      </Container>
    );
  }

  const timeline = buildCaseTimeline(row.stage);
  const next = nextActionForCase(row.stage, row.status);

  return (
    <>
      <PageHero
        title={`پرونده: ${row.subject}`}
        desc={`شماره ${row.caseNumber} • ${row.city} • ثبت‌شده در ${faDate(row.createdAt)}`}
        breadcrumb={[
          { label: "خانه", href: "/" },
          { label: "پنل موکل", href: "/dashboard/client" },
          { label: "پرونده‌ها", href: "/dashboard/cases" },
          { label: row.caseNumber },
        ]}
        badge={`وضعیت: ${CASE_STATUS_FA[row.status] ?? row.status}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {next.href && (
            <Button href={next.href} icon="arrow" size="sm">اقدام بعدی</Button>
          )}
          {row.budget && <Badge tone="neutral" icon="money">بودجه: {row.budget}</Badge>}
        </div>
      </PageHero>

      <Container className="space-y-6 py-10">
        {/* اقدام بعدی — command center for this case */}
        <Card hover={false} className="border-primary/30 bg-primary-soft/40">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="bolt" className="h-5 w-5 text-accent-text" />
            {next.action}
          </h2>
          <p className="mt-1.5 text-sm leading-7 text-foreground-soft">{next.detail}</p>
          {next.href && (
            <Button href={next.href} size="sm" icon="arrow" className="mt-4">همین حالا انجام بده</Button>
          )}
        </Card>

        {/* جزئیات ثبتی واقعی */}
        <Card hover={false} className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted">موضوع</p>
            <p className="mt-1 font-bold text-foreground">{row.subject}</p>
          </div>
          <div>
            <p className="text-xs text-muted">شهر</p>
            <p className="mt-1 font-bold text-foreground">{row.city}</p>
          </div>
          <div>
            <p className="text-xs text-muted">مرحله فعلی</p>
            <p className="mt-1 font-bold text-foreground">{row.stage}</p>
          </div>
          <div>
            <p className="text-xs text-muted">کد رهگیری (برای پیگیری سریع)</p>
            <p className="mt-1 font-mono text-sm font-bold text-primary" dir="ltr">{row.trackingToken}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted">شرح پرونده (همان‌طور که ثبت کرده‌اید)</p>
            <p className="mt-1 text-sm leading-7 text-foreground-soft">{row.description}</p>
          </div>
        </Card>

        {/* مراحل */}
        <Card hover={false}>
          <h2 className="font-bold text-foreground">مراحل پرونده</h2>
          <div className="mt-5 space-y-0">
            {timeline.map((t, i) => (
              <div key={t.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                      t.state === "done"
                        ? "border-success bg-success text-primary-foreground"
                        : t.state === "current"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-muted"
                    }`}
                  >
                    {t.state === "done" ? <Icon name="check" className="h-3.5 w-3.5" /> : faNum(i + 1)}
                  </span>
                  {i < timeline.length - 1 && (
                    <span className={`h-8 w-0.5 ${t.state === "done" ? "bg-success" : "bg-border"}`} />
                  )}
                </div>
                <div className="-mt-0.5 pb-6">
                  <p className={`text-sm font-bold ${t.state === "current" ? "text-primary" : "text-foreground"}`}>
                    {t.title}
                    {t.state === "current" && (
                      <span className="mr-2 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">مرحله فعلی</span>
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
            درخواست‌های خدمات این پرونده
          </h2>
          {relatedRequests.length ? (
            <div className="mt-4 space-y-3">
              {relatedRequests.map((r) => (
                <a key={r.id} href={`/dashboard/services/${r.id}`} className="block rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-surface-2/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground">{r.title}</p>
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
              برای این پرونده درخواست خدمتی (پیگیری، ابلاغ‌ها، اجرای حکم و…) ثبت نشده است. اگر کاری را می‌خواهید کارشناسان دادبان برایتان انجام دهند، از <Link href="/services" className="font-bold text-primary hover:underline">خدمات پیگیری و انجام امور</Link> با ذکر شماره همین پرونده ثبت کنید.
            </p>
          )}
        </Card>

        {/* مدارک — real uploads of this user */}
        <Card hover={false}>
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="document" className="h-5 w-5 text-primary" />
            مدارک شما
          </h2>
          {userDocs.length ? (
            <ul className="mt-4 divide-y divide-border">
              {userDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Icon name="file" className="h-4 w-4 text-muted" />
                    {d.name}
                  </span>
                  <span className="text-xs text-muted">{d.type} • {faNum(Math.round(d.size / 1024))} کیلوبایت</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-surface-2 p-4 text-sm leading-7 text-muted">
              هنوز مدرکی بارگذاری نکرده‌اید. مدارک از پنل موکل اضافه می‌شوند تا بررسی پرونده سریع‌تر انجام شود.
            </p>
          )}
        </Card>

        {/* پرداخت‌ها — real payment facts only */}
        <Card hover={false}>
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="money" className="h-5 w-5 text-primary" />
            پرداخت‌ها
          </h2>
          {userPayments.length ? (
            <ul className="mt-4 divide-y divide-border">
              {userPayments.map(({ payment, consult }) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{consult ? consult.subject : `پرداخت ${payment.orderType}`}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted" dir="ltr">{payment.reference}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground">{faPrice(payment.amount)}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{PAYMENT_STATUS_FA[payment.status] ?? payment.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-surface-2 p-4 text-sm leading-7 text-muted">
              هنوز پرداختی برای شما ثبت نشده است. بعد از تأیید هر خدمت، صورتحساب واقعی همین‌جا نمایش داده می‌شود.
            </p>
          )}
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button href="/support" variant="outline" icon="mail">سؤال از پشتیبانی</Button>
          <Button href="/consultation" variant="outline" icon="chat">درخواست مشاوره</Button>
        </div>
      </Container>
    </>
  );
}
