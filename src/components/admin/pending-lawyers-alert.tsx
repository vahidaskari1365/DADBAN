"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatJalaliDateTime } from "@/lib/jalali";
import { faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/**
 * اعلان «ثبت‌نام وکیل جدید» روی خانهٔ پنل مدیریت.
 * درخواست‌های pending فرم مستقیم ثبت‌نام وکلا (کانون/مرکز وکلا) را نشان می‌دهد و
 * با دکمه‌های «تأیید» / «عدم تأیید» همان‌جا قابل بررسی است (همان PUT /api/lawyer-onboarding
 * که در صفحهٔ /admin/onboarding استفاده می‌شود — تأیید یعنی ساخت پروفایل + اتصال حساب).
 */

export type PendingLawyerRow = {
  id: number;
  name: string;
  phone: string;
  licenseNo: string;
  barType: string | null;
  lawyerType: string;
  province: string;
  createdAt: string;
};

const BAR_LABEL: Record<string, string> = {
  kanoon: "وکیل کانون وکلا",
  markaz: "وکیل مرکز وکلا",
};

export default function PendingLawyersAlert({
  rows,
  total,
  canReview,
}: {
  rows: PendingLawyerRow[];
  total: number;
  canReview: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (rows.length === 0) return null;

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    window.setTimeout(() => setMsg(null), 5000);
  }

  async function review(row: PendingLawyerRow, action: "approve" | "reject") {
    setBusyId(row.id);
    try {
      const res = await fetch("/api/lawyer-onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, action, note: action === "reject" ? rejectNote.trim() : undefined }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        flash(
          false,
          res.status === 401
            ? t("نشست ادمین منقضی شده؛ دوباره وارد شوید.")
            : d.error
              ? t(d.error)
              : t("انجام اقدام ناموفق بود؛ دوباره تلاش کنید."),
        );
        return;
      }
      flash(
        true,
        action === "approve"
          ? t("درخواست تأیید شد؛ پروفایل وکیل ساخته و حساب متقاضی متصل گردید.")
          : t("درخواست رد شد و توضیح کارشناس ثبت گردید."),
      );
      setRejectingId(null);
      setRejectNote("");
      router.refresh();
    } catch {
      flash(false, t("خطای شبکه؛ اتصال خود را بررسی کنید."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card hover={false} className="border-[color-mix(in_oklab,var(--accent)_45%,transparent)] p-5" data-testid="pending-lawyers-alert">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-extrabold text-foreground">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
          </span>
          {t("ثبت‌نام وکیل جدید در انتظار تأیید")}
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-black text-accent-text">
            {faNum(total)} {t("درخواست")}
          </span>
        </p>
        <a href="/admin/onboarding" className="inline-flex min-h-9 items-center gap-1.5 text-xs font-extrabold text-accent-text hover:underline">
          {t("مشاهدهٔ صف کامل")}
          <Icon name="chevron" className="h-3.5 w-3.5 rotate-180" />
        </a>
      </div>

      <div className="nice-scroll mt-4 max-h-96 space-y-3 overflow-y-auto pe-1">
        {rows.map((r) => {
          const busy = busyId === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-surface-2/40 p-4" data-testid="pending-lawyer-row">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-foreground">
                    <Icon name="user" className="h-4 w-4 text-primary" />
                    {r.name}
                    <span className="text-[11px] font-bold text-muted">#{faNum(r.id)}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span dir="ltr" className="font-mono">{r.phone}</span>
                    <span>
                      {t("پروانه:")} <b className="font-mono" dir="ltr">{r.licenseNo}</b>
                    </span>
                    <span className="font-bold text-accent-text">{t(BAR_LABEL[r.barType ?? ""] ?? "وکیل رسمی")}</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="location" className="h-3.5 w-3.5" />
                      {r.province}
                    </span>
                  </p>
                </div>
                <span className="text-end text-[10px] leading-5 text-muted">{formatJalaliDateTime(r.createdAt)}</span>
              </div>

              {canReview && (
                rejectingId === r.id ? (
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <label htmlFor={`pl-reject-${r.id}`} className="block text-[11px] font-bold text-foreground-soft">
                      {t("توضیح رد (برای متقاضی الزامی است) *")}
                    </label>
                    <textarea
                      id={`pl-reject-${r.id}`}
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder={t("مثال: شماره پروانه در سایت کانون تأیید نشد؛ با پشتیبانی تماس بگیرید.")}
                      className="min-h-11 w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => review(r, "reject")}
                        disabled={busy || rejectNote.trim().length < 2}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-danger px-4 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="x" className="h-4 w-4" />
                        {busy ? t("در حال ثبت…") : t("ثبت عدم تأیید")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectNote("");
                        }}
                        disabled={busy}
                        className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-bold text-muted transition-colors hover:text-foreground"
                      >
                        {t("انصراف")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => review(r, "approve")}
                      disabled={busy}
                      data-testid="pending-lawyer-approve"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-success px-4 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="check" className="h-4 w-4" />
                      {busy ? t("در حال بررسی…") : t("تأیید")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(r.id);
                        setRejectNote("");
                      }}
                      disabled={busy}
                      data-testid="pending-lawyer-reject"
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-danger/40 bg-danger/5 px-4 text-sm font-bold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="x" className="h-4 w-4" />
                      {t("عدم تأیید")}
                    </button>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {msg && (
        <p
          role="status"
          className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold leading-6 ${
            msg.ok ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}
    </Card>
  );
}
