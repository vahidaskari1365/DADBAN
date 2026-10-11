"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/panel-widgets";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatToman, formatJalali, labelStatus, toFa } from "@/lib/money";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

type CreditRow = {
  id: number;
  caseId: number;
  caseSubject: string | null;
  provider: string;
  amount: string;
  months: number;
  status: string;
  statusDetail: string;
  referenceCode: string;
  createdAt: Date;
  updatedAt: Date;
};

const STATUSES = ["draft", "submitted", "scoring", "approved", "rejected", "funded"] as const;

const PROVIDER_LABEL: Record<string, string> = {
  azki: "ازکی‌وام",
  partner_bank: "بانک همکار",
};

/** چرخهٔ پیشنهادی برای راهنمای گام بعدی ادمین */
function nextStatuses(current: string): string[] {
  switch (current) {
    case "draft":
      return ["submitted"];
    case "submitted":
      return ["scoring", "rejected"];
    case "scoring":
      return ["approved", "rejected"];
    case "approved":
      return ["funded", "rejected"];
    default:
      return [];
  }
}

export default function ProvidersClient({ rows }: { rows: CreditRow[] }) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setToast({ ok, text });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function apply(row: CreditRow) {
    const status = picked[row.id];
    if (!status) {
      flash(false, t("ابتدا وضعیت مقصد را انتخاب کنید."));
      return;
    }
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/marketplace/credit/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        flash(true, tf("درخواست {n} به وضعیت «{s}» تغییر کرد.", { n: toFa(row.id), s: labelStatus("credit", status).label }));
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

  const th = "p-3 text-xs font-bold text-muted whitespace-nowrap";
  const td = "p-3 text-sm align-top";

  return (
    <Card hover={false}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
        <Icon name="money" className="h-4.5 w-4.5 text-accent" />
        {t("درخواست‌های تأمین اعتبار حق‌الوکاله")}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-right">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>#</th>
              <th className={th}>{t("پرونده")}</th>
              <th className={th}>{t("تأمین‌کننده")}</th>
              <th className={th}>{t("مبلغ / مدت")}</th>
              <th className={th}>{t("کد پیگیری")}</th>
              <th className={th}>{t("وضعیت")}</th>
              <th className={th}>{t("تغییر وضعیت")}</th>
              <th className={th}>{t("ثبت")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-sm text-muted">
                  {t("درخواست اعتباری ثبت نشده است.")}
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const st = labelStatus("credit", r.status);
              const nexts = nextStatuses(r.status);
              return (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                  <td className={`${td} text-muted`}>{toFa(r.id)}</td>
                  <td className={td}>
                    <b className="block max-w-[180px] truncate">{r.caseSubject ?? `#${toFa(r.caseId)}`}</b>
                    <small className="text-[11px] text-muted">{formatJalali(r.createdAt)}</small>
                  </td>
                  <td className={`${td} whitespace-nowrap font-bold`}>{t(PROVIDER_LABEL[r.provider] ?? r.provider)}</td>
                  <td className={td}>
                    <span className="dp-money whitespace-nowrap">{formatToman(r.amount)}</span>
                    <small className="block text-[11px] text-muted">{tf("{n} ماهه", { n: toFa(r.months) })}</small>
                  </td>
                  <td className={`${td} text-xs text-muted`} dir="ltr">
                    {r.referenceCode || "—"}
                  </td>
                  <td className={td}>
                    <StatusBadge tone={st.tone}>{t(st.label)}</StatusBadge>
                    {r.statusDetail && (
                      <small className="mt-1 block max-w-[150px] text-[10px] leading-5 text-muted">{r.statusDetail}</small>
                    )}
                  </td>
                  <td className={td}>
                    {nexts.length > 0 ? (
                      <select
                        value={picked[r.id] ?? ""}
                        onChange={(e) => setPicked((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        aria-label={tf("تغییر وضعیت درخواست {n}", { n: toFa(r.id) })}
                        className="h-11 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground"
                      >
                        <option value="">{t("انتخاب وضعیت…")}</option>
                        {STATUSES.filter((s) => nexts.includes(s)).map((s) => (
                          <option key={s} value={s}>
                            {t(labelStatus("credit", s).label)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] text-muted">{t("چرخهٔ کامل — بدون تغییر")}</span>
                    )}
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => apply(r)}
                      disabled={busyId === r.id || nexts.length === 0 || !picked[r.id]}
                      className="min-h-11 rounded-lg bg-primary-soft px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary-soft/70 disabled:opacity-40"
                    >
                      {busyId === r.id ? "…" : t("اعمال")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-xs rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${
            toast.ok ? "bg-success text-white" : "bg-danger text-white"
          }`}
        >
          {t(toast.text)}
        </div>
      )}
    </Card>
  );
}
