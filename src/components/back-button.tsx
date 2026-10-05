"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./icons";

/**
 * دکمهٔ بازگشت هوشمند — اگر کاربر از داخل خود سایت به این صفحه آمده،
 * به صفحهٔ قبلی برمی‌گردد (router.back)؛ وگرنه (لینک مستقیم، رفرش یا
 * ورود از سایت دیگر) به مقصد پیش‌فرض می‌رود تا کاربر را از سایت بیرون نبرد.
 *
 * تشخیص «از داخل سایت»: Next.js در history.state کلید __NA/__N می‌گذارد.
 */
export function BackButton({
  fallback = "/",
  label = "بازگشت",
  variant = "chip",
}: {
  fallback?: string;
  label?: string;
  /** chip: چیپ کوچک روی هدر پنل‌ها — bar: نوار پهن‌تر برای صفحات محتوایی */
  variant?: "chip" | "bar";
}) {
  const router = useRouter();

  const goBack = () => {
    try {
      const st = window.history.state as { __NA?: boolean; __N?: boolean } | null;
      const navigatedInsideApp = !!(st && (st.__NA || st.__N));
      if (navigatedInsideApp && window.history.length > 1) {
        router.back();
        return;
      }
    } catch {
      /* history در دسترس نیست — fallback */
    }
    router.push(fallback);
  };

  if (variant === "bar") {
    return (
      <button
        type="button"
        onClick={goBack}
        data-testid="back-button"
        aria-label={`${label} — رفتن به صفحهٔ قبل`}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground-soft transition-all hover:border-primary/40 hover:bg-primary-soft hover:text-primary active:scale-[0.98]"
      >
        <Icon name="chevron" className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={goBack}
      data-testid="back-button"
      aria-label={`${label} — رفتن به صفحهٔ قبل`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 transition-all hover:bg-white/20 active:scale-[0.97]"
    >
      <Icon name="chevron" className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
