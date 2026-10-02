"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/dashboard-shell";
import { formatToman, formatJalali, labelStatus, shortToman, toEn } from "@/lib/money";
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
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const digits = toEn(amount).replace(/[^\d]/g, "");
    if (!digits || Number(digits) < 1_000_000) {
      toast.error("حداقل مبلغ برداشت ۱ میلیون تومان است.");
      return;
    }
    if (Number(digits) > available) {
      toast.error("مبلغ درخواستی بیشتر از موجودی قابل برداشت است.");
      return;
    }
    const cleanIban = toEn(iban).replace(/[\s-]/g, "").toUpperCase();
    if (!/^(IR)?\d{24}$/.test(cleanIban)) {
      toast.error("شماره شبا معتبر نیست (۲۴ رقم).");
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
        toast.success("درخواست برداشت ثبت شد و در کارتابل تسویه قرار گرفت.");
        setAmount("");
        setIban("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error ?? "ثبت درخواست ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">برداشت به حساب شبا ثبت‌شده انجام می‌شود؛ پردازش ۲ تا ۳ روز کاری است.</p>
        {canWrite && !open && (
          <Button variant="primary" size="md" onClick={() => setOpen(true)}>
            <Icon name="money" className="h-4 w-4" />
            درخواست برداشت
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <b className="text-sm text-foreground">درخواست برداشت</b>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن فرم برداشت"
              className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-foreground-soft hover:bg-surface-3"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">مبلغ (تومان) — قابل برداشت: {shortToman(available)}</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="مثلاً ۵۰۰۰۰۰۰۰"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">شماره شبا</span>
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
            {saving ? "در حال ثبت..." : "ثبت درخواست"}
          </Button>
        </div>
      )}

      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pl-1">
        {payouts.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">درخواست برداشتی ثبت نشده است.</p>
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
                <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
