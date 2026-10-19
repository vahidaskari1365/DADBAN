import "server-only";

/**
 * ============================================================================
 * dadban — ثبت خطاهای سمت سرور در جدول app_errors
 * ----------------------------------------------------------------------------
 * چرا؟ لاگ کنسول هاست برای ادمین قابل مشاهده نیست (سندباکس/سی‌پنل)؛ اگر یک
 * route خطا را catch و 500 برگرداند، هیچ ردی در /admin/errors دیده نمی‌شد و
 * عیب‌یابی پروداکشن کورکورانه می‌شد (باگ واقعی: گیرکردن تأیید کد ورود پیامکی).
 * الگوی همان persistSmsEvent در sms.ts — best-effort: هیچ‌وقت throw نمی‌کند،
 * وقفه در پاسخ کاربر نمی‌اندازد و خودش نباید خطا بسازد.
 * ============================================================================
 */
export async function persistAppError(
  message: string,
  meta: Record<string, unknown> = {},
  level: "error" | "warning" = "error",
): Promise<void> {
  try {
    const { db } = await import("@/db");
    const { appErrors } = await import("@/db/schema");
    await db.insert(appErrors).values({
      level,
      source: "server",
      message: message.slice(0, 500),
      stack: null,
      url: typeof meta.url === "string" ? (meta.url as string).slice(0, 500) : null,
      userId: null,
      userAgent: null,
      meta,
    });
  } catch {
    /* دیتابیس در دسترس نیست — سکوت عمدی؛ این هندلر نباید خودش خطا بسازد */
  }
}

/** پیام امن از خطای ناشناخته — بدون نشت محتوای حساس، فقط نام+پیام */
export function errBrief(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? "unknown");
}
