"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/**
 * دکمهٔ «بروزرسانی» آمار داشبورد ادمین.
 *
 * آمار داشبورد سمت سرور رندر می‌شود؛ این دکمه با router.refresh()
 * داده‌های سرور را دوباره واکشی می‌کند بدون رفرش کامل صفحه.
 */
export default function DashboardRefreshButton() {
  const router = useRouter();
  const t = useT();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      aria-label={t("بروزرسانی آمار")}
      title={t("بروزرسانی آمار")}
      data-testid="dashboard-refresh"
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20 disabled:opacity-60"
    >
      <Icon name="refresh" className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
      {t("بروزرسانی")}
    </button>
  );
}
