"use client";

import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/** دکمه تلاش مجدد — کلاینت‌ساید تا بتواند location.reload را صدا بزند */
export function ReloadButton() {
  const t = useT();
  return (
    <button
      onClick={() => location.reload()}
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-2"
    >
      <Icon name="arrow" className="h-4 w-4" />
      {t("تلاش مجدد")}
    </button>
  );
}
