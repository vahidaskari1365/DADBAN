"use client";

/**
 * کوچک‌سازی تصویر سمت مرورگر قبل از آپلود — قراردادِ عکس‌شده معمولاً چند مگابایت است؛
 * با کاهش ابعاد تا ۱۶۰۰px و خروجی JPEG (کیفیت ۰٫۸۵) حجم به حدود چند صد کیلوبایت می‌رسد:
 * آپلود سریع‌تر، مدل بینایی سریع‌تر جواب می‌دهد و سقف ۵ مگابایت دیگر دردسر نمی‌شود.
 */
export async function shrinkImageFile(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
  if (typeof window === "undefined") return file;
  if (file.type === "image/gif") return file; // gif متحرک را دست نمی‌زنیم
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.size < 900_000) return file; // همین‌طور هم کوچک است
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file; // هر مشکلی بود، فایل اصلی می‌رود سرور
  }
}
