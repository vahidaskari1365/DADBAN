"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { formatJalaliDateTime } from "@/lib/jalali";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * یادآورهای پنل وکیل — عنوان + توضیح + تاریخ (تقویم جلالی) و ساعت.
 * سررسید نزدیک/گذشته با بَج مشخص می‌شود؛ تکمیل و حذف هم همین‌جاست.
 */

interface Reminder {
  id: number;
  title: string;
  note: string | null;
  dueAt: string;
  done: boolean;
}

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

function faHour(h: string): string {
  const [hh, mm] = h.split(":");
  const faDigits = "۰۱۲۳۴۵۶۷۸۹";
  return `${[...hh].map((d) => faDigits[Number(d)]).join("")}:${[...mm].map((d) => faDigits[Number(d)]).join("")}`;
}

export function RemindersPanel() {
  const t = useT();
  const tf = templateT(t);
  const [items, setItems] = useState<Reminder[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unauthed, setUnauthed] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("10:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  /** زمان مرجع برای تشخیص سررسید گذشته — فقط در load تازه می‌شود (بدون impure render) */
  const [now, setNow] = useState(0);

  const load = useCallback(() => {
    fetch("/api/lawyer/reminders", { cache: "no-store" })
      .then(async (r) => ({ status: r.status, data: await r.json() }))
      .then(({ status, data: d }) => {
        if (!d.ok) {
          if (status === 401) setUnauthed(true);
          return;
        }
        setUnauthed(false);
        setItems(d.reminders ?? []);
        setNow(Date.now());
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const add = async () => {
    setError(null);
    setFlash(null);
    if (!title.trim() || !date) {
      setError(t("عنوان و تاریخ یادآور را کامل کنید."));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/lawyer/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, note, date, hour }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setTitle("");
      setNote("");
      setDate("");
      setFlash(t("یادآور ثبت شد."));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ثبت یادآور انجام نشد."));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: number, done: boolean) => {
    await fetch("/api/lawyer/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done }),
    }).catch(() => {});
    load();
  };

  const remove = async (id: number) => {
    await fetch(`/api/lawyer/reminders?id=${id}`, { method: "DELETE" }).catch(() => {});
    load();
  };

  if (unauthed) return null;

  const fieldCls =
    "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <Card hover={false} id="reminders" className="scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="clock" className="h-5 w-5 text-primary" /> {t("یادآورها")}
        </h2>
        {items.length > 0 && <Badge tone="neutral">{tf("{n} باز", { n: faNum(items.filter((x) => !x.done).length) })}</Badge>}
      </div>

      {flash && <p className="mt-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-xs font-bold text-success" role="status">{flash}</p>}
      {error && <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-bold text-danger" role="alert">{error}</p>}

      {/* فرم یادآور جدید */}
      <div className="mt-3 rounded-xl border border-border bg-surface-2/40 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("عنوان یادآور — مثلاً جلسه دادرسی پرونده شف-…")}
            className={fieldCls}
            aria-label={t("عنوان یادآور")}
          />
          <div className="flex gap-2">
            <select value={hour} onChange={(e) => setHour(e.target.value)} className={fieldCls} aria-label={t("ساعت یادآور")}>
              {HOURS.map((h) => (
                <option key={h} value={h}>{faHour(h)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">{t("تاریخ (شمسی)")}</span>
            <JalaliDatePicker value={date} onChange={setDate} />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted">{t("توضیح (اختیاری)")}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("جزئیات یادآور…")}
              className="w-full resize-y rounded-xl border border-border-strong bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
        <Button onClick={add} disabled={busy} icon="check" className="mt-2 w-full sm:w-auto">
          {busy ? t("در حال ثبت…") : t("ثبت یادآور")}
        </Button>
      </div>

      {/* فهرست یادآورها */}
      {!loaded ? (
        <p className="mt-4 text-center text-sm text-muted">{t("در حال دریافت…")}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {t("یادآوری ثبت نشده است؛ جلسات، موعدهای پرونده و کارهای عقب‌افتاده را همین‌جا ثبت کنید.")}
        </p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pl-1" data-testid="reminders-list">
          {items.map((r) => {
            const overdue = !r.done && new Date(r.dueAt).getTime() < now;
            return (
              <li key={r.id} className={`rounded-xl border p-3 ${overdue ? "border-danger/40 bg-danger/5" : "border-border bg-surface-2/40"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`flex min-w-0 items-center gap-2 text-sm font-bold ${r.done ? "text-muted line-through" : "text-foreground"}`}>
                    {overdue && <Badge tone="danger">{t("گذشته")}</Badge>}
                    {r.title}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted">{formatJalaliDateTime(r.dueAt)}</span>
                </div>
                {r.note && <p className="mt-1 text-xs leading-6 text-foreground-soft">{r.note}</p>}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(r.id, !r.done)}>
                    {r.done ? t("بازگرداندن") : t("انجام شد")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-danger">
                    {t("حذف")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
