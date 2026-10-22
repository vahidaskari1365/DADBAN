import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { users, media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { ensureProfileSchema, ensureCmsSchema } from "@/lib/auto-seed";
import { avatarMimeAllowed, avatarInputTooLarge, toStandardAvatar } from "@/lib/avatar-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/profile/photo — آپلود/تعویض عکس پروفایل کاربر (موکل و هر حساب غیرمتصل‌به-وکیل).
 * خروجی همیشه مربعِ استاندارد ۵۱۲×۵۱۲ JPEG است (همان سایز عکس وکلا) تا در آواتار
 * هدر، منوی حساب و هدر داشبورد بدون برش اضافه بنشیند. هر بار آپلود، ردیف media
 * جدیدی ساخته و photo_url کاربر به آدرس تازه به‌روزرسانی می‌شود (کش مرورگر بی‌اثر).
 * وکلای متصل‌شده باید از مدیریت عکس پروفایل وکیل (/api/lawyer/photo) استفاده کنند.
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "profile-photo", 10, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (user.lawyerId) {
      return NextResponse.json(
        { ok: false, error: "حساب شما به پروفایل وکیل متصل است؛ عکس پروفایل را از پنل وکیل تغییر دهید." },
        { status: 403 },
      );
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
        filename: (file.name || "profile-photo").slice(0, 120),
        mime: std.mime,
        size: std.buf.byteLength,
        data: std.buf.toString("base64"),
        uploadedBy: `user:${user.id}`,
      })
      .returning({ id: media.id });
    const newId = inserted[0]?.id;
    if (!newId) {
      return NextResponse.json({ ok: false, error: "ذخیره‌سازی موقتاً در دسترس نیست." }, { status: 503 });
    }

    await db.update(users).set({ photoUrl: `/api/media/${newId}` }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true, url: `/api/media/${newId}` });
  } catch {
    return publicError();
  }
}
