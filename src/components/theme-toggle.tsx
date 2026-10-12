"use client";

import { useTheme } from "./theme-provider";
import { useT } from "@/lib/i18n/provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, mounted, toggle } = useTheme();
  const t = useT();

  const isDark = theme === "dark";

  /* برچسب‌های پیش از mount باید سرور و کلاینت یکسان باشند — theme در اولین
     رندر کلاینت از کلاس boot خوانده می‌شود و ممکن است با سرور فرق داشته باشد
     (ریشهٔ هشدار قدیمی hydration). تا mount: برچسب خنثای پایدار «تم». */
  const ariaLabel = mounted
    ? isDark
      ? t("تغییر به حالت روشن")
      : t("تغییر به حالت تاریک")
    : t("تم");
  const title = mounted ? (isDark ? t("حالت روشن") : t("حالت تاریک")) : undefined;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={ariaLabel}
      title={title}
      className={
        compact
          ? "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground-soft transition-colors duration-200 hover:bg-surface-2 hover:text-foreground"
          : "inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-foreground-soft transition-colors duration-200 hover:bg-surface-2"
      }
    >
      {mounted ? (
        isDark ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        )
      ) : (
        <span className="block h-[18px] w-[18px]" />
      )}
      {!compact && <span>{mounted ? (isDark ? t("روشن") : t("تاریک")) : t("تم")}</span>}
    </button>
  );
}
