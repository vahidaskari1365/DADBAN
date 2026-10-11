import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { StatCard } from "@/components/panel-widgets";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { formatToman, formatJalali, shortToman, toFa } from "@/lib/money";
import { computeLawyerFinance, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { PayoutPanel } from "@/components/portal/lawyer/payout-panel";
import { DpToaster } from "@/components/portal/lawyer/toaster";

export const metadata: Metadata = {
  title: "پنل وکیل — مالی و برداشت",
  description: "موجودی قابل برداشت، تسویه‌ها، کمیسیون پلتفرم و تراکنش‌های حق‌الوکاله.",
};
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

  const ctx = await resolveLawyerContext(user);
  const finance = await computeLawyerFinance(ctx.lawyerId);

  return (
    <DashboardShell
      role="وکیل"
      title="مالی و برداشت"
      subtitle="شفافیت کامل تراکنش‌ها، کمیسیون و تسویهٔ حق‌الوکاله"
      userName={ctx.lawyer?.name ?? user.name}
      userRole={ctx.demo ? "وکیل · حالت نمایش" : ctx.lawyerTitle}
      nav={lawyerNav("finance")}
    >
      <DpToaster />

      {/* کارت‌های مالی */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="موجودی قابل برداشت" value={shortToman(finance.available)} hint="قابل تسویه" tone="success" icon="money" />
        <StatCard label="در انتظار تسویه" value={shortToman(finance.pendingSettlement)} hint="طبق برنامه پرداخت اقساط" tone="gold" icon="clock" />
        <StatCard label="کمیسیون پلتفرم" value={shortToman(finance.monthCommission)} hint="ماه جاری" icon="landmark" />
        <StatCard
          label="قرارداد اقساطی فعال"
          value={toFa(finance.activeInstallmentContracts)}
          hint="پرونده با برنامه اقساط"
          icon="calculator"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* تراکنش‌ها */}
        <Card hover={false}>
          <h2 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-foreground">
            <Icon name="balance" className="h-5 w-5 text-primary" />
            تراکنش‌های اخیر
          </h2>
          <div className="max-h-96 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[560px] border-collapse text-right">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="border-b border-border px-3 py-2.5 font-medium">شرح</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">مبلغ</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">تاریخ</th>
                  <th className="border-b border-border px-3 py-2.5 font-medium">نوع</th>
                </tr>
              </thead>
              <tbody>
                {finance.ledger.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted">
                      تراکنشی ثبت نشده است؛ پس از پرداخت موکل این‌جا نمایش داده می‌شود.
                    </td>
                  </tr>
                )}
                {finance.ledger.map((t) => {
                  const s = LEDGER_LABEL[t.type] ?? { label: t.type, tone: "gray" as const };
                  return (
                    <tr key={t.id} className="text-[13px]">
                      <td className="border-b border-border px-3 py-3 text-foreground">{t.description || "—"}</td>
                      <td className="border-b border-border px-3 py-3 dp-money whitespace-nowrap">{formatToman(t.amount)}</td>
                      <td className="border-b border-border px-3 py-3 text-muted whitespace-nowrap">{formatJalali(t.createdAt)}</td>
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
                          {s.label}
                          {t.type === "payment" && t.commission > 0 ? ` · کمیسیون ${shortToman(t.commission)}` : ""}
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
            درخواست‌های برداشت
          </h2>
          <PayoutPanel available={finance.available} payouts={finance.payouts} canWrite={!ctx.demo} />
          <p className="mt-4 rounded-xl bg-surface-2/60 p-3 text-[11px] leading-6 text-muted">
            کمیسیون پلتفرم هنگام هر واریز محاسبه و کسر می‌شود؛ مبلغ قابل برداشت همیشه پس از کسر کمیسیون و برداشت‌های جاری است.
          </p>
        </Card>
      </div>
    </DashboardShell>
  );
}
