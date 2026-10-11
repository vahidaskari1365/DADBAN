"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/panel-widgets";
import { formatJalaliLong, formatTime, formatToman, labelStatus } from "@/lib/money";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * وضعیت قرارداد الکترونیکی پرونده — امضای الکترونیکی موکل پس از ارسال قرارداد.
 */
export default function CaseContract({
  caseId,
  contractStatus,
  contractCode,
  feeAgreed,
  signedAt,
}: {
  caseId: number;
  contractStatus: string;
  contractCode: string;
  feeAgreed: string | null;
  signedAt: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(contractStatus);
  const [signedAtLocal, setSignedAtLocal] = useState(signedAt);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const s = labelStatus("contract", status);

  const sign = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/contract/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; signedAt?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "امضای قرارداد ناموفق بود.");
        return;
      }
      setStatus("signed");
      setSignedAtLocal(data.signedAt ?? new Date().toISOString());
      setOpen(false);
      setDone(true);
      router.refresh();
    } catch {
      setErr("خطا در ارتباط با سرور.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2/30 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon name="stamp" className="h-5 w-5 text-accent" />
            <h3 className="text-sm font-bold text-foreground">قرارداد وکالت الکترونیکی</h3>
            <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs text-muted sm:grid-cols-2">
            {contractCode && (
              <div className="flex gap-1">
                <dt className="shrink-0">کد قرارداد:</dt>
                <dd dir="ltr" className="font-mono font-semibold text-foreground">
                  {contractCode}
                </dd>
              </div>
            )}
            {feeAgreed && (
              <div className="flex gap-1">
                <dt className="shrink-0">حق‌الوکالهٔ توافقی:</dt>
                <dd>
                  <b className="dp-money">{formatToman(feeAgreed)}</b>
                </dd>
              </div>
            )}
            {signedAtLocal && (
              <div className="flex gap-1">
                <dt className="shrink-0">تاریخ امضا:</dt>
                <dd className="font-semibold text-success">
                  {formatJalaliLong(signedAtLocal)} · ساعت {formatTime(signedAtLocal)}
                </dd>
              </div>
            )}
            <div className="flex gap-1">
              <dt className="shrink-0">امضاکننده:</dt>
              <dd>موکل (امضای الکترونیکی)</dd>
            </div>
          </dl>
        </div>

        {status === "sent" && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-gold inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all"
          >
            <Icon name="stamp" className="h-4 w-4" />
            امضای الکترونیکی قرارداد
          </button>
        )}
      </div>

      {status === "signed" && (
        <p className="flex items-center gap-2 rounded-xl bg-success/10 p-4 text-sm font-semibold text-success">
          <Icon name="badge" className="h-5 w-5 shrink-0" />
          قرارداد امضا شده است. نسخهٔ نهایی برای وکیل و پشتیبانی دادپیو ثبت شد و روند پرونده آغاز می‌شود.
        </p>
      )}
      {(status === "none" || status === "draft") && (
        <p className="flex items-start gap-2 rounded-xl border border-dashed border-border p-4 text-sm leading-6 text-muted">
          <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" />
          پس از توافق نهایی با وکیل، قرارداد از طرف او برای امضای شما ارسال می‌شود و همین‌جا قابل امضای الکترونیکی خواهد بود.
        </p>
      )}
      {done && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-success">
          <Icon name="check" className="h-4 w-4" /> امضا با موفقیت ثبت شد.
        </p>
      )}
      {err && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <Icon name="alert" className="h-4 w-4" /> {err}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Icon name="stamp" className="h-5 w-5 text-accent" />
              تأیید امضای الکترونیکی قرارداد
            </DialogTitle>
            <DialogDescription className="text-right text-sm leading-7">
              با امضای الکترونیکی، قرارداد وکالت این پرونده به‌صورت قطعی برای شما و وکیل ثبت می‌شود.
              مبلغ و شرایط درج‌شده در قرارداد ملاک عمل خواهد بود.
              {feeAgreed ? ` حق‌الوکالهٔ توافقی: ${formatToman(feeAgreed)}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-start gap-2">
            <button
              type="button"
              onClick={() => void sign()}
              disabled={busy}
              className="btn-gold inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all disabled:opacity-50"
            >
              <Icon name="check" className="h-4 w-4" />
              {busy ? "در حال ثبت امضا…" : "تأیید و امضا"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
              انصراف
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
