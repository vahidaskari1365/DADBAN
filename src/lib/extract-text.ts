import "server-only";
import { askVisionLLM } from "./llm";

const MAX_BYTES = 5 * 1024 * 1024; // حداکثر ۵ مگابایت
const MAX_CHARS = 6000; // هماهنگ با محدودیت تحلیل قرارداد در API

export interface ExtractedFile {
  text: string;
  name: string;
  chars: number;
}

/** تشخیص تصویر از روی نوع/پسوند — خروجی: mime مجاز، "unsupported" یا null (تصویر نیست) */
function imageMimeOf(name: string, file: File): string | null | "unsupported" {
  const ext = (name.toLowerCase().split(".").pop() ?? "").replace(/[^a-z0-9]/g, "");
  const byExt: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    heic: "image/heic",
    heif: "image/heif",
  };
  const t = typeof file.type === "string" ? file.type : "";
  if (t.startsWith("image/") || byExt[ext]) {
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/heic", "image/heif"];
    const mime = allowed.includes(t) ? t : (byExt[ext] ?? null);
    return mime ?? "unsupported";
  }
  return null;
}

/** خواندن متن از عکس قرارداد با مدل بینایی (GLM-4.5V → Gemini → OpenRouter) */
async function ocrContractImage(buf: Buffer, mime: string): Promise<string> {
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  const text = await askVisionLLM(
    "این تصویر مربوط به یک قرارداد یا سند حقوقی است. تمام متن قابل مشاهده در تصویر را دقیق و کامل استخراج کن (فارسی یا هر زبان دیگر). فقط متن استخراج‌شده را بازگردان — بدون هیچ توضیح، مقدمه یا جمع‌بندی. اگر بخشی ناخوانا است همان بخش را با [ناخوانا] مشخص کن.",
    dataUrl,
    4000,
  );
  if (!text) {
    throw new Error("خواندن متن از تصویر ممکن نشد؛ لطفاً عکس واضح‌تر و نزدیک‌تری آپلود کنید یا متن را در کادر پایین بچسبانید.");
  }
  return text;
}

/**
 * استخراج متن قرارداد از فایل آپلودی (txt/md/csv/docx/pdf و همچنین عکس قرارداد).
 * کتابخانه‌های سنگین (mammoth/unpdf) به‌صورت lazy و فقط هنگام نیاز import می‌شوند
 * تا هیچ‌گاه بارگذاری ماژول روت API را روی serverless خراب نکند.
 */
export async function extractContractFile(file: File): Promise<ExtractedFile> {
  const name = file.name || "قرارداد";
  const lower = name.toLowerCase();
  if (file.size > MAX_BYTES) throw new Error("حجم فایل باید کمتر از ۵ مگابایت باشد.");
  if (file.size === 0) throw new Error("فایل خالی است.");

  const buf = Buffer.from(await file.arrayBuffer());

  // عکس قرارداد → OCR با مدل بینایی
  const img = imageMimeOf(name, file);
  if (img === "unsupported") {
    throw new Error("این فرمت تصویر پشتیبانی نمی‌شود؛ از PNG، JPG یا WebP استفاده کنید.");
  }
  if (img) {
    const ocr = (await ocrContractImage(buf, img)).replace(/\r\n/g, "\n").trim();
    if (ocr.length < 30) {
      throw new Error("متنی از این تصویر استخراج نشد؛ لطفاً عکس واضح‌تر و نزدیک‌تری از قرارداد آپلود کنید.");
    }
    return { text: ocr.slice(0, MAX_CHARS), name, chars: ocr.length };
  }

  let raw = "";

  if (lower.endsWith(".docx")) {
    try {
      const mammoth = (await import("mammoth")).default;
      const result = await mammoth.extractRawText({ buffer: buf });
      raw = result.value;
    } catch {
      throw new Error("خواندن فایل Word ناموفق بود؛ لطفاً متن را در کادر پایین بچسبانید.");
    }
  } else if (lower.endsWith(".pdf")) {
    try {
      const { getDocumentProxy, extractText } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const result = await extractText(pdf, { mergePages: true });
      raw = result.text;
    } catch {
      throw new Error("فایل PDF قابل خواندن نیست؛ ممکن است اسکن‌شده (تصویری) باشد. لطفاً متن را در کادر پایین بچسبانید.");
    }
  } else if (lower.endsWith(".doc")) {
    throw new Error("فرمت قدیمی doc پشتیبانی نمی‌شود؛ فایل را با پسوند docx یا pdf ذخیره کنید.");
  } else {
    // txt / md / csv و سایر فایل‌های متنی
    raw = buf.toString("utf8");
  }

  const text = raw.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
  if (text.length < 30) {
    throw new Error("متنی از این فایل استخراج نشد؛ لطفاً متن قرارداد را در کادر پایین بچسبانید.");
  }
  return { text: text.slice(0, MAX_CHARS), name, chars: text.length };
}
