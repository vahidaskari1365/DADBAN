import { NextResponse } from "next/server";
import { db } from "@/db";
import { appErrors } from "@/db/schema";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import { ensureExtendedSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/errors — دریافت خطاهای سمت کلاینت (جایگزین داخلی Sentry، بدون کلید خارجی).
 *
 * قاعدهٔ ضدحلقه: این مسیر «همیشه» {ok:true} برمی‌گرداند — حتی وقتی دیتابیس
 * پایین است یا بدنه نامعتبر است. هیچ خطایی از این مسیر به کلاینت گزارش
 * نمی‌شود تا reportClientError دوباره خودش را صدا نزند.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "client-errors", 30, 60_000);
  if (limited) return limited; // 429 — کلاینت پاسخ را نادیده می‌گیرد؛ حلقه‌ای شکل نمی‌گیرد

  const body = await readJson(req, 16_384);
  if (!body) return NextResponse.json({ ok: true });

  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (!rawMessage) return NextResponse.json({ ok: true }); // چیزی برای ثبت نیست — بی‌سروصدا

  const message = rawMessage.slice(0, 500);
  const stack = typeof body.stack === "string" && body.stack.trim() ? body.stack.trim().slice(0, 4000) : null;
  const url = typeof body.url === "string" && body.url.trim() ? body.url.trim().slice(0, 500) : null;
  const level = body.level === "warning" ? "warning" : "error";

  // meta فقط وقتی ذخیره می‌شود که JSON معتبر و ≤ ۲۰۰۰ کاراکتر باشد
  let meta: Record<string, unknown> | null = null;
  if (body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)) {
    try {
      const serialized = JSON.stringify(body.meta);
      if (serialized.length <= 2000) {
        meta = JSON.parse(serialized) as Record<string, unknown>;
      } else {
        meta = { truncated: true };
      }
    } catch {
      meta = null;
    }
  }

  // userId از سشن (اگر وجود داشت) — نبودنش خطا نیست
  let userId: number | null = null;
  try {
    const user = await getCurrentUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  try {
    try {
      await ensureExtendedSchema();
    } catch {
      /* best-effort — نبود جدول در پایین بودن همین insert مشخص می‌شود */
    }
    await db.insert(appErrors).values({
      level,
      source: "client",
      message,
      stack,
      url,
      userId,
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
      meta,
    });
  } catch {
    /* دیتابیس در دسترس نیست — 200 می‌دهیم تا حلقهٔ خطا ساخته نشود */
  }

  return NextResponse.json({ ok: true });
}
