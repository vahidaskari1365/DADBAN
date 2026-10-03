import "server-only";

const MAX_BYTES = 5 * 1024 * 1024; // حداکثر ۵ مگابایت
const MAX_CHARS = 6000; // هماهنگ با محدودیت تحلیل قرارداد در API

export interface ExtractedFile {
  text: string;
  name: string;
  chars: number;
}

/**
 * استخراج متن قرارداد از فایل آپلودی (txt/md/csv/docx/pdf).
 * کتابخانه‌های سنگین (mammoth/unpdf) به‌صورت lazy و فقط هنگام نیاز import می‌شوند
 * تا هیچ‌گاه بارگذاری ماژول روت API را روی serverless خراب نکنند.
 */
export async function extractContractFile(file: File): Promise<ExtractedFile> {
  const name = file.name || "قرارداد";
  const lower = name.toLowerCase();
  if (file.size > MAX_BYTES) throw new Error("حجم فایل باید کمتر از ۵ مگابایت باشد.");
  if (file.size === 0) throw new Error("فایل خالی است.");

  const buf = Buffer.from(await file.arrayBuffer());
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
