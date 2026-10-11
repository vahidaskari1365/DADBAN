"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "dadban_pwa_install_dismissed";

/**
 * بنر نصب PWA — وقتی مرورگر قابلیت نصب را تشخیص داد، یک بنر پایین صفحه
 * نمایش می‌دهد که کاربر می‌تواند اپ را روی دستگاه خود نصب کند.
 * پس از رد کردن، تا ۷ روز دوباره نمایش داده نمی‌شود.
 */
export function InstallPrompt() {
  const t = useT();
  const [state, setState] = useState<{
    deferred: BeforeInstallPromptEvent | null;
    visible: boolean;
    installed: boolean;
  }>({ deferred: null, visible: false, installed: false });

  useEffect(() => {
    // در حالت نصب‌شده (standalone)، بنر نمایش داده نمی‌شود
    const isStandalone =
      (typeof window !== "undefined" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (typeof navigator !== "undefined" && (navigator as any).standalone === true);

    // post-render با microtask تا الگوی React event-driven حفظ شود
    const apply = () => {
      if (isStandalone) {
        setState({ deferred: null, visible: false, installed: true });
        return;
      }
      // اگه کاربر اخیراً رد کرده، نمایش نده
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (dismissedAt && Date.now() - dismissedAt < weekMs) return;
    };
    queueMicrotask(apply);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // جلوگیری از بنر پیش‌فرض مرورگر
      const ev = e as BeforeInstallPromptEvent;
      setState((s) => ({ ...s, deferred: ev, visible: true }));
    };
    const onInstalled = () => {
      setState({ deferred: null, visible: false, installed: true });
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const deferred = state.deferred;
  if (state.installed || !state.visible || !deferred) return null;

  const onInstall = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome !== "accepted") {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } catch {
      /* ignore */
    }
    setState({ deferred: null, visible: false, installed: false });
  };

  const onDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setState((s) => ({ ...s, visible: false }));
  };

  return (
    <div
      role="dialog"
      aria-label={t("نصب اپلیکیشن دادبان")}
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md animate-fade-up rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-lift)] sm:bottom-4 sm:left-4 sm:right-4 sm:m-0"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon name="sparkles" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-foreground">{t("نصب اپلیکیشن دادبان")}</h3>
          <p className="mt-0.5 text-xs leading-5 text-muted">
            {t("روی صفحه اصلی نصب کنید تا مثل یک اپ سریع‌تر و بدون مرورگر اجرا شود.")}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onInstall}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Icon name="check" className="h-3.5 w-3.5" />
              {t("نصب کنید")}
            </button>
            <button
              onClick={onDismiss}
              className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-2"
            >
              {t("بعداً")}
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label={t("بستن")}
          className="-mt-1 -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M6 18 18 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
