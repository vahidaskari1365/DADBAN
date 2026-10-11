// Runs once on server startup. Automatically provisions the database so the
// platform always boots with the correct schema and seed data — no manual steps.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureSeeded } = await import("./lib/auto-seed");
    const res = await ensureSeeded();
    if (res.seeded) {
      console.log("[dadban] auto-seed: database provisioned with seed data.");
    }
  } catch (e) {
    console.error("[dadban] auto-seed failed:", e);
  }
}

/**
 * پایش خطای داخلی (جایگزین Sentry بدون کلید خارجی):
 * Next.js هنگام خطای رندر/روت سرور این هوک را صدا می‌زند — خطا best-effort
 * در جدول app_errors ثبت می‌شود. هیچ‌وقت throw نمی‌کنیم و اگر دیتابیس در
 * دسترس نبود فقط console.error — هندلر خطا خودش نباید خطا بسازد.
 */

// Guard against re-entrancy: if persisting the error itself explodes into
// another server error, we must not recurse forever.
let writingError = false;

export async function onRequestError(err: unknown, request: any, context: any): Promise<void> {
  if (writingError) return;
  writingError = true;
  try {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const message = err instanceof Error ? err.message : String(err ?? "unknown error");
    const stack = err instanceof Error && err.stack ? err.stack.slice(0, 4000) : null;
    const url =
      typeof request?.url === "string" && request.url
        ? String(request.url).slice(0, 500)
        : typeof request?.path === "string" && request.path
          ? String(request.path).slice(0, 500)
          : null;
    const meta = {
      method: typeof request?.method === "string" ? request.method : null,
      route: typeof context?.routePath === "string" ? context.routePath.slice(0, 300) : null,
      routerKind: typeof context?.routerKind === "string" ? context.routerKind : null,
      routeType: typeof context?.routeType === "string" ? context.routeType : null,
      revalidateReason: typeof context?.revalidateReason === "string" ? context.revalidateReason : null,
    };

    // Lazy imports — instrumentation must stay cheap and never break boot.
    const { db } = await import("@/db");
    const { appErrors } = await import("@/db/schema");
    await db.insert(appErrors).values({
      level: "error",
      source: "server",
      message: message.slice(0, 500),
      stack: stack || null,
      url: url || null,
      meta,
    });
  } catch (e) {
    // DB unavailable or anything else — log only, never throw from an error hook.
    console.error("[dadban] onRequestError: failed to persist server error:", e);
  } finally {
    writingError = false;
  }
}
