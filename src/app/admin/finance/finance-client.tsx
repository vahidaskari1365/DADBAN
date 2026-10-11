"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard, StatusBadge } from "@/components/panel-widgets";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatToman, shortToman, formatJalali, labelStatus, toFa } from "@/lib/money";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

type LedgerRow = {
  id: number;
  caseId: number | null;
  lawyerId: number | null;
  type: string;
  amount: string;
  commission: string;
  description: string;
  createdAt: Date;
};
type PayoutRow = {
  id: number;
  lawyerId: number;
  lawyerName: string | null;
  amount: string;
  status: string;
  iban: string;
  note: string;
  createdAt: Date;
  processedAt: Date | null;
};
type LateRow = {
  id: number;
  caseId: number;
  number: number;
  amount: string;
  dueDate: Date;
  status: string;
  caseSubject: string | null;
};

const LEDGER_TYPES: { value: string; label: string }[] = [
  { value: "all", label: "همه تراکنش‌ها" },
  { value: "payment", label: "پرداخت" },
  { value: "commission", label: "کمیسیون" },
  { value: "payout", label: "برداشت" },
  { value: "refund", label: "بازگشت" },
];

export default function FinanceClient({
  totals,
  ledger,
  payouts,
  lateInstallments,
}: {
  totals: { payments: number; commission: number; openPayouts: number; activeInstallments: number };
  ledger: LedgerRow[];
  payouts: PayoutRow[];
  lateInstallments: LateRow[];
}) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [typeFilter, setTypeFilter] = useState("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setToast({ ok, text });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function setPayoutStatus(p: PayoutRow, status: string, label: string) {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/marketplace/payouts/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        flash(true, tf("وضعیت برداشت «{name}» به «{status}» تغییر کرد.", { name: p.lawyerName ?? toFa(p.lawyerId), status: label }));
        router.refresh();
      } else if (res.status === 401) {
        flash(false, t("نشست ادمین منقضی شده؛ دوباره وارد شوید."));
      } else {
        flash(false, t("تغییر وضعیت ناموفق بود؛ دوباره تلاش کنید."));
      }
    } catch {
      flash(false, t("خطای شبکه؛ اتصال خود را بررسی کنید."));
    } finally {
      setBusyId(null);
    }
  }

  const filteredLedger = typeFilter === "all" ? ledger : ledger.filter((r) => r.type === typeFilter);
  const commissionRate =
    totals.payments > 0 ? tf("حدود {n}٪ از پرداخت‌ها", { n: toFa(Math.round((totals.commission / totals.payments) * 100)) }) : "—";

  const th = "p-3 text-xs font-bold text-muted whitespace-nowrap";
  const td = "p-3 text-sm";

  return (
    <div>
      {/* ---------------- آمار مالی ---------------- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("حجم پرداخت‌ها")} value={shortToman(totals.payments)} hint={t("مجموع پرداخت موکلان")} icon="money" tone="gold" />
        <StatCard label={t("کمیسیون پلتفرم")} value={shortToman(totals.commission)} hint={commissionRate} icon="scale" />
        <StatCard
          label={t("درخواست‌های برداشت")}
          value={toFa(totals.openPayouts)}
          hint={t("در انتظار پردازش/واریز")}
          icon="landmark"
          tone={totals.openPayouts > 0 ? "danger" : "default"}
        />
        <StatCard label={t("اقساط فعال")} value={toFa(totals.activeInstallments)} hint={t("در انتظار پرداخت")} icon="calendar" />
      </div>

      {/* ---------------- درخواست‌های برداشت ---------------- */}
      <Card hover={false} className="mt-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
          <Icon name="landmark" className="h-4.5 w-4.5 text-accent" />
          {t("درخواست‌های برداشت وکلا")}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>#</th>
                <th className={th}>{t("وکیل")}</th>
                <th className={th}>{t("مبلغ")}</th>
                <th className={th}>{t("شبا")}</th>
                <th className={th}>{t("تاریخ درخواست")}</th>
                <th className={th}>{t("وضعیت")}</th>
                <th className={th}>{t("اقدام")}</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-muted">
                    {t("درخواست برداشتی ثبت نشده است.")}
                  </td>
                </tr>
              )}
              {payouts.map((p) => {
                const st = labelStatus("payout", p.status);
                const canProcess = p.status === "requested";
                const canSettle = p.status === "requested" || p.status === "processing";
                const canReject = p.status === "requested" || p.status === "processing";
                return (
                  <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                    <td className={`${td} text-muted`}>{toFa(p.id)}</td>
                    <td className={`${td} font-bold`}>{p.lawyerName ?? tf("وکیل #{n}", { n: toFa(p.lawyerId) })}</td>
                    <td className={`${td} dp-money whitespace-nowrap`}>{formatToman(p.amount)}</td>
                    <td className={`${td} text-xs text-muted`} dir="ltr">
                      {p.iban || "—"}
                    </td>
                    <td className={`${td} whitespace-nowrap text-muted`}>{formatJalali(p.createdAt)}</td>
                    <td className={td}>
                      <StatusBadge tone={st.tone}>{t(st.label)}</StatusBadge>
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={!canProcess || busyId === p.id}
                          onClick={() => setPayoutStatus(p, "processing", t("در حال پردازش"))}
                          className="min-h-11 rounded-lg bg-cyan/15 px-3 text-xs font-bold text-[#1d7a8c] transition-colors hover:bg-cyan/25 disabled:opacity-40"
                        >
                          {t("پردازش")}
                        </button>
                        <button
                          type="button"
                          disabled={!canSettle || busyId === p.id}
                          onClick={() => setPayoutStatus(p, "paid", t("واریز شد"))}
                          className="min-h-11 rounded-lg bg-success/10 px-3 text-xs font-bold text-success transition-colors hover:bg-success/20 disabled:opacity-40"
                        >
                          {t("پرداخت شد")}
                        </button>
                        <button
                          type="button"
                          disabled={!canReject || busyId === p.id}
                          onClick={() => setPayoutStatus(p, "rejected", t("رد شد"))}
                          className="min-h-11 rounded-lg bg-danger/10 px-3 text-xs font-bold text-danger transition-colors hover:bg-danger/20 disabled:opacity-40"
                        >
                          {t("رد")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* ---------------- دفتر تراکنش‌ها ---------------- */}
        <Card hover={false}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-foreground">
              <Icon name="money" className="h-4.5 w-4.5 text-accent" />
              {t("دفتر تراکنش‌های پلتفرم")}
            </h2>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label={t("فیلتر نوع تراکنش")}
              className="h-11 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground"
            >
              {LEDGER_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.label)}
                </option>
              ))}
            </select>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full min-w-[560px] text-right">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border">
                  <th className={th}>{t("نوع")}</th>
                  <th className={th}>{t("مبلغ")}</th>
                  <th className={th}>{t("کمیسیون")}</th>
                  <th className={th}>{t("شرح")}</th>
                  <th className={th}>{t("تاریخ")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-muted">
                      {t("تراکنشی در این دسته ثبت نشده است.")}
                    </td>
                  </tr>
                )}
                {filteredLedger.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                    <td className={td}>
                      <StatusBadge
                        tone={r.type === "payment" ? "green" : r.type === "commission" ? "gold" : r.type === "refund" ? "red" : "gray"}
                      >
                        {t(LEDGER_TYPES.find((o) => o.value === r.type)?.label ?? r.type)}
                      </StatusBadge>
                    </td>
                    <td className={`${td} dp-money whitespace-nowrap`}>{formatToman(r.amount)}</td>
                    <td className={`${td} whitespace-nowrap text-accent`}>
                      {Number(r.commission) > 0 ? formatToman(r.commission) : "—"}
                    </td>
                    <td className={`${td} max-w-[220px] truncate text-muted`}>{r.description || "—"}</td>
                    <td className={`${td} whitespace-nowrap text-muted`}>{formatJalali(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---------------- اقساط معوق ---------------- */}
        <Card hover={false}>
          <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
            <Icon name="alert" className="h-4.5 w-4.5 text-danger" />
            {t("اقساط معوق")}
            {lateInstallments.length > 0 && (
              <StatusBadge tone="red">{tf("{n} قسط", { n: toFa(lateInstallments.length) })}</StatusBadge>
            )}
          </h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full min-w-[520px] text-right">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border">
                  <th className={th}>{t("پرونده")}</th>
                  <th className={th}>{t("قسط")}</th>
                  <th className={th}>{t("مبلغ")}</th>
                  <th className={th}>{t("سررسید")}</th>
                  <th className={th}>{t("وضعیت")}</th>
                </tr>
              </thead>
              <tbody>
                {lateInstallments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-sm text-muted">
                      {t("قسط معوقی وجود ندارد — وضعیت مالی سالم است.")}
                    </td>
                  </tr>
                )}
                {lateInstallments.map((r) => {
                  const st = labelStatus("installment", r.status);
                  return (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                      <td className={`${td} max-w-[180px] truncate font-bold`}>{r.caseSubject ?? `#${toFa(r.caseId)}`}</td>
                      <td className={`${td} text-muted`}>{tf("قسط {n}", { n: toFa(r.number) })}</td>
                      <td className={`${td} dp-money whitespace-nowrap`}>{formatToman(r.amount)}</td>
                      <td className={`${td} whitespace-nowrap text-danger`}>{formatJalali(r.dueDate)}</td>
                      <td className={td}>
                        <StatusBadge tone={st.tone}>{t(st.label)}</StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ---------------- پیام وضعیت ---------------- */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-xs rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${
            toast.ok ? "bg-success text-white" : "bg-danger text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
