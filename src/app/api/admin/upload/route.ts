import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { media } from "@/db/schema";
import { getAdminSession, hasAnyPerm } from "@/lib/admin-auth";
import { ensureCmsSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload — آپلود تصویر از فرم‌های CRUD پنل ادمین.
 * ورودی: multipart/form-data با فیلد «file» (PNG/JPEG/WebP/GIF حداکثر ۳ مگابایت)
 * خروجی: { ok: true, url: "/api/media/{id}" } — سرو با GET /api/media/[id]
 * ذخیره در جدول media (base64) — سازگار با فایل‌سیستم فقط‌خواندنی.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  // آپلود تصویر به بخش‌های محتوایی مربوط است — هرکسی که اجازهٔ محتوا دارد اجازهٔ آپلود دارد
  if (!hasAnyPerm(session, ["media", "articles", "content", "knowledge"])) {
    return NextResponse.json({ ok: false, error: "شما دسترسی آپلود رسانه را ندارید." }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "فایلی ارسال نشد." }, { status: 400 });
    const okTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!okTypes.includes(file.type)) return NextResponse.json({ ok: false, error: "فقط PNG، JPEG، WebP یا GIF مجاز است." }, { status: 400 });
    if (file.size > 3 * 1024 * 1024) return NextResponse.json({ ok: false, error: "حجم تصویر باید حداکثر ۳ مگابایت باشد." }, { status: 400 });

    if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 503 });
    await ensureCmsSchema();
    const buf = Buffer.from(await file.arrayBuffer());
    const inserted = await db
      .insert(media)
      .values({
        filename: file.name.slice(0, 200) || "image",
        mime: file.type,
        size: file.size,
        data: buf.toString("base64"),
        uploadedBy: session.email,
      })
      .returning({ id: media.id });
    return NextResponse.json({ ok: true, url: `/api/media/${inserted[0].id}` });
  } catch {
    return NextResponse.json({ ok: false, error: "آپلود ناموفق بود." }, { status: 500 });
  }
}
