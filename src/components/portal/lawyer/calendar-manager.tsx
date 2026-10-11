"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/panel-widgets";
import { WEEK_DAYS, formatJalaliLong, formatTime, labelStatus, toJalali, toFa } from "@/lib/money";
import type { AppointmentItem } from "./portal-server";

export type CalendarGroup = { key: string; dayLabel: string; weekday: string; items: AppointmentItem[] };

/** گروه‌بندی رویدادها بر اساس تاریخ شمسی (سمت کلاینت برای هم‌افزایی با فرم افزودن) */
export function groupByJalaliDay(items: AppointmentItem[]): CalendarGroup[] {
  const map = new Map<string, CalendarGroup>();
  const sorted = [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const it of sorted) {
    const d = new Date(it.startsAt);
    const j = toJalali(d);
    const key = `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        dayLabel: formatJalaliLong(d),
        weekday: WEEK_DAYS[(d.getDay() + 1) % 7],
        items: [],
      });
    }
    map.get(key)!.items.push(it);
  }
  return [...map.values()];
}

/** فرم افزودن رویداد تقویم وکیل → POST /api/portal/lawyer/appointments */
export function CalendarManager({
  initialItems,
  caseOptions,
  canWrite,
}: {
  initialItems: AppointmentItem[];
  caseOptions: { id: number; label: string }[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<AppointmentItem[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("hearing");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [caseId, setCaseId] = useState(caseOptions[0]?.id ? String(caseOptions[0].id) : "");
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => groupByJalaliDay(items), [items]);
  const deadlines = useMemo(() => items.filter((i) => i.kind === "deadline"), [items]);

  async function submit() {
    if (title.trim().length < 3) {
      toast.error("عنوان رویداد را وارد کنید.");
      return;
    }
    if (!date) {
      toast.error("تاریخ رویداد را انتخاب کنید.");
      return;
    }
    setSaving(true);
    try {
      const startsAt = new Date(`${date}T${time || "09:00"}`);
      const res = await fetch("/api/portal/lawyer/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          kind,
          location: location.trim(),
          startsAt: startsAt.toISOString(),
          caseId: caseId ? Number(caseId) : undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; appointments?: AppointmentItem[]; error?: string };
      if (data.ok && data.appointments) {
        setItems(data.appointments);
        toast.success("رویداد به تقویم اضافه شد.");
        setTitle("");
        setLocation("");
        setDate("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error ?? "افزودن رویداد ناموفق بود.");
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
        <p className="text-xs text-muted">جلسات رسیدگی، مشاوره‌ها و مهلت‌های قانونی در یک تقویم واحد.</p>
        {canWrite && !open && (
          <Button variant="primary" size="md" onClick={() => setOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            افزودن رویداد
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <b className="text-sm text-foreground">رویداد جدید تقویم</b>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن فرم رویداد"
              className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-foreground-soft hover:bg-surface-3"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs text-muted">عنوان</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً جلسه رسیدگی · پرونده الزام به تنظیم سند"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">نوع رویداد</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              >
                <option value="hearing">جلسه رسیدگی</option>
                <option value="consultation">مشاوره</option>
                <option value="deadline">مهلت قانونی</option>
                <option value="task">اقدام داخلی</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">مکان</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="مثلاً شعبه ۱۵ دادگاه عمومی حقوقی تهران"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">تاریخ (میلادی تقویم سامانه)</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">ساعت</span>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            {caseOptions.length > 0 && (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs text-muted">مرتبط با پرونده (اختیاری)</span>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
                >
                  <option value="">بدون پرونده</option>
                  {caseOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <Button variant="primary" size="md" onClick={() => void submit()} disabled={saving}>
            <Icon name="check" className="h-4 w-4" />
            {saving ? "در حال ثبت..." : "ثبت رویداد"}
          </Button>
        </div>
      )}

      {/* فهرست گروه‌بندی‌شده */}
      <div className="mt-4 max-h-96 space-y-4 overflow-y-auto pl-1">
        {groups.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">رویدادی در تقویم ثبت نشده است.</p>
        )}
        {groups.map((g) => (
          <section key={g.key} aria-label={`رویدادهای ${g.dayLabel}`}>
            <b className="mb-2 block text-[13px] font-bold text-foreground">
              {g.weekday} {formatJalaliLong(g.items[0]?.startsAt ?? "")}
            </b>
            <div className="space-y-2">
              {g.items.map((it) => {
                const s = labelStatus("appointment", it.kind);
                return (
                  <div key={it.id} className="rounded-xl border border-border p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b className="text-[13px] text-foreground">{toFa(formatTime(it.startsAt))} · {it.title}</b>
                      <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                    </div>
                    {it.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                        <Icon name="location" className="h-3.5 w-3.5" />
                        {it.location}
                      </p>
                    )}
                    {it.notes && <p className="mt-1 text-xs text-muted">{it.notes}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* مهلت‌های قانونی */}
      <div className="mt-6">
        <b className="mb-2 flex items-center gap-2 text-[13px] font-bold text-foreground">
          <Icon name="alert" className="h-4 w-4 text-danger" />
          مهلت‌های قانونی
        </b>
        <div className="space-y-2">
          {deadlines.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">مهلت قانونی ثبت‌شده‌ای وجود ندارد.</p>
          )}
          {deadlines.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
              <div>
                <b className="text-[13px] text-danger">{d.title}</b>
                <p className="mt-0.5 text-xs text-muted">{formatJalaliLong(d.startsAt)} · {toFa(formatTime(d.startsAt))}</p>
              </div>
              <span className="rounded-full bg-danger/15 px-2.5 py-1 text-[11px] font-bold text-danger">پایان مهلت</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
