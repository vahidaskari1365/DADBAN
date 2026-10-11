"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/** دکمهٔ به‌روزرسانی فهرست خطاها — router.refresh() روی صفحهٔ سروری ادمین. */
export default function ErrorsRefreshButton() {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      data-testid="errors-refresh"
      aria-label={t("به‌روزرسانی فهرست خطاها")}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60"
    >
      <Icon name="clock" className={`h-4 w-4 text-primary ${pending ? "animate-spin" : ""}`} />
      {pending ? t("در حال به‌روزرسانی…") : t("به‌روزرسانی")}
    </button>
  );
}
