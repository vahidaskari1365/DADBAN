"use client";

import { useEffect } from "react";

/**
 * ثبت Service Worker در production.
 * در dev محیط فعال نمی‌شود تا با HMR تداخل پیدا نکند.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // بررسی آپدیت دوره‌ای
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                // SW جدید آماده — بلافاصله فعال کن
                nw.postMessage("SKIP_WAITING");
              }
            });
          });
        })
        .catch((err) => console.warn("[pwa] SW registration failed:", err));
    };

    // بعد از load کامل صفحه ثبت کن تا رقابت با منابع اصلی ایجاد نشود
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    // وقتی SW جدید کنترل رو گرفت، در صورت نیاز reload کن
    const onCtrlChange = () => {
      if (!navigator.serviceWorker.controller) return;
    };
    navigator.serviceWorker.addEventListener("controllerchange", onCtrlChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onCtrlChange);
    };
  }, []);

  return null;
}
