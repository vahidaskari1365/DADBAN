"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/panel-widgets";
import { formatJalali, formatToman, groupFa, labelStatus, toEn, toFa } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import type { CreditItem, InstallmentItem } from "./types";

const CREDIT_STEPS = ["ثبت درخواست", "ارسال به تأمین‌کننده", "اعتبارسنجی", "تأیید", "واریز"] as const;

function creditStepIndex(status: string): number {
  switch (status) {
    case "submitted":
      return 1;
    case "scoring":
      return 2;
    case "approved":
      return 3;
    case "funded":
      return 4;
    default:
      return 0; // draft و سایر
  }
}

function CreditStepper({ status }: { status: string }) {
  const t = useT();
  const idx = creditStepIndex(status);
  return (
    <ol className="flex items-stretch gap-1 overflow-x-auto pb-1" aria-label={t("مراحل درخواست اعتبار")}>
      {CREDIT_STEPS.map((step, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-1">
            <div className="flex min-w-16 flex-col items-center gap-1.5 text-center">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold ${
                  done
                    ? "border-success bg-success text-white"
                    : current
                      ? "border-accent bg-accent text-[#1b2334]"
                      : "border-border bg-surface text-muted"
                }`}
              >
                {done ? <Icon name="check" className="h-3.5 w-3.5" /> : toFa(i + 1)}
              </span>
              <span className={`text-[10px] leading-4 sm:text-[11px] ${current ? "font-bold text-accent" : done ? "text-success" : "text-muted"}`}>
                {t(step)}
              </span>
            </div>
            {i < CREDIT_STEPS.length - 1 && <span className={`dp-stepper-line mt-4 w-full shrink ${i < idx ? "done" : ""}`} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * پرداخت و اقساط حق‌الوکاله + تأمین اعتبار (ازکی‌وام / بانک همکار).
 */
export default function CasePayments({
  caseId,
  feeAgreed,
  initialInstallments,
  initialCredits,
}: {
  caseId: number;
  feeAgreed: string | null;
  initialInstallments: InstallmentItem[];
  initialCredits: CreditItem[];
}) {
  const t = useT();
  const tf = templateT(t);
  const [installments, setInstallments] = useState<InstallmentItem[]>(initialInstallments);
  const [credits, setCredits] = useState<CreditItem[]>(initialCredits);
  const [provider, setProvider] = useState("azki");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("12");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/installments`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; installments?: InstallmentItem[]; credit?: CreditItem[] };
      if (data?.ok) {
        if (Array.isArray(data.installments)) setInstallments(data.installments);
        if (Array.isArray(data.credit)) setCredits(data.credit);
      }
    } catch {
      /* دادهٔ اولیهٔ سرور باقی می‌ماند */
    }
  }, [caseId]);

  useEffect(() => {
    if (initialInstallments.length === 0 && initialCredits.length === 0) {
      queueMicrotask(() => void load());
    }
  }, [initialInstallments.length, initialCredits.length, load]);

  const submit = async () => {
    const n = Number(toEn(amount).replace(/\D/g, ""));
    if (!n || n < 100_000) {
      setErr(t("مبلغ درخواست را به تومان وارد کنید (حداقل ۱۰۰ هزار تومان)."));
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, amount: n, months: Number(months) }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; request?: { referenceCode?: string } };
      if (!res.ok || !data.ok) {
        setErr(data.error ?? t("ثبت درخواست ناموفق بود."));
      } else {
        setMsg(
          data.request?.referenceCode
            ? tf("درخواست شما ثبت شد؛ کد پیگیری: {n}", { n: data.request.referenceCode })
            : t("درخواست تأمین اعتبار ثبت شد و به تأمین‌کننده ارسال می‌شود."),
        );
        setAmount("");
        await load();
      }
    } catch {
      setErr(t("خطا در ارتباط با سرور."));
    } finally {
      setBusy(false);
    }
  };

  const totalPaid = installments
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(toEn(String(i.amount)).replace(/\D/g, "") || 0), 0);

  return (
    <div className="space-y-6">
      {/* ---------- جدول اقساط ---------- */}
      <section aria-labelledby="dp-installments-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="dp-installments-h" className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon name="money" className="h-4 w-4 text-accent" /> {t("برنامهٔ اقساط حق‌الوکاله")}
          </h3>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            {feeAgreed && (
              <span>
                {t("مبلغ قرارداد:")} <b className="dp-money">{formatToman(feeAgreed)}</b>
              </span>
            )}
            {totalPaid > 0 && (
              <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">
                {t("پرداخت‌شده:")} {formatToman(totalPaid)}
              </span>
            )}
          </div>
        </div>

        {installments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
            {t("برنامهٔ اقساطی برای این پرونده ثبت نشده است. پس از توافق حق‌الوکاله، برنامهٔ پرداخت همین‌جا نمایش داده می‌شود.")}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-105 text-right text-sm">
              <caption className="sr-only">{t("جدول اقساط حق‌الوکاله پرونده")}</caption>
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-xs text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">{t("قسط")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("مبلغ")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("سرسید")}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t("وضعیت")}</th>
                </tr>
              </thead>
              <tbody>
                {installments
                  .slice()
                  .sort((a, b) => a.number - b.number)
                  .map((it) => {
                    const s = labelStatus("installment", it.status);
                    return (
                      <tr key={it.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3 font-bold text-foreground">
                          {it.number === 0 ? t("پیش‌پرداخت") : tf("قسط {n}", { n: toFa(it.number) })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="dp-money">{formatToman(it.amount)}</span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatJalali(it.dueDate)}
                          {it.status === "paid" && it.paidAt && (
                            <small className="mt-0.5 block text-[10px] text-success">
                              {t("پرداخت:")} {formatJalali(it.paidAt)}
                            </small>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- تأمین اعتبار ---------- */}
      <section aria-labelledby="dp-credit-h" className="rounded-2xl border border-border bg-surface-2/30 p-4 sm:p-5">
        <h3 id="dp-credit-h" className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Icon name="landmark" className="h-4 w-4 text-accent" /> {t("تأمین اعتبار حق‌الوکاله")}
        </h3>
        <p className="mt-1 text-xs leading-6 text-muted">
          {t("هزینهٔ وکالت را می‌توانید به‌صورت اقساطی از طریق تأمین‌کنندگان اعتبار دادپیو پرداخت کنید. نرخ و شرایط نهایی از پنل تأمین‌کننده اعلام می‌شود.")}
        </p>

        {credits.length > 0 && (
          <div className="mt-4 space-y-4">
            {credits.map((c) => {
              const s = labelStatus("credit", c.status);
              const rejected = c.status === "rejected";
              return (
                <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Icon name={c.provider === "azki" ? "bolt" : "landmark"} className="h-4 w-4 text-accent" />
                      {c.provider === "azki" ? t("ازکی‌وام") : t("بانک همکار")}
                    </div>
                    <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span>
                      {t("مبلغ:")} <b className="dp-money">{formatToman(c.amount)}</b>
                    </span>
                    <span>{tf("تعداد اقساط: {n} ماه", { n: toFa(c.months) })}</span>
                    {c.referenceCode && (
                      <span dir="ltr" className="font-mono">
                        {c.referenceCode}
                      </span>
                    )}
                    <span>{formatJalali(c.createdAt)}</span>
                  </div>
                  {c.statusDetail && (
                    <p className={`mt-2 text-xs ${rejected ? "text-danger" : "text-muted"}`}>{c.statusDetail}</p>
                  )}
                  <div className="mt-4">
                    <CreditStepper status={c.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* فرم درخواست جدید */}
        <div className="mt-5 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="dp-credit-provider" className="mb-1 block text-xs font-semibold text-foreground-soft">
              {t("تأمین‌کننده")}
            </label>
            <select
              id="dp-credit-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="azki">{t("ازکی‌وام")}</option>
              <option value="partner_bank">{t("بانک همکار")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="dp-credit-amount" className="mb-1 block text-xs font-semibold text-foreground-soft">
              {t("مبلغ درخواستی (تومان)")}
            </label>
            <MoneyInput
              id="dp-credit-amount"
              value={amount}
              onValueChange={setAmount}
              placeholder={t("مثلاً 50,000,000")}
              className="h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm outline-none focus:border-primary"
            />
            {amount && (
              <small className="mt-1 block text-[10px] text-muted">{tf("{n} تومان", { n: groupFa(toEn(amount)) })}</small>
            )}
          </div>
          <div>
            <label htmlFor="dp-credit-months" className="mb-1 block text-xs font-semibold text-foreground-soft">
              {t("تعداد اقساط")}
            </label>
            <select
              id="dp-credit-months"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              className="h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm outline-none focus:border-primary sm:w-32"
            >
              <option value="6">{t("۶ ماه")}</option>
              <option value="12">{t("۱۲ ماه")}</option>
              <option value="18">{t("۱۸ ماه")}</option>
              <option value="24">{t("۲۴ ماه")}</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="btn-gold inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all disabled:opacity-50 sm:w-auto"
            >
              <Icon name="landmark" className="h-4 w-4" />
              {busy ? t("در حال ثبت…") : t("ثبت درخواست اعتبار")}
            </button>
          </div>
        </div>

        {msg && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-success/10 p-3 text-xs font-semibold text-success">
            <Icon name="check" className="h-4 w-4" /> {msg}
          </p>
        )}
        {err && (
          <p role="alert" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-danger">
            <Icon name="alert" className="h-4 w-4" /> {err}
          </p>
        )}
      </section>
    </div>
  );
}
