"use client";

import { useEffect, useState } from "react";
import { formatJalaliFull } from "@/lib/jalali";
import { Icon } from "./icons";

/**
 * چیپ «امروز» با تاریخ شمسی — کامپوننت کلاینت تا تاریخ به وقتِ
 * مرورگر کاربر (منطقهٔ زمانی خودش) محاسبه شود و هیدریشن با سرور
 * (UTC) مغایرت نداشته باشد؛ پیش از mount فقط «امروز» نشان می‌دهد.
 */
export function TodayChip({ className = "" }: { className?: string }) {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    // با تایمر: setState داخل کال‌بک انجام می‌شود نه همگام در بدنهٔ افکت
    const t = setTimeout(() => {
      try {
        setToday(formatJalaliFull(new Date()));
      } catch {
        setToday(null);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} data-testid="today-jalali">
      <Icon name="calendar" className="h-3.5 w-3.5" aria-hidden />
      <span suppressHydrationWarning>{today ?? "امروز"}</span>
    </span>
  );
}
