"use client";

/**
 * OCR سمت مرورگر برای عکس قرارداد — فارسی + انگلیسی (tesseract.js).
 * بارگذاری تنبل: هسته‌ی wasm و داده‌ی زبان فقط در لحظه‌ی نیاز از CDN دانلود می‌شود
 * تا هیچ هزینه‌ای به باندل اولیه اضافه نکند و به کلید سرور هم نیازی نباشد.
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
  // گام ۱ — ساخت ورکر (دانلود هسته‌ی wasm و داده‌ی زبان‌ها)
  let worker: OcrWorkerLike;
  try {
    worker = await Tesseract.createWorker("fas+eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      logger: (m: { status?: string; progress?: number }) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          onProgress?.(Math.round(m.progress * 100));
        }
      },
    });
  } catch (e) {
    console.error("OCR_CREATE_ERR", e);
    const msg = (e as { message?: string })?.message ?? String(e ?? "unknown");
    throw new Error("آماده‌سازی موتور OCR ناموفق بود: " + String(msg).slice(0, 140));
  }
  // گام ۲ — تشخیص متن
  try {
    const r = await worker.recognize(file);
    await worker.terminate().catch(() => undefined);
    return (r?.data?.text ?? "").replace(/\r\n/g, "\n").trim();
  } catch (e) {
    console.error("OCR_RECOG_ERR", e);
    await worker.terminate().catch(() => undefined);
    const msg = (e as { message?: string })?.message ?? String(e ?? "unknown");
    throw new Error("خواندن متن از تصویر ناموفق بود: " + String(msg).slice(0, 140));
  }
}
