"use client";

import { useEffect } from "react";

/**
 * Error boundary for page-level runtime errors. Rendered inside the root
 * layout, so it inherits the site fonts/theme and stays RTL + Persian.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log server-side so runtime errors stay observable in production.
    console.error("[dadban] page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-24">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 text-center card-shadow">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-bold text-foreground">خطایی رخ داد</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          مشکلی در بارگذاری این صفحه پیش آمد. دوباره تلاش کنید؛ اگر مشکل ادامه داشت، کمی بعد مراجعه کنید.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            تلاش دوباره
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
          >
            بازگشت به خانه
          </button>
        </div>
      </div>
    </div>
  );
}
