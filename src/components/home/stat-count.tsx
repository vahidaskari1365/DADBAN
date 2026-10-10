"use client";

import { useEffect, useRef, useState } from "react";
import { faNum } from "@/lib/data";

/**
 * شمارندهٔ متحرک آمار «بازار پرونده‌ها» در صفحهٔ اول:
 * SSR عدد واقعی را رندر می‌کند (بدون hydration mismatch و بدون گره‌خوردن به JS)،
 * بعد از ورود به دید با easeOutCubic از صفر تا عدد واقعی می‌شمارد.
 * با prefers-reduced-motion یا value=۰ ثابت می‌ماند.
 */
export function StatCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const DUR = 1400;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / DUR);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(eased * value));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        setDisplay(0);
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <span ref={ref}>{faNum(display)}</span>;
}
