import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { media } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { ensureCmsSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload — آپلود تصویر برای پنل ادمین (فقط ادمین).
 * multipart/form-data با فیلد «file» → ذخیره در جدول media (base64 — چون
 * فایل‌سیستم Vercel فقط‌خواندنی است) → { ok, url: "/api/media/{id}" }.
 *
 * امنیت: سشن ادمین + allowlist سخت‌گیرانهٔ MIME تصویری + سقف ۳ مگابایت +
 * magic-byte sniffing (حتی اگر MIME دروغ گفته باشد) + پاک‌سازی نام فایل.
 */

const MAX_FILE_BYTES = 3 * 1024 * 1024;

const ALLOWED_MIME: Record<string, true> = {
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
  "image/gif": true,
};

/** تشخیص واقعی فرمت از بایت‌های ابتدای فایل (ضد MIME جعلی) */
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // GIF: GIF8
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  // WEBP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return null;
}

function sanitizeName(raw: string): string {
  const name = String(raw ?? "")
    .replace(/[/\\]/g, "-")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("")
    .trim()
    .slice(0, 200);
  return name || "image";
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "bad form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "file required" }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ ok: false, error: "حجم تصویر باید بین ۱ بایت تا ۳ مگابایت باشد." }, { status: 413 });
  }
  const claimed = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME[claimed]) {
    return NextResponse.json({ ok: false, error: "فقط تصویر PNG، JPEG، WebP یا GIF مجاز است." }, { status: 415 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const real = sniffMime(buf);
  if (!real || real !== claimed) {
    return NextResponse.json({ ok: false, error: "محتوای فایل با فرمت اعلام‌شده سازگار نیست." }, { status: 415 });
  }

  try {
    await ensureCmsSchema();
    const inserted = await db
      .insert(media)
      .values({
        filename: sanitizeName(file.name || "image"),
        mime: real,
        size: buf.byteLength,
        data: Buffer.from(buf).toString("base64"),
        uploadedBy: "admin",
      })
      .returning({ id: media.id });
    const id = (inserted as { id: number }[])[0]?.id;
    if (!id) return NextResponse.json({ ok: false, error: "upload failed" }, { status: 500 });
    return NextResponse.json({ ok: true, id, url: `/api/media/${id}` });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}
