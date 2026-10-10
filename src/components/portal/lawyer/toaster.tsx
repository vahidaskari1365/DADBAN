"use client";

import { Toaster } from "@/components/ui/sonner";

/** توست فارسی دادپیو — یک‌بار در هر صفحه مونت می‌شود. */
export function DpToaster() {
  return <Toaster position="bottom-left" dir="rtl" richColors closeButton />;
}
