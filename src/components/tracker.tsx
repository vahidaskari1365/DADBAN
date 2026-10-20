"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** شناسه GA4 در زمان بیلد inline می‌شود (NEXT_PUBLIC) — در نبودش GA غیرفعال است. */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** Fires a lightweight page-view beacon on every route change. */
export function Tracker() {
  const pathname = usePathname();
  const last = useRef<string>("");
  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
    /* Google Analytics 4 — page_view برای ناوبری‌های client-side (App Router).
       اسکریپت سرصفحه فقط بار اول را ثبت می‌کند؛ بدون این، مسیرهای بعدی شمرده نمی‌شوند. */
    if (GA_ID && typeof window !== "undefined") {
      type GtagFn = (...args: unknown[]) => void;
      const w = window as unknown as { gtag?: GtagFn; dataLayer?: unknown[] };
      if (typeof w.gtag === "function") {
        w.gtag("event", "page_view", { page_path: pathname, page_title: document.title });
      }
    }
  }, [pathname]);
  return null;
}
