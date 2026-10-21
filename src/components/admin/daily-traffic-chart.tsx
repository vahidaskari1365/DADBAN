import { faNum } from "@/lib/data";
import { faDayLabel, faDayShort, tehranDay } from "@/lib/visit-analytics";

export interface TrafficDayRow {
  day: string;
  views: number;
  uniq: number;
}

/**
 * نمودار میله‌ای بازدید روزانه — CSS خالص بدون کتابخانهٔ خارجی.
 * در داشبورد مدیریت (نسخهٔ فشرده) و صفحهٔ «گزارش بازدید» (نسخهٔ کامل) استفاده می‌شود.
 */
export function DailyTrafficChart({
  series,
  testid,
  compact = false,
}: {
  series: TrafficDayRow[];
  testid: string;
  compact?: boolean;
}) {
  const max = Math.max(1, ...series.map((s) => s.views));
  const today = tehranDay();
  return (
    <div data-testid={testid}>
      <div className={`flex items-end gap-1 sm:gap-1.5 ${compact ? "h-28" : "h-44"}`} dir="ltr">
        {series.map((s) => {
          const h = Math.max(Math.round((s.views / max) * 100), 3);
          const isToday = s.day === today;
          return (
            <div
              key={s.day}
              className="group relative flex h-full min-w-0 flex-1 cursor-default flex-col justify-end"
              title={`${faDayLabel(s.day)} — ${faNum(s.views)} بازدید / ${faNum(s.uniq)} بازدیدکنندهٔ یکتا`}
            >
              {!compact && (
                <span className="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background group-hover:block">
                  {faNum(s.views)}
                </span>
              )}
              <div
                className={`w-full rounded-t-md transition-all ${
                  isToday
                    ? "bg-gradient-to-t from-accent to-accent/70 group-hover:from-accent-hover"
                    : "bg-gradient-to-t from-primary/85 to-primary/55 group-hover:from-primary group-hover:to-primary/75"
                }`}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1 sm:gap-1.5" dir="ltr">
        {series.map((s, i) => (
          <span
            key={s.day}
            className={`min-w-0 flex-1 truncate text-center font-bold ${compact ? "text-[8px]" : "text-[9px] sm:text-[10px]"} ${i === series.length - 1 ? "text-accent-text" : "text-foreground-soft"}`}
          >
            {faDayShort(s.day)}
          </span>
        ))}
      </div>
    </div>
  );
}
