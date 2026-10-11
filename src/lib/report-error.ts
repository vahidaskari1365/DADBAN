/**
 * گزارش خطای سمت کلاینت به /api/errors — client-safe (بدون import سروری).
 *
 * قواعد سخت:
 *  - هرگز throw نمی‌کند (هندلر خطا نباید خودش خطا بسازد).
 *  - پاسخ سرور خوانده/لاگ نمی‌شود تا حلقهٔ خطا ساخته نشود.
 *  - keepalive:true تا حتی هنگام بسته‌شدن صفحه گزارش ارسال بماند.
 */
export function reportClientError(error: unknown, meta?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const message = error instanceof Error ? error.message : String(error ?? "unknown error");
    const stack = error instanceof Error && error.stack ? error.stack.slice(0, 4000) : undefined;

    // meta باید سریالایزپذیر باشد — هر چیزی که stringify نشود کنار گذاشته می‌شود.
    let safeMeta: Record<string, unknown> | undefined;
    if (meta && typeof meta === "object") {
      try {
        safeMeta = JSON.parse(JSON.stringify(meta)) as Record<string, unknown>;
      } catch {
        safeMeta = undefined;
      }
    }

    const payload = JSON.stringify({
      message: message.slice(0, 500),
      stack,
      url: window.location.pathname.slice(0, 500),
      level: "error",
      meta: safeMeta && Object.keys(safeMeta).length > 0 ? safeMeta : undefined,
    });

    void fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* silent — گزارش خطا نباید خودش خطای شبکه‌ای قابل مشاهده بسازد */
    });
  } catch {
    /* silent — never throw from an error reporter */
  }
}
