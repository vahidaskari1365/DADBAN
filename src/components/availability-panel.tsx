"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";

interface Day {
  date: string;
  label: string;
}
interface Slot {
  start: string;
  label: string;
}

/**
 * پنل نوبت واقعی وکیل: روزهای قابل رزرو و زمان‌های آزاد واقعی
 * (قوانین هفتگی منهای مشاوره‌های رزروشده) را از /api/availability می‌گیرد.
 */
export function AvailabilityPanel({ lawyerSlug, durationMin = 30 }: { lawyerSlug: string; durationMin?: number }) {
  const router = useRouter();
  const [days, setDays] = useState<Day[]>([]);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const apiUrl = useCallback(
    (d: string) =>
      `/api/availability?lawyer=${encodeURIComponent(lawyerSlug)}${d ? `&date=${d}` : ""}&duration=${durationMin}`,
    [lawyerSlug, durationMin],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(""));
        const data = await res.json();
        if (cancelled || !data.ok) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const dayList: Day[] = data.days ?? [];
        const first = dayList[0]?.date ?? "";
        let slotList: Slot[] = [];
        if (first) {
          const res2 = await fetch(apiUrl(first));
          const data2 = await res2.json();
          if (!cancelled && data2.ok) slotList = data2.slots ?? [];
        }
        if (cancelled) return;
        setDays(dayList);
        setDate(first);
        setSlots(slotList);
        setLoaded(true);
        trackEvent("availability_viewed");
      } catch {
        if (!cancelled) setLoaded(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const selectDay = async (d: string) => {
    setDate(d);
    setLoading(true);
    try {
      const res = await fetch(apiUrl(d));
      const data = await res.json();
      setSlots(data.ok ? (data.slots ?? []) : []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const pick = (slot: Slot) => {
    trackEvent("slot_selected");
    router.push(
      `/consultation?lawyer=${encodeURIComponent(lawyerSlug)}&date=${date}&slot=${encodeURIComponent(slot.start)}#booking-form`,
    );
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => void selectDay(d.date)}
            className={`rounded-lg border px-2 py-2 text-center text-[11px] transition-colors cursor-pointer ${
              date === d.date
                ? "border-primary bg-primary-soft font-bold text-primary"
                : "border-border bg-surface-2 text-foreground-soft hover:border-primary/30"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {date && (
        <div className="mt-3">
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-muted">
              <Icon name="clock" className="h-3.5 w-3.5 animate-pulse" /> در حال بررسی نوبت‌ها…
            </p>
          ) : slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {slots.slice(0, 9).map((s) => (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => pick(s)}
                  className="rounded-lg border border-success/30 bg-success/5 px-2 py-2 text-center text-[11px] font-bold text-success transition-all cursor-pointer hover:bg-success/10 hover:shadow-sm"
                  title="انتخاب این نوبت"
                >
                  {faNum(s.label.split("— ")[1] ?? s.label)}
                </button>
              ))}
            </div>
          ) : loaded ? (
            <p className="mt-1 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted">
              برای این روز نوبت آزاد ثبت نشده است؛ روز دیگری را انتخاب کنید.
            </p>
          ) : null}
        </div>
      )}
      {!days.length && loaded && !loading && (
        <p className="mt-1 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted">
          تقویم نوبت‌های این وکیل هنوز فعال نشده است؛ می‌توانید مستقیم درخواست مشاوره ثبت کنید.
        </p>
      )}
    </div>
  );
}
