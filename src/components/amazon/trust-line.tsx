"use client";

import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/**
 * TrustLine — خط اعتماد آمازونی («Secure transaction»).
 * ردیف فشرده از تعهدات کلیدی پلتفرم؛ در کنار CTAهای اصلی نمایش داده می‌شود
 * تا لحظه تصمیم، ترس کاربر کاهش پیدا کند. محتوای ثابت و واقعی سیاست‌های سایت.
 */
const ITEMS: { icon: IconKey; label: string }[] = [
  { icon: "lock", label: "پرداخت امن" },
  { icon: "shield", label: "ضمانت بازگشت وجه" },
  { icon: "badge", label: "وکلای راستی‌آزمایی‌شده" },
  { icon: "chat", label: "پشتیبانی پاسخ‌گو" },
];

export function TrustLine({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const t = useT();
  return (
    <ul
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 ${className}`}
      aria-label={t("تعهدات دادورزان")}
    >
      {ITEMS.map((it) => (
        <li
          key={it.label}
          className={`inline-flex items-center gap-1.5 font-semibold text-muted ${compact ? "text-[11px]" : "text-xs"}`}
        >
          <Icon name={it.icon} className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-success`} />
          {t(it.label)}
        </li>
      ))}
    </ul>
  );
}
