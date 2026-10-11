"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/panel-widgets";
import { formatToman, formatJalali, labelStatus, shortToman, toEn, toFa } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

export type InstallmentView = {
  id: number;
  number: number;
  amount: string;
  dueDate: string;
  status: string;
  source: string;
};

export type CreditView = {
  provider: string;
  amount: string;
  months: number;
  status: string;
  statusDetail: string;
  referenceCode: string;
} | null;

const CREDIT_STEPS = ["ثبت درخواست", "ارسال به تأمین‌کننده", "اعتبارسنجی موکل", "تأیید اعتبار", "پرداخت به حساب"];

/** اقساط و تأمین اعتبار حق‌الوکاله — POST installments / POST credit */
export function InstallmentsPanel({
  caseId,
  caseLabel,
  feeAgreed,
  initialInstallments,
  initialCredit,
  canWrite,
}: {
  caseId: number;
  caseLabel: string;
  feeAgreed: string | null;
  initialInstallments: InstallmentView[];
  initialCredit: CreditView;
  canWrite: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [installments, setInstallments] = useState<InstallmentView[]>(initialInstallments);
  const [credit, setCredit] = useState<CreditView>(initialCredit);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [savingInst, setSavingInst] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditMonths, setCreditMonths] = useState("12");
  const [provider, setProvider] = useState("azki");
  const [savingCredit, setSavingCredit] = useState(false);

  const paidTotal = installments.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);
  const creditStep = credit ? Math.min(4, ["submitted", "scoring", "approved", "funded"].indexOf(credit.status) + 1) : -1;

  async function addInstallment() {
    const digits = toEn(amount).replace(/[^\d]/g, "");
    if (!digits || Number(digits) < 10_000) {
      toast.error(t("مبلغ قسط نامعتبر است."));
      return;
    }
    if (!dueDate) {
      toast.error(t("تاریخ سررسید را انتخاب کنید."));
      return;
    }
    setSavingInst(true);
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/installments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(digits), dueDate: new Date(`${dueDate}T12:00`).toISOString() }),
      });
      const data = (await res.json()) as { ok: boolean; installments?: InstallmentView[]; error?: string };
      if (data.ok && data.installments) {
        setInstallments(data.installments);
        toast.success(t("قسط به برنامه پرداخت اضافه شد."));
        setAmount("");
        setDueDate("");
        router.refresh();
      } else {
        toast.error(data.error ?? t("ثبت قسط ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setSavingInst(false);
    }
  }

  async function requestCredit() {
    const digits = toEn(creditAmount).replace(/[^\d]/g, "");
    if (!digits || Number(digits) < 1_000_000) {
      toast.error(t("مبلغ تأمین اعتبار باید حداقل ۱ میلیون تومان باشد."));
      return;
    }
    setSavingCredit(true);
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          amount: Number(digits),
          months: Number(toEn(creditMonths).replace(/[^\d]/g, "")) || 12,
        }),
      });
      const data = (await res.json()) as { ok: boolean; credit?: NonNullable<CreditView>; error?: string };
      if (data.ok && data.credit) {
        setCredit(data.credit);
        toast.success(t("درخواست اعتبار برای موکل ایجاد شد؛ مرحله بعد اعتبارسنجی موکل است."));
        router.refresh();
      } else {
        toast.error(data.error ?? t("ثبت درخواست اعتبار ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setSavingCredit(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* تأمین مالی */}
      <div className="rounded-2xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <b className="text-sm text-foreground">{t("تأمین مالی حق‌الوکاله")}</b>
            <p className="mt-1 text-xs text-muted">
              {caseLabel} · {t("مبلغ قرارداد:")} <span className="dp-money">{formatToman(feeAgreed)}</span>
            </p>
          </div>
          <span className="rounded-full bg-cyan/15 px-2.5 py-1 text-[11px] font-semibold text-[#1d7a8c]">Provider Adapter</span>
        </div>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          {t("موکل می‌تواند بخشی از حق‌الوکاله را از طریق پلتفرم‌های اعتباردهی طرف قرارداد تأمین کرده و اقساط را طبق قرارداد مالی بازپرداخت کند.")}
        </p>

        {credit ? (
          <div className="mt-4 rounded-xl bg-surface-2/50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-[13px] text-foreground">
                {tf("درخواست {p} · {n} · {m} قسط", { p: credit.provider === "azki" ? t("ازکی‌وام") : t("بانک partner"), n: shortToman(credit.amount), m: toFa(credit.months) })}
              </b>
              {(() => {
                const s = labelStatus("credit", credit.status);
                return <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge>;
              })()}
            </div>
            <p className="mt-1 text-xs text-muted">
              {t("کد پیگیری:")} <span dir="ltr" className="font-mono">{toFa(credit.referenceCode)}</span> · {credit.statusDetail}
            </p>
            <div className="dp-timeline mt-4">
              {CREDIT_STEPS.map((step, i) => (
                <div key={step} className={`dp-timeline-item relative pb-4 pr-9 last:pb-0 ${i < creditStep ? "done" : i === creditStep ? "doing" : ""}`}>
                  <span className="dp-timeline-dot" aria-hidden />
                  <strong className="text-[12.5px] text-foreground">{t(step)}</strong>
                  {i === 1 && <small className="mt-0.5 block text-[11px] text-muted">{credit.provider === "azki" ? t("ازکی‌وام") : t("بانک همکار")}</small>}
                  {i === 2 && <small className="mt-0.5 block text-[11px] text-muted">{t("اقدام موردنیاز موکل")}</small>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          canWrite && (
            <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[1fr_110px_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">{t("مبلغ درخواست اعتبار برای موکل (تومان)")}</span>
                <MoneyInput
                  value={creditAmount}
                  onValueChange={setCreditAmount}
                  placeholder={t("مثلاً 90,000,000")}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">{t("تعداد اقساط")}</span>
                <input
                  value={creditMonths}
                  onChange={(e) => setCreditMonths(e.target.value)}
                  inputMode="numeric"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <Button variant="primary" size="md" onClick={() => void requestCredit()} disabled={savingCredit} className="h-11">
                <Icon name="landmark" className="h-4 w-4" />
                {savingCredit ? "..." : t("درخواست اعتبار")}
              </Button>
              <label className="block sm:col-span-3">
                <span className="mb-1.5 block text-xs text-muted">{t("تأمین‌کننده")}</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40 sm:w-64"
                >
                  <option value="azki">{t("ازکی‌وام — اتصال از طریق API اعتبارسنجی")}</option>
                  <option value="partner_bank">{t("بانک همکار — طرح اعتباری آینده")}</option>
                </select>
              </label>
            </div>
          )
        )}
      </div>

      {/* برنامه پرداخت */}
      <div className="rounded-2xl border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <b className="text-sm text-foreground">{t("برنامه پرداخت حق‌الوکاله")}</b>
          <small className="text-xs text-muted">
            {t("پرداخت‌شده: ")}
            <span className="dp-money">{shortToman(paidTotal)}</span> {tf("از {n} قسط", { n: toFa(installments.length) })}
          </small>
        </div>
        <div className="max-h-64 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[520px] border-collapse text-right">
            <thead>
              <tr className="text-xs text-muted">
                <th className="border-b border-border px-3 py-2 font-medium">{t("مرحله")}</th>
                <th className="border-b border-border px-3 py-2 font-medium">{t("مبلغ")}</th>
                <th className="border-b border-border px-3 py-2 font-medium">{t("سررسید")}</th>
                <th className="border-b border-border px-3 py-2 font-medium">{t("منبع")}</th>
                <th className="border-b border-border px-3 py-2 font-medium">{t("وضعیت")}</th>
              </tr>
            </thead>
            <tbody>
              {installments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted">{t("قسطی ثبت نشده است.")}</td>
                </tr>
              )}
              {installments.map((i) => {
                const s = labelStatus("installment", i.status);
                return (
                  <tr key={i.id} className="text-[13px]">
                    <td className="border-b border-border px-3 py-2.5">
                      {Number(i.number) === 0 ? t("پیش‌پرداخت") : tf("قسط {n}", { n: toFa(i.number) })}
                    </td>
                    <td className="border-b border-border px-3 py-2.5 dp-money">{formatToman(i.amount)}</td>
                    <td className="border-b border-border px-3 py-2.5 text-muted">{formatJalali(i.dueDate)}</td>
                    <td className="border-b border-border px-3 py-2.5 text-muted">{i.source === "client" ? t("موکل") : t("تأمین‌کننده")}</td>
                    <td className="border-b border-border px-3 py-2.5">
                      <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {canWrite && (
          <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[1fr_170px_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">{t("مبلغ قسط جدید (تومان)")}</span>
              <MoneyInput
                value={amount}
                onValueChange={setAmount}
                placeholder={t("مثلاً 82,000,000")}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">{t("سررسید")}</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <Button variant="primary" size="md" onClick={() => void addInstallment()} disabled={savingInst} className="h-11">
              <Icon name="plus" className="h-4 w-4" />
              {savingInst ? "..." : t("افزودن قسط")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
