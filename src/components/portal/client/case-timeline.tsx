"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { formatJalaliLong, formatTime, toFa } from "@/lib/money";
import type { EventItem } from "./types";

const ACTOR_LABEL: Record<string, string> = {
  lawyer: "وکیل",
  trainee: "کارآموز",
  system: "دادپیو",
  client: "موکل",
};

/**
 * تایم‌لاین عمودی روند پرونده — فقط رخدادهای قابل نمایش به موکل.
 * جدیدترین رخداد با نقطهٔ طلایی (doing) و بقیه با نقطهٔ سبز (done) مشخص می‌شوند.
 */
export default function CaseTimeline({ caseId, initialEvents }: { caseId: number; initialEvents: EventItem[] }) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/events`, { cache: "no-store" });
      if (!res.ok) {
        setError("دریافت روند پرونده ناموفق بود.");
        return;
      }
      const data = (await res.json()) as { ok?: boolean; events?: EventItem[] };
      if (data?.ok && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setError("دریافت روند پرونده ناموفق بود.");
      }
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (initialEvents.length === 0) queueMicrotask(() => void load());
  }, [initialEvents.length, load]);

  if (error && events.length === 0) {
    return (
      <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        {error}
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
        <Icon name="clock" className="mx-auto mb-2 h-6 w-6" />
        هنوز رخدادی برای نمایش ثبت نشده است؛ به‌محض ثبت اقدام جدید در همین بخش اطلاع‌رسانی می‌شود.
      </div>
    );
  }

  /* تایم‌لاین به ترتیب زمانی (قدیمی → جدید) */
  const ordered = [...events].sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-muted">{toFa(ordered.length)} رخداد ثبت‌شده برای این پرونده</p>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
        >
          <Icon name="check" className="h-3.5 w-3.5 text-success" />
          {loading ? "در حال بروزرسانی…" : "بروزرسانی"}
        </button>
      </div>

      <ol className="dp-timeline space-y-5 pr-1">
        {ordered.map((ev, i) => {
          const isCurrent = i === ordered.length - 1;
          return (
            <li key={ev.id} className={`dp-timeline-item relative pr-8 ${isCurrent ? "doing" : "done"}`}>
              <span className="dp-timeline-dot" aria-hidden />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-sm font-bold ${isCurrent ? "text-accent" : "text-foreground"}`}>{ev.title}</h3>
                  {ev.progress !== null && ev.progress !== undefined && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                      پیشرفت {toFa(ev.progress)}٪
                    </span>
                  )}
                  {isCurrent && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                      آخرین وضعیت
                    </span>
                  )}
                </div>
                {ev.description && <p className="mt-1 text-[13px] leading-6 text-muted">{ev.description}</p>}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span className="flex items-center gap-1 font-semibold text-foreground-soft">
                    <Icon name={ev.actor === "system" ? "sparkles" : ev.actor === "client" ? "user" : "gavel"} className="h-3 w-3" />
                    {ev.actorName || ACTOR_LABEL[ev.actor] || "دادپیو"}
                  </span>
                  <span>{formatJalaliLong(ev.createdAt)}</span>
                  <span>ساعت {formatTime(ev.createdAt)}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
