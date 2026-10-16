"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/**
 * دکمهٔ خروج ادمین — عمداً با POST (نه <Link href="/api/admin/logout">).
 * چرا؟ نکست لینک‌ها را prefetch می‌کند و GET /api/admin/logout در زمان prefetch
 * اجرا می‌شد و کوکی ادمین بی‌صدا پاک می‌شد (خروج ناخواسته!). POST هرگز prefetch نمی‌شود.
 */
export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      /* حتی در خطا، به صفحهٔ ورود می‌رویم */
    }
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className={
        className ??
        "inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20"
      }
      data-testid="admin-logout"
    >
      <Icon name="x" className="h-3.5 w-3.5" />
      {busy ? t("در حال خروج…") : t("خروج")}
    </button>
  );
}
