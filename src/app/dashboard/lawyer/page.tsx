import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { installments, creditRequests, caseProposals } from "@/db/schema-marketplace";
import { and, eq, inArray } from "drizzle-orm";
import { DashboardShell, StatCard, StatusBadge, Progress } from "@/components/dashboard-shell";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { formatToman, labelStatus, shortToman, toFa, formatJalali, formatTime } from "@/lib/money";
import {
  computeLawyerFinance,
  fetchMarketItems,
  getCaseEvents,
  getCaseMessages,
  getLawyerAppointments,
  getMyCases,
  resolveLawyerContext,
} from "@/components/portal/lawyer/portal-server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { CaseTimeline } from "@/components/portal/lawyer/case-timeline";
import { EventLogger } from "@/components/portal/lawyer/event-logger";
import { MessagesPanel } from "@/components/portal/lawyer/messages-panel";
import { InstallmentsPanel } from "@/components/portal/lawyer/installments-panel";
import { DpToaster } from "@/components/portal/lawyer/toaster";

export const metadata: Metadata = {
  title: "پنل وکیل — داشبورد",
  description: "مدیریت متمرکز پرونده‌ها، قراردادها، اقساط و درآمد برای وکلای دادپیو.",
};
export const dynamic = "force-dynamic";

type InstallmentView = { id: number; number: number; amount: string; dueDate: string; status: string; source: string };
type CreditView = { provider: string; amount: string; months: number; status: string; statusDetail: string; referenceCode: string } | null;

