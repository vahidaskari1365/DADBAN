import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { media } from "@/db/schema";
import { getAdminSession, hasAnyPerm } from "@/lib/admin-auth";
import { ensureCmsSchema } from "@/lib/auto-seed";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // ۵ مگابایت — تصاویر بزرگ‌تر سمت مرورگر کوچک می‌شوند
const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);

/**
 * POST /api/admin/upload — آپلود تصویر از پنل ادمین (فیلد تصویر CrudTable + کتابخانه رسانه).
 * ورودی multipart با فیلد «file»؛ خروجی { ok, id, url } که url آدرس عمومی /api/media/{id} است.
 * پیش‌تر این endpoint وجود نداشت و آپلود تصویر در همهٔ جدول‌های ادمین شکسته بود.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasAnyPerm(session, ["media", "articles", "content", "knowledge"])) {
    return NextResponse.json({ ok: false, error: "شما دسترسی بارگذاری رسانه را ندارید." }, { status: 403 });
  }
  const limited = rateLimit(req, "admin-upload", 30, 60_000);
  if (limited) return limited;
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });

  try {
    await ensureCmsSchema();
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "فایل تصویری ارسال نشده است." }, { status: 422 });
    }
    if (file.size === 0) {
      return NextResponse.json({ ok: false, error: "فایل خالی است." }, { status: 422 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "حجم تصویر حداکثر ۵ مگابایت است." }, { status: 422 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ ok: false, error: "قالب تصویر باید PNG، JPEG، WebP یا GIF باشد." }, { status: 422 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const inserted = await db
      .insert(media)
      .values({
        filename: (file.name || "admin-upload").slice(0, 120),
        mime: file.type === "image/jpg" ? "image/jpeg" : file.type,
        size: buf.byteLength,
        data: buf.toString("base64"),
        uploadedBy: `admin:${session.id}`,
      })
      .returning({ id: media.id });
    const newId = inserted[0]?.id;
    if (!newId) {
      return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, id: newId, url: `/api/media/${newId}` });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در بارگذاری تصویر — دوباره تلاش کنید." }, { status: 500 });
  }
}
