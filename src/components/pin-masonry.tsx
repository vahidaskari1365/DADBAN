"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * چیدمان masonry پینترستی با ستون‌های flex واقعی — بدون CSS Columns.
 *
 * چرا CSS Columns کنار گذاشته شد؟ iOS Safari وقتی فرزندانِ ستون‌ها transform
 * دارند (مثل انیمیشن Reveal) همه آیتم‌ها را در «یک» ستون می‌ریزد و بقیه
 * صفحه خالی می‌ماند (باگ fragmentation مرورگر). ستون‌های flex به قابلیت
 * fragmentation وابسته نیستند و روی همه مرورگرها یکسان رندر می‌شوند.
 *
 * تعداد ستون‌ها مثل قبل: موبایل ۲ ستون، از 40rem سه ستون، از 64rem چهار ستون.
 * در RTL ستون اول خودکار از راست شروع می‌شود (flex در سند راست‌به‌چپ).
 * مقدار اولیه سرور ۲ ستون است تا hydration امن باشد؛ بعد از mount تعداد
 * واقعی بر اساس عرض صفحه ست می‌شود.
 */
const BREAKPOINTS: Array<[string, number]> = [
  ["(min-width: 64rem)", 4],
  ["(min-width: 40rem)", 3],
];
const BASE_COLS = 2;

function columnCount(): number {
  if (typeof window === "undefined") return BASE_COLS;
  for (const [query, cols] of BREAKPOINTS) {
    if (window.matchMedia(query).matches) return cols;
  }
  return BASE_COLS;
}

export function PinMasonry({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [cols, setCols] = useState(BASE_COLS);

  useEffect(() => {
    const update = () => setCols(columnCount());
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  const items = Array.isArray(children) ? children : [children];
  const buckets: ReactNode[][] = Array.from({ length: cols }, () => []);
  items.forEach((child, i) => buckets[i % cols].push(child));

  return (
    <div className={`pin-masonry flex items-start gap-3 sm:gap-4 ${className}`}>
      {buckets.map((bucket, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
          {bucket}
        </div>
      ))}
    </div>
  );
}
