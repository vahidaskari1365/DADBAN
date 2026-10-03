import "server-only";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

const MAX_BYTES = 5 * 1024 * 1024; // حداکثر ۵ مگابایت
const MAX_CHARS = 6000; // هماهنگ با محدودیت تحلیل قرارداد در API

export interface ExtractedFile {
  text: string;
  name: string;
  chars: number;
}

/** استخراج متن قرارداد از فایل آپلودی (txt/md/csv/docx/pdf). */
export async function extractContractFile(file: File): Promise<ExtractedFile> {
  const name = file.name || "قرارداد";
  const lower = name.toLowerCase();
  if (file.size > MAX_BYTES) throw new Error("حجم فایل باید کمتر از ۵ مگابایت باشد.");
  if (file.size === 0) throw new Error("فایل خالی است.");

  const buf = Buffer.from(await file.arrayBuffer());
  let raw = "";

  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: buf });
    raw = result.value;
  } else if (lower.endsWith(".pdf")) {
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    try {
      const result = await parser.getText();
      raw = result.text;
    } catch {
      throw new Error("فایل PDF قابل خواندن نیست؛ ممکن است اسکن‌شده (تصویری) باشد. لطفاً متن را در کادر پایین بچسبانید.");
    } finally {
      await parser.destroy();
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
