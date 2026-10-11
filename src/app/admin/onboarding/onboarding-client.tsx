"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatCard, StatusBadge } from "@/components/panel-widgets";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatJalaliDateTime } from "@/lib/jalali";
import { faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * صف روی‌بوردینگ وکلای واقعی — کارتابل ادمین.
 * درخواست‌های در انتظار اول، سپس تأییدشده/ردشده (فیلتر تب‌ها)؛
 * «تأیید» پروفایل وکیل می‌سازد و حساب متقاضی را متصل می‌کند (سمت سرور در یک تراکنش).
 */

type OnboardingRow = {
  id: number;
  userId: number | null;
  name: string;
  phone: string;
  email: string | null;
  licenseNo: string;
  lawyerType: string; // wakil | karamooz
  city: string;
  province: string;
  experienceYears: number;
  specialties: string[];
  bio: string;
  status: string; // pending | approved | rejected
  adminNote: string | null;
  agreementVersion: string | null;
  agreementSignedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

const STATUS_FA: Record<string, { label: string; tone: "primary" | "success" | "danger" | "neutral" }> = {
  pending: { label: "در انتظار بررسی", tone: "primary" },
  approved: { label: "تأییدشده", tone: "success" },
  rejected: { label: "ردشده", tone: "danger" },
};

const LAWYER_TYPE_FA: Record<string, string> = {
  wakil: "وکیل رسمی",
  karamooz: "کارآموز وکالت",
};

type Tab = "pending" | "approved" | "rejected" | "all";

export default function OnboardingClient({
  rows,
  degraded,
}: {
  rows: OnboardingRow[];
  degraded: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [tab, setTab] = useState<Tab>("pending");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setToast({ ok, text });
    window.setTimeout(() => setToast(null), 5000);
  }

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      all: rows.length,
    }),
    [rows],
  );

  const filtered = tab === "all" ? rows : rows.filter((r) => r.status === tab);

  async function review(row: OnboardingRow, action: "approve" | "reject") {
    setBusyId(row.id);
    try {
      const res = await fetch("/api/lawyer-onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, action, note: action === "reject" ? rejectNote.trim() : undefined }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        if (res.status === 401) {
          flash(false, t("نشست ادمین منقضی شده؛ دوباره وارد شوید."));
        } else {
          flash(false, d.error ? t(d.error) : t("انجام اقدام ناموفق بود؛ دوباره تلاش کنید."));
        }
        return;
      }
      if (action === "approve") {
        const emailLine = d.emailAttempted
          ? d.emailNotified
            ? " " + t("نتیجه با ایمیل به متقاضی اطلاع داده شد.")
            : " " + t("ایمیل اطلاع‌رسانی ارسال نشد (پروایدر فعال نیست) — نتیجه را دستی اطلاع دهید.")
          : "";
        flash(true, t("درخواست تأیید شد؛ پروفایل وکیل ساخته شد و حساب متقاضی متصل گردید.") + emailLine);
      } else {
        flash(true, t("درخواست رد شد و توضیح کارشناس ثبت گردید."));
      }
      setRejectingId(null);
      setRejectNote("");
      router.refresh();
    } catch {
      flash(false, t("خطای شبکه؛ اتصال خود را بررسی کنید."));
    } finally {
      setBusyId(null);
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "pending", label: "در انتظار بررسی" },
    { id: "approved", label: "تأییدشده" },
    { id: "rejected", label: "ردشده" },
    { id: "all", label: "همه" },
  ];

  return (
    <div>
      {/* آمار صف */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("در انتظار بررسی")} value={faNum(counts.pending)} hint={t("صف جاری کارشناس")} icon="clock" tone={counts.pending > 0 ? "gold" : "default"} />
        <StatCard label={t("تأییدشده")} value={faNum(counts.approved)} hint={t("پروفایل ساخته‌شده")} icon="badge" tone="success" />
        <StatCard label={t("ردشده")} value={faNum(counts.rejected)} hint={t("با توضیح کارشناس")} icon="x" tone="danger" />
        <StatCard label={t("کل درخواست‌ها")} value={faNum(counts.all)} hint={t("۲۰۰ رکورد اخیر")} icon="folder" />
      </div>

      {degraded && (
        <p role="status" className="mt-4 rounded-xl border border-accent/30 bg-accent-soft/30 px-3 py-2 text-xs leading-6 text-accent-text">
          {t("فهرست درخواست‌ها موقتاً در دسترس نیست (خطای دیتابیس)؛ به‌محض رفع مشکل همین‌جا نمایش داده می‌شود.")}
        </p>
      )}

      {/* تب‌ها */}
      <div className="mt-6 flex flex-wrap items-center gap-2" role="tablist" aria-label={t("فیلتر وضعیت درخواست‌ها")}>
        {TABS.map((tb) => {
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tb.id)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "border border-border bg-surface text-foreground-soft hover:border-primary/40 hover:text-primary"
              }`}
            >
              {t(tb.label)}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/25 text-white" : "bg-surface-2 text-muted"}`}>
                {faNum(counts[tb.id])}
              </span>
            </button>
          );
        })}
      </div>

      {/* فهرست درخواست‌ها */}
      <div className="nice-scroll mt-4 max-h-96 space-y-4 overflow-y-auto pe-1" data-testid="onboarding-list">
        {!degraded && filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm leading-7 text-muted">
            {tab === "pending"
              ? t("درخواستی در صف بررسی نیست؛ به‌محض ثبت فرم همکاری در /join-as-lawyer همین‌جا می‌نشیند.")
              : t("موردی با این فیلتر یافت نشد.")}
          </p>
        )}

        {filtered.map((r) => {
          const st = STATUS_FA[r.status] ?? { label: r.status, tone: "neutral" as const };
          const busy = busyId === r.id;
          return (
            <Card key={r.id} hover={false} className="p-5" data-testid="onboarding-row">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-base font-extrabold text-foreground">
                    <Icon name="user" className="h-4.5 w-4.5 text-primary" />
                    {r.name}
                    <StatusBadge tone={st.tone}>{t(st.label)}</StatusBadge>
                    <span className="text-xs font-bold text-muted">#{faNum(r.id)}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span dir="ltr" className="font-mono">{r.phone}</span>
                    {r.email && <span dir="ltr" className="font-mono">{r.email}</span>}
                    <span>{t("پروانه:")} <b className="font-mono" dir="ltr">{r.licenseNo}</b></span>
                    <span>{t(LAWYER_TYPE_FA[r.lawyerType] ?? r.lawyerType)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="location" className="h-3.5 w-3.5" />
                      {r.province} / {r.city}
                    </span>
                    <span>{tf("سابقه: {n} سال", { n: faNum(r.experienceYears) })}</span>
                    {r.userId != null && <span>{tf("کاربر متصل: #{n}", { n: faNum(r.userId) })}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-end text-[11px] leading-5 text-muted">
                  <p>{t("ثبت:")} {formatJalaliDateTime(r.createdAt)}</p>
                  {r.agreementSignedAt && (
                    <p className="flex items-center justify-end gap-1 text-success" title={tf("نسخهٔ {v}", { v: r.agreementVersion ?? "—" })}>
                      <Icon name="signature" className="h-3.5 w-3.5" />
                      {tf("قرارداد امضاشده ({v})", { v: r.agreementVersion ?? "—" })}
                    </p>
                  )}
                  {r.reviewedAt && <p>{t("بررسی:")} {formatJalaliDateTime(r.reviewedAt)}</p>}
                </div>
              </div>

              {/* تخصص‌ها + معرفی */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.specialties.map((s) => (
                  <span key={s} className="rounded-full border border-primary/25 bg-primary-soft px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    {t(s)}
                  </span>
                ))}
              </div>
              {r.bio && (
                <p className="mt-3 rounded-xl bg-surface-2/50 p-3 text-xs leading-6 text-foreground-soft">
                  {r.bio}
                </p>
              )}
              {r.adminNote && (
                <p className="mt-3 rounded-xl border border-border bg-surface-2/50 p-3 text-xs leading-6 text-muted">
                  {t("توضیح کارشناس:")} {r.adminNote}
                </p>
              )}

              {/* اقدام‌ها — فقط درخواست‌های pending */}
              {r.status === "pending" && (
                <div className="mt-4 border-t border-border pt-4">
                  {rejectingId === r.id ? (
                    <div className="space-y-2">
                      <label htmlFor={`reject-note-${r.id}`} className="block text-xs font-bold text-foreground-soft">
                        {t("توضیح رد (برای متقاضی الزامی است) *")}
                      </label>
                      <textarea
                        id={`reject-note-${r.id}`}
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder={t("مثال: تصویر پروانه واضح نیست؛ لطفاً با پشتیبانی تماس بگیرید.")}
                        className="min-h-11 w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => review(r, "reject")}
                          disabled={busy || rejectNote.trim().length < 2}
                          data-testid="onboarding-reject"
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-danger px-4 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Icon name="x" className="h-4 w-4" />
                          {busy ? t("در حال ثبت…") : t("ثبت رد درخواست")}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => review(r, "approve")}
                        disabled={busy}
                        data-testid="onboarding-approve"
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-success px-4 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="check" className="h-4 w-4" />
                        {busy ? t("در حال بررسی…") : t("تأیید — ساخت پروفایل و اتصال حساب")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingId(r.id);
                          setRejectNote("");
                        }}
                        disabled={busy}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-danger/40 bg-danger/5 px-4 text-sm font-bold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="x" className="h-4 w-4" />
                        {t("رد")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* توست بازخورد */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 start-6 z-50 max-w-sm rounded-2xl border p-4 text-xs font-bold leading-6 shadow-lg ${
            toast.ok
              ? "border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-surface text-success"
              : "border-danger/30 bg-surface text-danger"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
