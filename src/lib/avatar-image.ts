import sharp from "sharp";

/**
 * سایز استاندارد عکس وکیل برای کارت‌های سایت — مربع ۵۱۲×۵۱۲ JPEG.
 * هر عکسی که وکیل (یا ادمین) آپلود کند با برش هوشمند «attention» (تمرکز روی
 * ناحیهٔ مهم مثل چهره) به همین سایز یکنواخت تبدیل می‌شود تا دقیقاً روی
 * کارت وکلا، پروفایل عمومی و داشبورد بنشیند — بدون وابستگی به ابعاد فایل اصلی.
 * EXIF rotate هم خودکار اعمال می‌شود (عکس‌های موبایل سالم نمایش داده می‌شوند).
 */
export const AVATAR_STANDARD_SIZE = 512;

/** سقف حجم فایل ورودی (قبل از تبدیل) */
export const AVATAR_INPUT_MAX_BYTES = 8 * 1024 * 1024;

/** قالب‌های مجاز ورودی — خروجی همیشه JPEG استاندارد است */
const AVATAR_MIME_ALLOW = new Set(["image/jpeg", "image/png", "image/webp"]);

export function avatarMimeAllowed(mime: string): boolean {
  return AVATAR_MIME_ALLOW.has(mime);
}

export function avatarInputTooLarge(size: number): boolean {
  return size > AVATAR_INPUT_MAX_BYTES;
}

/** تبدیل هر تصویر ورودی به مربع استاندارد ۵۱۲×۵۱۲ JPEG — در خطا null برمی‌گردد */
export async function toStandardAvatar(input: Buffer): Promise<{ buf: Buffer; mime: "image/jpeg" } | null> {
  try {
    const buf = await sharp(input, { failOn: "error" })
      .rotate() // خودکار بر اساس EXIF
      .resize(AVATAR_STANDARD_SIZE, AVATAR_STANDARD_SIZE, { fit: "cover", position: "attention" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { buf, mime: "image/jpeg" };
  } catch {
    return null;
  }
}
