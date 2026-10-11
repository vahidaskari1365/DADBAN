"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/panel-widgets";
import { formatToman, formatJalali, labelStatus, shortToman, toEn, toFa } from "@/lib/money";

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
      toast.error("مبلغ قسط نامعتبر است.");
      return;
    }
    if (!dueDate) {
      toast.error("تاریخ سررسید را انتخاب کنید.");
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
        toast.success("قسط به برنامه پرداخت اضافه شد.");
        setAmount("");
        setDueDate("");
        router.refresh();
      } else {
        toast.error(data.error ?? "ثبت قسط ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setSavingInst(false);
    }
  }

  async function requestCredit() {
    const digits = toEn(creditAmount).replace(/[^\d]/g, "");
    if (!digits || Number(digits) < 1_000_000) {
      toast.error("مبلغ تأمین اعتبار باید حداقل ۱ میلیون تومان باشد.");
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
        toast.success("درخواست اعتبار برای موکل ایجاد شد؛ مرحله بعد اعتبارسنجی موکل است.");
        router.refresh();
      } else {
        toast.error(data.error ?? "ثبت درخواست اعتبار ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
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
            <b className="text-sm text-foreground">تأمین مالی حق‌الوکاله</b>
            <p className="mt-1 text-xs text-muted">
              {caseLabel} · مبلغ قرارداد: <span className="dp-money">{formatToman(feeAgreed)}</span>
            </p>
          </div>
          <span className="rounded-full bg-cyan/15 px-2.5 py-1 text-[11px] font-semibold text-[#1d7a8c]">Provider Adapter</span>
        </div>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          موکل می‌تواند بخشی از حق‌الوکاله را از طریق پلتفرم‌های اعتباردهی طرف قرارداد تأمین کرده و اقساط را طبق قرارداد مالی بازپرداخت کند.
        </p>

        {credit ? (
          <div className="mt-4 rounded-xl bg-surface-2/50 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-[13px] text-foreground">
                درخواست {credit.provider === "azki" ? "ازکی‌وام" : "بانک partner"} · {shortToman(credit.amount)} · {toFa(credit.months)} قسط
              </b>
              {(() => {
                const s = labelStatus("credit", credit.status);
                return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>;
              })()}
            </div>
            <p className="mt-1 text-xs text-muted">
              کد پیگیری: <span dir="ltr" className="font-mono">{toFa(credit.referenceCode)}</span> · {credit.statusDetail}
            </p>
            <div className="dp-timeline mt-4">
              {CREDIT_STEPS.map((step, i) => (
                <div key={step} className={`dp-timeline-item relative pb-4 pr-9 last:pb-0 ${i < creditStep ? "done" : i === creditStep ? "doing" : ""}`}>
                  <span className="dp-timeline-dot" aria-hidden />
                  <strong className="text-[12.5px] text-foreground">{step}</strong>
                  {i === 1 && <small className="mt-0.5 block text-[11px] text-muted">{credit.provider === "azki" ? "ازکی‌وام" : "بانک همکار"}</small>}
                  {i === 2 && <small className="mt-0.5 block text-[11px] text-muted">اقدام موردنیاز موکل</small>}
                </div>
              ))}
            </div>
          </div>
        ) : (
          canWrite && (
            <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-[1fr_110px_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">مبلغ درخواست اعتبار برای موکل (تومان)</span>
                <input
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="مثلاً ۹۰۰۰۰۰۰۰"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">تعداد اقساط</span>
                <input
                  value={creditMonths}
                  onChange={(e) => setCreditMonths(e.target.value)}
                  inputMode="numeric"
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
                />
              </label>
              <Button variant="primary" size="md" onClick={() => void requestCredit()} disabled={savingCredit} className="h-11">
                <Icon name="landmark" className="h-4 w-4" />
                {savingCredit ? "..." : "درخواست اعتبار"}
              </Button>
              <label className="block sm:col-span-3">
                <span className="mb-1.5 block text-xs text-muted">تأمین‌کننده</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40 sm:w-64"
                >
                  <option value="azki">ازکی‌وام — اتصال از طریق API اعتبارسنجی</option>
                  <option value="partner_bank">بانک همکار — طرح اعتباری آینده</option>
                </select>
              </label>
            </div>
          )
        )}
      </div>

      {/* برنامه پرداخت */}
      <div className="rounded-2xl border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <b className="text-sm text-foreground">برنامه پرداخت حق‌الوکاله</b>
          <small className="text-xs text-muted">
            پرداخت‌شده: <span className="dp-money">{shortToman(paidTotal)}</span> از {toFa(installments.length)} قسط
          </small>
        </div>
        <div className="max-h-64 overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[520px] border-collapse text-right">
            <thead>
              <tr className="text-xs text-muted">
                <th className="border-b border-border px-3 py-2 font-medium">مرحله</th>
                <th className="border-b border-border px-3 py-2 font-medium">مبلغ</th>
                <th className="border-b border-border px-3 py-2 font-medium">سررسید</th>
                <th className="border-b border-border px-3 py-2 font-medium">منبع</th>
                <th className="border-b border-border px-3 py-2 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {installments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted">قسطی ثبت نشده است.</td>
                </tr>
              )}
              {installments.map((i) => {
                const s = labelStatus("installment", i.status);
                return (
                  <tr key={i.id} className="text-[13px]">
                    <td className="border-b border-border px-3 py-2.5">
                      {Number(i.number) === 0 ? "پیش‌پرداخت" : `قسط ${toFa(i.number)}`}
                    </td>
                    <td className="border-b border-border px-3 py-2.5 dp-money">{formatToman(i.amount)}</td>
                    <td className="border-b border-border px-3 py-2.5 text-muted">{formatJalali(i.dueDate)}</td>
                    <td className="border-b border-border px-3 py-2.5 text-muted">{i.source === "client" ? "موکل" : "تأمین‌کننده"}</td>
                    <td className="border-b border-border px-3 py-2.5">
                      <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
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
              <span className="mb-1.5 block text-xs text-muted">مبلغ قسط جدید (تومان)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۸۲۰۰۰۰۰۰"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">سررسید</span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <Button variant="primary" size="md" onClick={() => void addInstallment()} disabled={savingInst} className="h-11">
              <Icon name="plus" className="h-4 w-4" />
              {savingInst ? "..." : "افزودن قسط"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
