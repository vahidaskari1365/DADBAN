"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { LOCALES, LOCALE_COOKIE, LOCALE_META } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/provider";

/**
 * سوییچر زبان — کرهٔ زمین با منوی ۵ زبان (فارسی/انگلیسی/عربی/ترکی/چینی).
 * زبان در کوکی `dadban_locale` ثبت و صفحه با پاک‌سازی کش PWA رفرش می‌شود
 * (دام شناخته‌شدهٔ Service Worker: بدون پاک‌سازی، پاسخ کش‌شدهٔ زبان قدیم می‌ماند).
 */

const setLocaleCookie = (locale: string) => {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
};

const purgeAndReload = async () => {
  try {
    /* پاک‌سازی کش‌های PWA تا HTML تازه (با زبان جدید) از شبکه بیاید */
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if (navigator.serviceWorker?.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update().catch(() => {})));
    }
  } catch {
    /* پاک‌سازی کش شکست بخورد، رفرش ساده کافی است */
  }
  window.location.reload();
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* بستن با کلیک بیرون */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (l: string) => {
    if (l === locale) {
      setOpen(false);
      return;
    }
    setPending(l);
    setLocaleCookie(l);
    void purgeAndReload();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="انتخاب زبان"
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="lang-switcher"
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface text-foreground transition-all hover:bg-surface-2 active:scale-90 ${
          compact ? "h-11 w-11" : "h-11 px-3"
        }`}
      >
        <Icon name="globe" className="h-[18px] w-[18px]" />
        {!compact && (
          <span className="text-xs font-bold">{LOCALE_META[locale].name}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="انتخاب زبان"
          className="absolute end-0 top-full z-[70] mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-[var(--shadow-lift)]"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === locale}
              disabled={pending !== null}
              onClick={() => pick(l)}
              data-testid={`lang-${l}`}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                l === locale
                  ? "bg-primary-soft font-extrabold text-primary"
                  : "font-medium text-foreground-soft hover:bg-surface-2"
              }`}
            >
              <span className="flex flex-col items-start">
                <span dir={LOCALE_META[l].dir}>{LOCALE_META[l].name}</span>
                <span className="text-[10px] text-muted">{LOCALE_META[l].english}</span>
              </span>
              {l === locale && <Icon name="check" className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
