"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { templateT, type TTemplateFn } from "@/lib/i18n/core";

/**
 * LiveActivity — اعلان اثبات اجتماعی زنده (Social proof) به سبک آمازون.
 * فقط فعالیت‌های «واقعی» از /api/activity/recent را نشان می‌دهد؛
 * اگر دیتابیس فعالیت واقعی نداشته باشد، هیچ‌وقت چیزی نمایش داده نمی‌شود.
 *
 * رفتار: اولین اعلان بعد از ۷ ثانیه، سپس هر ~۲۵ ثانیه، هر بار ۶.۵ ثانیه
 * نمایان، حداکثر ۵ بار در session، قابل بستن، بدون بلاک‌کردن کلیک.
 */

type Item = { kind: string; text: string; ts: string };

const HIDDEN_ROUTES = ["/admin", "/manage", "/dashboard", "/developer", "/login", "/register"];

function agoFa(ts: string, tf: TTemplateFn): string {
  const diff = Math.max(0, Date.now() - new Date(ts).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return tf("همین لحظه", {});
  if (m < 60) return tf("{n} دقیقه پیش", { n: String(m) });
  const h = Math.floor(m / 60);
  if (h < 24) return tf("{n} ساعت پیش", { n: String(h) });
  return tf("{n} روز پیش", { n: String(Math.floor(h / 24)) });
}

const faDigits = (s: string | number) =>
  String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export function LiveActivity() {
  const t = useT();
  const tf = templateT(t);
  const pathname = usePathname() || "/";
  const [items, setItems] = useState<Item[]>([]);
  const [current, setCurrent] = useState<Item | null>(null);
  const [visible, setVisible] = useState(false);
  const idx = useRef(0);
  const shown = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // در مسیرهای مدیریتی کلاً غیرفعال
  const allowed = !HIDDEN_ROUTES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    fetch("/api/activity/recent")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d?.items)) setItems(d.items);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [allowed]);

  useEffect(() => {
    if (!allowed || items.length === 0) return;

    const cycle = () => {
      if (shown.current >= 5) return;
      const item = items[idx.current % items.length];
      idx.current += 1;
      shown.current += 1;
      setCurrent(item);
      setVisible(true);
      timers.current.push(
        setTimeout(() => setVisible(false), 6500),
        setTimeout(cycle, 6500 + 19000),
      );
    };

    const first = setTimeout(cycle, 7000);
    timers.current.push(first);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [items, allowed]);

  if (!allowed || items.length === 0 || !current) return null;

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-40 hidden transition-all duration-300 sm:block ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="flex max-w-xs items-start gap-3 rounded-2xl border border-border bg-surface/95 p-3.5 shadow-[var(--shadow-lift)] backdrop-blur">
        <span className="relative mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon name="check" className="h-4 w-4" />
          <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-success" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold leading-6 text-foreground">{current.text}</p>
          <p className="mt-0.5 text-[10px] text-muted">
            {faDigits(agoFa(current.ts, tf))} · {t("فعالیت واقعی پلتفرم")}
          </p>
        </div>
        <button
          type="button"
          aria-label={t("بستن اعلان")}
          onClick={() => {
            setVisible(false);
            shown.current = 5; // دیگر نمایش نده
          }}
          className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
