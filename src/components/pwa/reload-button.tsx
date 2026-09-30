"use client";

import { Icon } from "@/components/icons";

/** دکمه تلاش مجدد — کلاینت‌ساید تا بتواند location.reload را صدا بزند */
export function ReloadButton() {
  return (
    <button
      onClick={() => location.reload()}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-2"
    >
      <Icon name="arrow" className="h-4 w-4" />
      تلاش مجدد
    </button>
  );
}
