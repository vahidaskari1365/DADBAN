import { Icon } from "@/components/icons";
import { formatJalali, formatTime } from "@/lib/money";
import type { EventItem } from "./portal-server";

/**
 * تایم‌لاین عمودی روند پرونده — کلاس‌های امضای دادپیو:
 * dp-timeline + dp-timeline-item (done|doing) + dp-timeline-dot
 */
export function CaseTimeline({
  events,
  progress,
  showMeta = true,
}: {
  events: EventItem[];
  progress: number;
  showMeta?: boolean;
}) {
  const withProgress = events.filter((e) => typeof e.progress === "number");
  const topProgress = withProgress.reduce((max, e) => Math.max(max, e.progress ?? 0), 0);

  return (
    <div className="dp-timeline max-h-96 overflow-y-auto pl-1">
      {events.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
          هنوز اقدامی برای این پرونده ثبت نشده است.
        </p>
      )}
      {events.map((e) => {
        const isDone = typeof e.progress === "number" && e.progress < topProgress;
        const isDoing = typeof e.progress === "number" && e.progress === topProgress && topProgress > 0;
        const state = isDone ? "done" : isDoing ? "doing" : "";
        return (
          <div key={e.id} className={`dp-timeline-item relative pb-6 pr-9 last:pb-1 ${state}`}>
            <span className="dp-timeline-dot" aria-hidden />
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-[13px] font-bold text-foreground">{e.title}</strong>
              {typeof e.progress === "number" && (
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                  مرحله {e.progress}٪
                </span>
              )}
              {!e.visibleToClient && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">داخلی</span>
              )}
            </div>
            {showMeta && (
              <small className="mt-1 block leading-6 text-muted">
                {formatJalali(e.createdAt)} · {formatTime(e.createdAt)}
                {e.description ? ` · ${e.description}` : ""}
                {e.actorName ? ` · ${e.actorName}` : ""}
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** نوار پیشرفت + برچسب — نسخهٔ کوچک برای کارت داشبورد */
export function CaseProgressHeader({ progress, tag }: { progress: number; tag?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-full max-w-56 overflow-hidden rounded-full bg-surface-3">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
      <span className="flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold text-primary">
        <Icon name="bolt" className="h-3 w-3" />
        {progress}٪ پیشرفت{tag ? ` · ${tag}` : ""}
      </span>
    </div>
  );
}
