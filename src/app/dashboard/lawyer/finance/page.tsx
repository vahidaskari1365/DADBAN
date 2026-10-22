import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/panel-widgets";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { formatToman, formatJalali, shortToman, toFa } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";
import { computeLawyerFinance, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { PayoutPanel } from "@/components/portal/lawyer/payout-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پنل وکیل — مالی و برداشت"),
    description: t("موجودی قابل برداشت، تسویه‌ها، کمیسیون پلتفرم و تراکنش‌های حق‌الوکاله."),
  };
}
export const dynamic = "force-dynamic";

const LEDGER_LABEL: Record<string, { label: string; tone: "green" | "gold" | "gray" | "red" | "cyan" }> = {
  payment: { label: "واریز موکل", tone: "green" },
  commission: { label: "کمیسیون پلتفرم", tone: "gold" },
  payout: { label: "برداشت", tone: "cyan" },
  refund: { label: "عودت", tone: "red" },
};

export default async function LawyerFinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const tf = templateT(t);

  const ctx = await resolveLawyerContext(user);
  const finance = await computeLawyerFinance(ctx.lawyerId);

  return (
    <DashboardShell
      role="وکیل"
      title={t("مالی و برداشت")}
      subtitle={t("شفافیت کامل تراکنش‌ها، کمیسیون و تسویهٔ حق‌الوکاله")}
      userName={ctx.lawyer?.name ?? user.name}
      photoUrl={ctx.lawyer?.photoUrl ?? null}
      userRole={ctx.demo ? t("وکیل · حالت نمایش") : t(ctx.lawyerTitle)}
      nav={lawyerNav("finance")}
    >

      {/* کارت‌های مالی */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("موجودی قابل برداشت")} value={shortToman(finance.available)} hint={t("قابل تسویه")} tone="success" icon="money" />
        <StatCard label={t("در انتظار تسویه")} value={shortToman(finance.pendingSettlement)} hint={t("طبق برنامه پرداخت اقساط")} tone="gold" icon="clock" />
        <StatCard label={t("کمیسیون پلتفرم")} value={shortToman(finance.monthCommission)} hint={t("ماه جاری")} icon="landmark" />
        <StatCard
          label={t("قرارداد اقساطی فعال")}
          value={toFa(finance.activeInstallmentContracts)}
          hint={t("پرونده با برنامه اقساط")}
          icon="calculator"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* تراکنش‌ها */}
        <Card hover={false}>
          <h2 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-foreground">
            <Icon name="balance" className="h-5 w-5 text-primary" />
            {t("تراکنش‌های اخیر")}
          </h2>
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[560px] border-collapse text-right">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("شرح")}</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("مبلغ")}</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("تاریخ")}</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">{t("نوع")}</th>
                </tr>
              </thead>
              <tbody>
                {finance.ledger.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted">
                      {t("تراکنشی ثبت نشده است؛ پس از پرداخت موکل این‌جا نمایش داده می‌شود.")}
                    </td>
                  </tr>
                )}
                {finance.ledger.map((tx) => {
                  const s = LEDGER_LABEL[tx.type] ?? { label: tx.type, tone: "gray" as const };
                  return (
                    <tr key={tx.id} className="text-[13px]">
                      <td className="border-b border-border px-3 py-3 text-foreground">{tx.description || "—"}</td>
                      <td className="border-b border-border px-3 py-3 dp-money whitespace-nowrap">{formatToman(tx.amount)}</td>
                      <td className="border-b border-border px-3 py-3 text-muted whitespace-nowrap">{formatJalali(tx.createdAt)}</td>
                      <td className="border-b border-border px-3 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            s.tone === "green"
                              ? "bg-success/10 text-success"
                              : s.tone === "gold"
                                ? "bg-accent/15 text-accent"
                                : s.tone === "red"
                                  ? "bg-danger/10 text-danger"
                                  : "bg-cyan/15 text-[#1d7a8c]"
                          }`}
                        >
                          {t(s.label)}
                          {tx.type === "payment" && tx.commission > 0 ? ` · ${tf("کمیسیون {n}", { n: shortToman(tx.commission) })}` : ""}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* برداشت */}
        <Card hover={false}>
          <h2 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-foreground">
            <Icon name="money" className="h-5 w-5 text-primary" />
            {t("درخواست‌های برداشت")}
          </h2>
          <PayoutPanel available={finance.available} payouts={finance.payouts} canWrite={!ctx.demo} />
          <p className="mt-4 rounded-xl bg-surface-2/60 p-3 text-[11px] leading-6 text-muted">
            {t("کمیسیون پلتفرم هنگام هر واریز محاسبه و کسر می‌شود؛ مبلغ قابل برداشت همیشه پس از کسر کمیسیون و برداشت‌های جاری است.")}
          </p>
        </Card>
      </div>
    </DashboardShell>
  );
}
