"use client";

/**
 * OCR پشتیبان سمت مرورگر برای عکس قرارداد — فارسی + انگلیسی (tesseract.js).
 * مسیر اصلی، مدل بینایی سرور است (دقت بسیار بالاتر)؛ این OCR فقط وقتی استفاده می‌شود که
 * مدل بینایی سرور در دسترس نباشد (مثلاً اتمام موجودی سرویس) تا عکس قرارداد همیشه قابل
 * خواندن بماند. بارگذاری تنبل: هستهٔ wasm و دادهٔ زبان فقط در لحظهٔ نیاز دانلود می‌شود.
 */

interface OcrWorkerLike {
  recognize: (image: File | string | HTMLCanvasElement | Blob) => Promise<{ data?: { text?: string } }>;
  terminate: () => Promise<void>;
}

interface TesseractLike {
  createWorker: (
    langs: string,
    oem?: number,
    options?: Record<string, unknown>,
  ) => Promise<OcrWorkerLike>;
}

export async function ocrImageFileClient(file: File, onProgress?: (pct: number) => void): Promise<string> {
  let Tesseract: TesseractLike;
  try {
    Tesseract = (await import("tesseract.js")) as unknown as TesseractLike;
  } catch (e) {
    throw new Error("بارگذاری موتور OCR ناموفق بود: " + String((e as Error)?.message ?? e).slice(0, 140));
  }
  // گام ۱ — ساخت ورکر (دانلود هستهٔ wasm و دادهٔ زبان‌ها)
  let worker: OcrWorkerLike;
  try {
    worker = await Tesseract.createWorker("fas+eng", 1, {
      logger: (m: { status?: string; progress?: number }) => {
        if (onProgress && m?.status === "recognizing text" && typeof m.progress === "number") {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
  } catch (e) {
    throw new Error("راه‌اندازی موتور OCR ناموفق بود: " + String((e as Error)?.message ?? e).slice(0, 140));
  }
  try {
    // گام ۲ — تشخیص متن
    const { data } = await worker.recognize(file);
    const text = (data?.text ?? "").replace(/\u200c/g, " ").replace(/[ \t]{2,}/g, " ").trim();
    return text;
  } finally {
    try { await worker.terminate(); } catch { /* بستن ورکر — بی‌اهمیت */ }
  }
}
