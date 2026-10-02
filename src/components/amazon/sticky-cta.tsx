"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";

/**
 * StickyCta — نوار اقدام چسبان موبایل به سبک «Buy Now» آمازون.
 * بعد از اسکرول ظاهر می‌شود، نزدیک فوتر مخفی می‌شود، فقط موبایل/تبلت
 * (دسکتاپ CTA در دسترس است) و بالای BottomNav می‌نشیند.
 */
export function StickyCta({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const nearBottom =
        y + window.innerHeight > document.documentElement.scrollHeight - 320;
      setShow(y > 480 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`fixed right-3 left-[4.75rem] z-40 transition-all duration-300 lg:hidden ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
      style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }}
    >
      <div className="rounded-2xl border border-border bg-surface/95 p-2.5 shadow-[var(--shadow-lift)] backdrop-blur">
        <Button href={href} className="w-full" tabIndex={show ? 0 : -1}>
          <Icon name="bolt" className="h-4 w-4" />
          {label}
        </Button>
        {sub && (
          <p className="mt-1.5 text-center text-[10px] font-semibold text-muted">{sub}</p>
        )}
      </div>
    </div>
  );
}
