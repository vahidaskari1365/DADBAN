"use client";

import { useRef, type ReactNode } from "react";

/**
 * کارت با افکت اسپات‌لایت دنبال‌کننده موس.
 * فقط متغیرهای CSS (‎--mx / ‎--my) را ست می‌کند؛ خودِ افکت در globals.css است.
 */
export function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={className}
    >
      {children}
    </div>
  );
}
