"use client";

import { Toaster } from "@/components/ui/sonner";
import { useLocale } from "@/lib/i18n/provider";
import { dirFor } from "@/lib/i18n";

/** توست دادپیو — یک‌بار در هر صفحه مونت می‌شود؛ جهت آن از زبان فعلی پیروی می‌کند. */
export function DpToaster() {
  const locale = useLocale();
  return <Toaster position="bottom-left" dir={dirFor(locale)} richColors closeButton />;
}
