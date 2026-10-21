import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { media } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { ensureCmsSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * POST /api/admin/upload — آپلود تصویر از فیلدهای «type: image» جدول‌های CRUD ادمین.
 * (این مسیر قبلاً وجود نداشت و فرم ادمین همیشه 404 می‌گرفت؛ اکنون تصویر در جدول media
 * ذخیره و آدرس عمومی /api/media/{id} برگردانده می‌شود.)
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "admin-upload", 20, 60_000);
    if (limited) return limited;
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ ok: false, error: "ابتدا وارد پنل ادمین شوید." }, { status: 401 });
    if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    await ensureCmsSchema();

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "فایلی ارسال نشده است." }, { status: 422 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "حجم تصویر حداکثر ۸ مگابایت است." }, { status: 422 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ ok: false, error: "قالب تصویر باید JPG، PNG، WebP یا GIF باشد." }, { status: 422 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const inserted = await db
      .insert(media)
      .values({
        filename: (file.name || "admin-upload").slice(0, 120),
        mime: file.type,
        size: bytes.byteLength,
        data: bytes.toString("base64"),
        uploadedBy: `admin:${session.name || session.email}`.slice(0, 60),
      })
      .returning({ id: media.id });
    const newId = inserted[0]?.id;
    if (!newId) {
      return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    }
    return NextResponse.json({ ok: true, url: `/api/media/${newId}` });
  } catch {
    return publicError();
  }
}
