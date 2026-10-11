"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/panel-widgets";
import { formatToman, formatJalali, labelStatus, shortToman, toEn } from "@/lib/money";
import { MoneyInput } from "@/components/money-input";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import type { PayoutItem } from "./portal-server";

/** فرم و فهرست درخواست‌های برداشت — POST /api/portal/lawyer/finance */
export function PayoutPanel({
  available,
  payouts,
  canWrite,
}: {
  available: number;
  payouts: PayoutItem[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const digits = toEn(amount).replace(/[^\d]/g, "");
    if (!digits || Number(digits) < 1_000_000) {
      toast.error(t("حداقل مبلغ برداشت ۱ میلیون تومان است."));
      return;
    }
    if (Number(digits) > available) {
      toast.error(t("مبلغ درخواستی بیشتر از موجودی قابل برداشت است."));
      return;
    }
    const cleanIban = toEn(iban).replace(/[\s-]/g, "").toUpperCase();
    if (!/^(IR)?\d{24}$/.test(cleanIban)) {
      toast.error(t("شماره شبا معتبر نیست (۲۴ رقم)."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/lawyer/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(digits), iban: cleanIban }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success(t("درخواست برداشت ثبت شد و در کارتابل تسویه قرار گرفت."));
        setAmount("");
        setIban("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error ?? t("ثبت درخواست ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">{t("برداشت به حساب شبا ثبت‌شده انجام می‌شود؛ پردازش ۲ تا ۳ روز کاری است.")}</p>
        {canWrite && !open && (
          <Button variant="primary" size="md" onClick={() => setOpen(true)}>
            <Icon name="money" className="h-4 w-4" />
            {t("درخواست برداشت")}
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <b className="text-sm text-foreground">{t("درخواست برداشت")}</b>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("بستن فرم برداشت")}
              className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-foreground-soft hover:bg-surface-3"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">{tf("مبلغ (تومان) — قابل برداشت: {n}", { n: shortToman(available) })}</span>
              <MoneyInput
                value={amount}
                onValueChange={setAmount}
                placeholder={t("مثلاً 50,000,000")}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">{t("شماره شبا")}</span>
              <input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                dir="ltr"
                placeholder="IR__________________________"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-left text-sm outline-none focus:border-primary/40"
              />
            </label>
          </div>
          <Button variant="primary" size="md" onClick={() => void submit()} disabled={saving}>
            <Icon name="check" className="h-4 w-4" />
            {saving ? t("در حال ثبت...") : t("ثبت درخواست")}
          </Button>
        </div>
      )}

      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pl-1">
        {payouts.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">{t("درخواست برداشتی ثبت نشده است.")}</p>
        )}
        {payouts.map((p) => {
          const s = labelStatus("payout", p.status);
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-3">
              <div>
                <b className="dp-money text-sm">{formatToman(p.amount)}</b>
                <small className="mt-0.5 block text-[11px] text-muted" dir="ltr">
                  {p.iban}
                </small>
              </div>
              <div className="flex items-center gap-2">
                <small className="text-[11px] text-muted">{formatJalali(p.createdAt)}</small>
                <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
