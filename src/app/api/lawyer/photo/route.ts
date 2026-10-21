import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { lawyers, media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { ensureProfileSchema, ensureCmsSchema } from "@/lib/auto-seed";
import { avatarMimeAllowed, avatarInputTooLarge, toStandardAvatar } from "@/lib/avatar-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/lawyer/photo — آپلود/تعویض عکس پروفایل وکیل (خودِ وکیل از پنلش).
 * ورودی multipart «file»؛ فارغ از قالب و ابعاد فایل اصلی، خروجی همیشه مربعِ
 * استاندارد ۵۱۲×۵۱۲ JPEG است که دقیقاً روی کارت وکلا و پروفایل عمومی می‌نشیند.
 * هر بار آپلود، ردیف media جدیدی ساخته و photo_url وکیل به آدرس تازه به‌روزرسانی
 * می‌شود (آدرس یکتا = کش مرورگر قدیمی بی‌اثر)؛ تعویض مجدد هر زمان آزاد است.
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "lawyer-photo", 10, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (user.role !== "lawyer" || !user.lawyerId) {
      return NextResponse.json({ ok: false, error: "بارگذاری عکس فقط برای وکلای متصل‌شده مجاز است." }, { status: 403 });
    }
    if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    await ensureProfileSchema();
    await ensureCmsSchema();

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "فایل عکسی ارسال نشده است." }, { status: 422 });
    }
    if (avatarInputTooLarge(file.size)) {
      return NextResponse.json({ ok: false, error: "حجم عکس حداکثر ۸ مگابایت است." }, { status: 422 });
    }
    if (!avatarMimeAllowed(file.type)) {
      return NextResponse.json({ ok: false, error: "قالب عکس باید JPG، PNG یا WebP باشد." }, { status: 422 });
    }

    const std = await toStandardAvatar(Buffer.from(await file.arrayBuffer()));
    if (!std) {
      return NextResponse.json({ ok: false, error: "پردازش عکس ناموفق بود؛ لطفاً عکس دیگری انتخاب کنید." }, { status: 422 });
    }

    const inserted = await db
      .insert(media)
      .values({
        filename: (file.name || "lawyer-photo").slice(0, 120),
        mime: std.mime,
        size: std.buf.byteLength,
        data: std.buf.toString("base64"),
        uploadedBy: `lawyer:${user.id}`,
      })
      .returning({ id: media.id });
    const newId = inserted[0]?.id;
    if (!newId) {
      return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    }

    await db.update(lawyers).set({ photoUrl: `/api/media/${newId}` }).where(eq(lawyers.id, user.lawyerId));
    return NextResponse.json({ ok: true, url: `/api/media/${newId}` });
  } catch {
    return publicError();
  }
}
