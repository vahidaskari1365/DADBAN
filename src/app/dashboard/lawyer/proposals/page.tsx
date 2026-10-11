import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatusBadge } from "@/components/panel-widgets";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { formatToman, formatJalali, labelStatus, toFa } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";
import { getMyCases, getMyProposals, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { SignContractButton } from "@/components/portal/lawyer/sign-contract-button";
import { DpToaster } from "@/components/portal/lawyer/toaster";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پنل وکیل — پیشنهادهای قیمت و قراردادها"),
    description: t("پیگیری وضعیت پیشنهادهای قیمت ارسال‌شده و قراردادهای الکترونیکی موکلان."),
  };
}
export const dynamic = "force-dynamic";

export default async function LawyerProposalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const tf = templateT(t);

  const ctx = await resolveLawyerContext(user);
  const [proposals, myCases] = await Promise.all([getMyProposals(ctx.lawyerId), getMyCases(ctx.lawyerId)]);
  const contracts = myCases.filter((c) => c.contractStatus !== "none" && c.contractStatus !== "");
  const pendingCount = proposals.filter((p) => p.status === "pending" || p.status === "negotiating").length;

  return (
    <DashboardShell
      role="وکیل"
      title={t("پیشنهادهای قیمت")}
      subtitle={t("وضعیت پیشنهادهای شما و قراردادهای حاصل از پذیرش موکل")}
      userName={ctx.lawyer?.name ?? user.name}
      userRole={ctx.demo ? t("وکیل · حالت نمایش") : t(ctx.lawyerTitle)}
      nav={lawyerNav("proposals", { proposals: pendingCount ? toFa(pendingCount) : undefined })}
    >
      <DpToaster />

      <section id="proposals" className="scroll-mt-24">
        <Card hover={false}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground">
              <Icon name="send" className="h-5 w-5 text-primary" />
              {t("پیشنهادهای قیمت ارسال‌شده")}
            </h2>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">
              {tf("{n} پیشنهاد", { n: toFa(proposals.length) })}
            </span>
          </div>

          <div className="max-h-[640px] space-y-3 overflow-y-auto pl-1">
            {proposals.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted">{t("هنوز پیشنهادی ارسال نکرده‌اید.")}</p>
                <Link
                  href="/dashboard/lawyer/market"
                  className="btn-gold mt-3 inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold"
                >
                  <Icon name="scale" className="h-4 w-4" />
                  {t("رفتن به بازار پرونده‌ها")}
                </Link>
              </div>
            )}
            {proposals.map((p) => {
              const s = labelStatus("proposal", p.status);
              return (
                <article key={p.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <b className="text-sm text-foreground">
                        {p.caseSubject} · {p.city}
                      </b>
                      <p className="mt-1 text-xs text-muted">
                        {tf("پرونده {n} · ارسال {d}", { n: toFa(p.caseNumber), d: formatJalali(p.createdAt) })}
                        {p.durationMonths > 0 ? ` · ${tf("مدت {n} ماه", { n: toFa(p.durationMonths) })}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="dp-money text-sm">{formatToman(p.amount)}</b>
                      <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge>
                    </div>
                  </div>
                  {p.note && <p className="mt-2 text-[13px] leading-6 text-muted">{p.note}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {tf("تطبیق AI: {n}٪", { n: toFa(p.aiMatchScore) })}
                    </span>
                    {(p.status === "pending" || p.status === "negotiating") && (
                      <Link
                        href={`/dashboard/lawyer?case=${p.caseId}#caseflow`}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-surface-2 px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary-soft"
                      >
                        <Icon name="chat" className="h-3.5 w-3.5" />
                        {t("گفتگو با موکل")}
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </Card>
      </section>

      <section id="contracts" className="mt-6 scroll-mt-24">
        <Card hover={false}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[16px] font-bold text-foreground">
              <Icon name="file" className="h-5 w-5 text-primary" />
              {t("قراردادهای الکترونیکی")}
            </h2>
            <Link href="/dashboard/lawyer/market" className="btn-gold inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold">
              <Icon name="plus" className="h-4 w-4" />
              {t("ایجاد فرصت قرارداد جدید")}
            </Link>
          </div>

          <div className="max-h-96 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[640px] border-collapse text-right">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("شماره")}</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("پرونده")}</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("مبلغ")}</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("وضعیت امضا")}</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("اقدام")}</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted">
                      {t("با پذیرش پیشنهاد شما از سوی موکل، قرارداد الکترونیکی این‌جا نمایش داده می‌شود.")}
                    </td>
                  </tr>
                )}
                {contracts.map((c) => {
                  const s = labelStatus("contract", c.contractStatus);
                  return (
                    <tr key={c.id} className="text-[13px]">
                      <td className="border-b border-border px-3 py-3 font-mono text-xs" dir="ltr">
                        {c.contractCode || "—"}
                      </td>
                      <td className="border-b border-border px-3 py-3">
                        <b className="text-foreground">{toFa(c.caseNumber)}</b>
                        <small className="mt-0.5 block text-[11px] text-muted">{c.subject}</small>
                      </td>
                      <td className="border-b border-border px-3 py-3 dp-money">{formatToman(c.feeAgreed)}</td>
                      <td className="border-b border-border px-3 py-3">
                        <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge>
                      </td>
                      <td className="border-b border-border px-3 py-3">
                        <SignContractButton caseId={c.id} signed={String(c.contractStatus) === "signed"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            {t("پس از پذیرش پیشنهاد، قرارداد با کد CN-سال-پرونده صادر و برای امضای طرفین ارسال می‌شود؛ امضای موکل از پنل او انجام می‌گیرد.")}
          </p>
        </Card>
      </section>
    </DashboardShell>
  );
}
