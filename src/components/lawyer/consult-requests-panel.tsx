"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice, CONSULT_TYPE_FA } from "@/lib/data";
import { formatJalaliDateTime } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * کارتابل مشاورهٔ وکیل — چرخهٔ کامل درخواست‌های موکل، همه‌چیز از این‌جا:
 *   در انتظار (pending/payment_pending/paid) → تأیید (با یا بدون ثبت نوبت) → نوبت‌دار/تأییدشده
 *   → تکمیل | لغو. تاریخچهٔ اخیر هم همین‌جاست.
 * داده‌ها از /api/consultations/manage (گارد وکیل/عضو تیم با دسترسی consultations).
 */

type Row = {
  id: number;
  type: string;
  duration: number;
  clientName: string;
  clientPhone: string;
  subject: string;
  startsAt: string | null;
  price: number;
  status: string;
  createdAt: string;
};

const STATUS_FA: Record<string, string> = {
  pending: "در انتظار بررسی",
  payment_pending: "در انتظار پرداخت",
  paid: "پرداخت‌شده",
  confirmed: "تأییدشده",
  scheduled: "نوبت ثبت‌شده",
  in_progress: "در حال انجام",
  completed: "تکمیل‌شده",
  cancelled: "لغوشده",
  expired: "منقضی",
  refunded: "عودت‌شده",
}; // برچسب‌ها با t() ترجمه می‌شوند

function typeIcon(t: string): "chat" | "phone" | "video" {
  return t === "video" ? "video" : t === "voice" ? "phone" : "chat";
}

export function ConsultRequestsPanel() {
  const t = useT();
  const tf = templateT(t);
  const [open, setOpen] = useState<Row[]>([]);
  const [history, setHistory] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unauthed, setUnauthed] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [slotDraft, setSlotDraft] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/consultations/manage", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401) {
        setUnauthed(true);
        setLoaded(true);
        return;
      }
      if (data.ok) {
        setOpen(data.open ?? []);
        setHistory(data.history ?? []);
        setUnauthed(false);
      }
    } catch {
      /* degraded */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      void load();
    });
    return () => {
      alive = false;
    };
  }, [load]);

  const act = async (id: number, action: "confirm" | "cancel" | "complete", okMsg: string) => {
    setBusyId(id);
    try {
      const startsAt = action === "confirm" ? slotDraft[id] || undefined : undefined;
      const res = await fetch("/api/consultations/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, startsAt }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(okMsg);
        await load();
      } else {
        toast.error(data.error ?? t("اقدام انجام نشد."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setBusyId(null);
    }
  };

  const pending = open.filter((r) => ["pending", "payment_pending", "paid"].includes(r.status));
  const booked = open.filter((r) => ["confirmed", "scheduled", "in_progress"].includes(r.status));

  return (
    <Card hover={false} id="consult-requests" className="scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="mail" className="h-5 w-5 text-accent-text" /> {t("کارتابل مشاوره — درخواست‌های موکلان")}
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary-soft/70"
        >
          <Icon name="clock" className="h-3.5 w-3.5" /> {t("به‌روزرسانی")}
        </button>
      </div>

      {!loaded ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{t("در حال دریافت…")}</p>
      ) : unauthed ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {t("برای مشاهدهٔ کارتابل با حساب وکیل (دارای دسترسی مشاوره) وارد شوید.")}
        </p>
      ) : (
        <>
          {/* ۱) درخواست‌های در انتظار تصمیم */}
          <div className="mt-4 space-y-3">
            {pending.length > 0 ? (
              pending.map((r) => (
                <div key={r.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-text">
                        <Icon name={typeIcon(r.type)} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {r.clientName} <span className="font-mono text-[11px] font-normal text-muted" dir="ltr">{faNum(r.clientPhone)}</span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">{r.subject.slice(0, 70)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone="accent">{t(CONSULT_TYPE_FA[r.type] ?? r.type)}</Badge>
                      <Badge tone="neutral">{tf("{n} دقیقه", { n: faNum(r.duration) })}</Badge>
                      <Badge tone="primary">{faPrice(r.price)}</Badge>
                      <Badge tone="neutral">{STATUS_FA[r.status] ? t(STATUS_FA[r.status]) : r.status}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <label className="flex items-center gap-2 text-xs text-muted">
                      {t("نوبت (اختیاری):")}
                      <input
                        type="datetime-local"
                        value={slotDraft[r.id] ?? ""}
                        onChange={(e) => setSlotDraft((f) => ({ ...f, [r.id]: e.target.value }))}
                        className="h-9 rounded-lg border border-border-strong bg-background px-2 text-xs outline-none focus:border-primary"
                      />
                    </label>
                    <span className="mr-auto flex items-center gap-2">
                      <Button size="sm" disabled={busyId === r.id} onClick={() => void act(r.id, "confirm", t("درخواست مشاوره تأیید شد."))} icon="check">
                        {t("تأیید")}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void act(r.id, "cancel", t("درخواست لغو شد."))} className="!text-danger">
                        {t("لغو")}
                      </Button>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                {t("درخواست در انتظار تصمیمی نیست؛ به‌محض ثبت موکل، همین‌جا نمایش داده می‌شود.")}
              </p>
            )}
          </div>

          {/* ۲) نوبت‌های قطعی‌شده */}
          {booked.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-foreground-soft">{t("تأییدشده‌ها و نوبت‌های پیش‌رو")}</p>
              <div className="mt-2 space-y-2">
                {booked.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/25 bg-success/5 p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                        <Icon name={typeIcon(r.type)} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{r.clientName}</p>
                        <p className="truncate text-xs text-muted">
                          {STATUS_FA[r.status] ? t(STATUS_FA[r.status]) : r.status}
                          {r.startsAt ? ` • ${formatJalaliDateTime(new Date(r.startsAt))}` : ` • ${t("بدون نوبت ثابت")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void act(r.id, "complete", t("مشاوره تکمیل شد."))}>
                        {t("تکمیل شد")}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void act(r.id, "cancel", t("درخواست لغو شد."))} className="!text-danger">
                        {t("لغو")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ۳) تاریخچهٔ اخیر */}
          {history.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <button type="button" onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1.5 text-xs font-bold text-muted transition-colors hover:text-foreground">
                <Icon name="chevron" className={`h-3.5 w-3.5 ${showHistory ? "" : "rotate-180"}`} />
                {tf("تاریخچهٔ اخیر ({n} مورد)", { n: faNum(history.length) })}
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1.5">
                  {history.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-2/50 px-3 py-2 text-xs">
                      <span className="font-medium text-foreground">{r.clientName} — {r.subject.slice(0, 40)}</span>
                      <span className="flex items-center gap-2 text-muted">
                        <span dir="ltr">{formatJalaliDateTime(new Date(r.createdAt))}</span>
                        <Badge tone={r.status === "completed" ? "success" : "neutral"}>{STATUS_FA[r.status] ? t(STATUS_FA[r.status]) : r.status}</Badge>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