export default async function LawyerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const ctx = await resolveLawyerContext(user);
  const canWrite = !ctx.demo;

  const [suggestions, myCases, finance, upcoming] = await Promise.all([
    fetchMarketItems(ctx.lawyer, { limit: 2 }),
    getMyCases(ctx.lawyerId),
    computeLawyerFinance(ctx.lawyerId),
    getLawyerAppointments(ctx.lawyerId, { upcomingOnly: true, limit: 6 }),
  ]);

  const openCases = myCases.filter((c) => c.status !== "closed");
  const selectedCase =
    myCases.find((c) => String(c.id) === String(sp.case)) ?? openCases[0] ?? myCases[0] ?? null;

  const [events, messages] = selectedCase
    ? await Promise.all([getCaseEvents(selectedCase.id), getCaseMessages(selectedCase.id, 20)])
    : [[], []];

  let pendingProposals = 0;
  let installmentViews: InstallmentView[] = [];
  let credit: CreditView = null;
  try {
    const pRows = (await db
      .select({ id: caseProposals.id })
      .from(caseProposals)
      .where(and(eq(caseProposals.lawyerId, ctx.lawyerId), inArray(caseProposals.status, ["pending", "negotiating"])))
      .limit(50)) as { id: number }[];
    pendingProposals = (Array.isArray(pRows) ? pRows : []).length;
  } catch {
    pendingProposals = 0;
  }

  if (selectedCase) {
    try {
      const iRows = (await db
        .select()
        .from(installments)
        .where(eq(installments.caseId, selectedCase.id))
        .limit(40)) as (typeof installments.$inferSelect)[];
      installmentViews = (Array.isArray(iRows) ? iRows : []).map((i) => ({
        id: i.id,
        number: i.number,
        amount: String(i.amount ?? "0"),
        dueDate: (i.dueDate instanceof Date ? i.dueDate : new Date(i.dueDate)).toISOString(),
        status: String(i.status),
        source: String(i.source),
      }));
      const cRows = (await db
        .select()
        .from(creditRequests)
        .where(eq(creditRequests.caseId, selectedCase.id))
        .limit(10)) as (typeof creditRequests.$inferSelect)[];
      const latest = (Array.isArray(cRows) ? cRows : []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      if (latest) {
        credit = {
          provider: String(latest.provider),
          amount: String(latest.amount ?? "0"),
          months: latest.months,
          status: String(latest.status),
          statusDetail: latest.statusDetail,
          referenceCode: latest.referenceCode,
        };
      }
    } catch {
      /* degraded */
    }
  }

  const contracts = myCases.filter((c) => c.contractStatus !== "none" && c.contractStatus !== "");

  const netTotal = Math.max(
    0,
    finance.ledger.filter((r) => r.type === "payment").reduce((s, r) => s + r.amount, 0) -
      finance.ledger.filter((r) => r.type === "commission").reduce((s, r) => s + r.amount, 0),
  );

  return (
    <DashboardShell
      role="وکیل"
      title="داشبورد وکیل"
      subtitle="مدیریت متمرکز پرونده‌ها، قراردادها و درآمد"
      userName={ctx.lawyer?.name ?? user.name}
      userRole={ctx.demo ? "وکیل · حالت نمایش" : ctx.lawyerTitle}
      nav={lawyerNav("dashboard", { proposals: pendingProposals ? toFa(pendingProposals) : undefined })}
      actions={
        <Link
          href="/dashboard/lawyer/market"
          className="btn-gold inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold"
        >
          <Icon name="scale" className="h-4 w-4" />
          بازار پرونده‌ها
        </Link>
      }
    >
      <DpToaster />

      {/* ===== آمار ===== */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="پرونده فعال" value={toFa(openCases.length)} hint="پرونده‌های در جریان شما" icon="folder" />
        <StatCard
          label="پیشنهادهای در انتظار"
          value={toFa(pendingProposals)}
          hint="در انتظار پاسخ موکل"
          tone="gold"
          icon="send"
        />
        <StatCard
          label="دریافتی (پس از کمیسیون)"
          value={shortToman(netTotal)}
          hint="مجموع تراکنش‌های ثبت‌شده"
          tone="success"
          icon="money"
        />
        <StatCard
          label="امتیاز حرفه‌ای"
          value={toFa(Number(ctx.lawyer?.rating ?? 0).toFixed(1))}
          hint={`از ۵ · ${toFa(ctx.lawyer?.reviewCount ?? 0)} نظر موکلان`}
          icon="star"
        />
      </div>

      {/* ===== پیشنهادی‌ها + روند پرونده ===== */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card hover={false}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
              <Icon name="sparkles" className="h-5 w-5 text-accent" />
              پرونده‌های پیشنهادی برای شما
            </h2>
            <Link href="/dashboard/lawyer/market" className="text-xs font-semibold text-primary hover:text-primary-hover">
              مشاهده همه
            </Link>
          </div>
          <div className="space-y-3">
            {suggestions.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                در حال حاضر پروندهٔ باز مناسبی در بازار نیست.
              </p>
            )}
            {suggestions.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <b className="text-sm text-foreground">{c.subject}</b>
                    <p className="mt-1 text-xs text-muted">
                      پرونده {toFa(c.caseNumber)} · {c.city} · تطبیق هوشمند {toFa(c.matchScore)}٪
                    </p>
                  </div>
                  <b className="dp-money whitespace-nowrap text-[13px]">{c.budget ?? "—"}</b>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">{c.description}</p>
                <Link
                  href="/dashboard/lawyer/market"
                  className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
                >
                  <Icon name="send" className="h-3.5 w-3.5" />
                  ارسال پیشنهاد قیمت
                </Link>
              </div>
            ))}
          </div>
        </Card>

        <Card hover={false}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-foreground">روند یک پرونده فعال</h2>
            {selectedCase && (
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                پرونده {toFa(selectedCase.caseNumber)}
              </span>
            )}
          </div>
          {selectedCase ? (
            <>
              <Progress value={selectedCase.progress} />
              <p className="mb-4 mt-1.5 text-[11px] text-muted">{toFa(selectedCase.progress)}٪ پیشرفت · {selectedCase.stage}</p>
              <CaseTimeline events={events} progress={selectedCase.progress} />
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              هنوز پرونده فعالی ندارید؛ از بازار پرونده‌ها پیشنهاد ارسال کنید.
            </p>
          )}
        </Card>
      </div>

      {/* ===== پیام‌ها + جلسات ===== */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card hover={false}>
          <section id="messages" className="scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-foreground">
              <Icon name="mail" className="h-5 w-5 text-primary" />
              آخرین پیام‌ها
            </h2>
            {selectedCase ? (
              <MessagesPanel
                caseId={selectedCase.id}
                caseLabel={`${toFa(selectedCase.caseNumber)} · ${selectedCase.subject}`}
                initialMessages={messages}
                meName={user.name}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                برای گفتگو ابتدا یک پرونده فعال داشته باشید.
              </p>
            )}
          </section>
        </Card>

        <Card hover={false}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
              <Icon name="calendar" className="h-5 w-5 text-primary" />
              جلسات پیش‌رو
            </h2>
            <Link href="/dashboard/lawyer/calendar" className="text-xs font-semibold text-primary hover:text-primary-hover">
              تقویم کامل
            </Link>
          </div>
          <div className="max-h-96 space-y-2.5 overflow-y-auto pl-1">
            {upcoming.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                جلسه یا مهلتی در پیش‌رو ثبت نشده است.
              </p>
            )}
            {upcoming.map((a) => {
              const s = labelStatus("appointment", a.kind);
              return (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <b className="block truncate text-[13px] text-foreground">{a.title}</b>
                    <small className="mt-0.5 block text-[11px] text-muted">
                      {formatJalali(a.startsAt)} · {toFa(formatTime(a.startsAt))}
                      {a.location ? ` · ${a.location}` : ""}
                    </small>
                  </div>
                  <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ===== پرونده‌های من ===== */}
      <section id="my-cases" className="mt-6 scroll-mt-24">
        <Card hover={false}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
              <Icon name="briefcase" className="h-5 w-5 text-primary" />
              پرونده‌های من
            </h2>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">{toFa(myCases.length)} پرونده</span>
          </div>
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[680px] border-collapse text-right">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="border-b border-border px-3 py-2.5 font-medium">پرونده</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">موکل</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">مرحله</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">مبلغ قرارداد</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">وضعیت</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {myCases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted">
                      پرونده‌ای به شما ارجاع نشده است؛ از «بازار پرونده‌ها» شروع کنید.
                    </td>
                  </tr>
                )}
                {myCases.map((c) => {
                  const s = labelStatus("case", String(c.status));
                  return (
                    <tr key={c.id} className="text-[13px]">
                      <td className="border-b border-border px-3 py-3">
                        <b className="text-foreground">{toFa(c.caseNumber)}</b>
                        <small className="mt-0.5 block text-[11px] text-muted">{c.subject}</small>
                      </td>
                      <td className="border-b border-border px-3 py-3 text-muted">{c.contactName}</td>
                      <td className="border-b border-border px-3 py-3 text-muted">{c.stage}</td>
                      <td className="border-b border-border px-3 py-3 dp-money">{formatToman(c.feeAgreed)}</td>
                      <td className="border-b border-border px-3 py-3">
                        <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                      </td>
                      <td className="border-b border-border px-3 py-3">
                        <Link
                          href={`/dashboard/lawyer?case=${c.id}#caseflow`}
                          className="inline-flex h-10 items-center rounded-xl bg-surface-2 px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary-soft"
                        >
                          ورود
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* ===== اقساط و تأمین اعتبار ===== */}
      <section id="installments" className="mt-6 scroll-mt-24">
        <Card hover={false}>
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-foreground">
            <Icon name="calculator" className="h-5 w-5 text-primary" />
            اقساط و تأمین اعتبار حق‌الوکاله
            {selectedCase && (
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
                پرونده {toFa(selectedCase.caseNumber)}
              </span>
            )}
          </h2>
          {selectedCase ? (
            <InstallmentsPanel
              caseId={selectedCase.id}
              caseLabel={`${toFa(selectedCase.caseNumber)} · ${selectedCase.subject}`}
              feeAgreed={selectedCase.feeAgreed ? String(selectedCase.feeAgreed) : null}
              initialInstallments={installmentViews}
              initialCredit={credit}
              canWrite={canWrite}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              پس از تعیین وکیل و عقد قرارداد، برنامه اقساط این‌جا نمایش داده می‌شود.
            </p>
          )}
        </Card>
      </section>

      {/* ===== روند پرونده ===== */}
      <section id="caseflow" className="mt-6 scroll-mt-24">
        <Card hover={false}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                <Icon name="clock" className="h-5 w-5 text-primary" />
                روند پرونده {selectedCase ? toFa(selectedCase.caseNumber) : ""}
              </h2>
              <p className="mt-1 text-xs text-muted">موکل در هر مرحله می‌تواند اقدامات انجام‌شده و اسناد مربوط را مشاهده کند.</p>
            </div>
            <EventLogger caseId={selectedCase?.id ?? 0} canWrite={canWrite && !!selectedCase} />
          </div>
          {selectedCase ? (
            <>
              <Progress value={selectedCase.progress} />
              <p className="mb-4 mt-1.5 text-[11px] text-muted">{toFa(selectedCase.progress)}٪ پیشرفت</p>
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <CaseTimeline events={events} progress={selectedCase.progress} />
                <div className="space-y-3">
                  <div className="rounded-xl border border-border p-3.5">
                    <b className="text-[13px] text-foreground">اقدامات اخیر وکیل</b>
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pl-1">
                      {events.filter((e) => e.actor === "lawyer" || e.actor === "trainee").slice(-3).reverse().map((e) => (
                        <div key={e.id} className="rounded-lg bg-surface-2/60 p-2.5">
                          <b className="block text-xs text-foreground">{e.title}</b>
                          <small className="mt-0.5 block text-[11px] text-muted">{formatJalali(e.createdAt)} · {e.description}</small>
                        </div>
                      ))}
                      {events.filter((e) => e.actor === "lawyer" || e.actor === "trainee").length === 0 && (
                        <p className="p-3 text-center text-xs text-muted">اقدامی ثبت نشده است.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3.5">
                    <b className="text-[13px] text-foreground">اطلاع‌رسانی به موکل</b>
                    <p className="mt-2 text-xs text-muted">
                      آخرین اقدام قابل مشاهده:{" "}
                      <b className="text-foreground-soft">{[...events].reverse().find((e) => e.visibleToClient)?.title ?? "—"}</b>
                    </p>
                    <p className="mt-1.5 text-xs text-muted">
                      در حال حاضر اقدامی از طرف موکل لازم نیست.
                    </p>
                  </div>
                  {contracts.length > 0 && (
                    <div className="rounded-xl border border-border p-3.5">
                      <b className="text-[13px] text-foreground">قراردادهای الکترونیکی</b>
                      <div className="mt-2 space-y-2">
                        {contracts.slice(0, 3).map((c) => {
                          const s = labelStatus("contract", c.contractStatus);
                          return (
                            <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2/60 px-2.5 py-2">
                              <small className="font-mono text-[11px] text-muted" dir="ltr">{c.contractCode || "—"}</small>
                              <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              پرونده‌ای برای نمایش روند وجود ندارد.
            </p>
          )}
        </Card>
      </section>
    </DashboardShell>
  );
}
