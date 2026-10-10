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
  const p1 =
    "این تصویر مربوط به یک قرارداد یا سند حقوقی است. تمام متن قابل مشاهده در تصویر را دقیق و کامل استخراج کن (فارسی یا هر زبان دیگر). فقط متن استخراج‌شده را بازگردان — بدون هیچ توضیح، مقدمه یا جمع‌بندی. اگر بخشی ناخوانا است همان بخش را با [ناخوانا] مشخص کن.";
  const r1 = await askVisionLLM(p1, dataUrl, 4000);
  let best = r1.text ?? "";
  // اگر پاسخ کوتاه بود (احتمالاً توصیف تصویر به‌جای استخراج متن)، یک‌بار با دستور سخت‌گیرانه‌ی «بازنویسی عیناً» تلاش می‌شود
  if (best.length < 200) {
    const p2 =
      "عیناً و کلمه‌به‌کلمه تمام خطوط متن موجود در این تصویر سند را از اول تا آخر بنویس — حتی عناوین، شماره‌ها، امضاها و تاریخ‌ها. هیچ توضیحی اضافه نکن و هیچ خطی را حذف نکن. فقط و فقط متنِ داخل تصویر.";
    const r2 = await askVisionLLM(p2, dataUrl, 4000);
    if ((r2.text ?? "").length > best.length) best = r2.text ?? "";
  }
  if (!best || best.length < 80) {
    throw new Error("خواندن متن از تصویر در حال حاضر ممکن نشد؛ لطفاً متن قرارداد را در کادر پایین بچسبانید یا فایل PDF/Word آپلود کنید.");
  }
  return best;
}

const CONTRACT_MARKER = "===تحلیل===";

export interface ContractImageAnalysis {
  /** متن استخراج‌شده از تصویر (برای تحلیل محلی/آمار ریسک) */
  text: string;
  /** تحلیل حقوقی مدل بینایی — ممکن است خالی باشد (→ مسیر LLM متنی) */
  analysis: string;
}

/**
 * خواندن و تحلیل یک‌جأ عکس قرارداد با مدل بینایی — به‌جای دو فراخوانی جدا (استخراج + تحلیل)،
 * مدل بینایی در «یک» فراخوانی هم متن را می‌خواند و هم تحلیل حقوقی می‌دهد: سریع‌تر و دقیق‌تر.
 */
export async function analyzeContractImage(buf: Buffer, mime: string): Promise<ContractImageAnalysis> {
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  const prompt = `این تصویر مربوط به یک قرارداد یا سند حقوقی (ایرانی) است. دو کار را دقیقاً به همین ترتیب انجام بده:

گام ۱ — کل متن قابل مشاهده در تصویر را عیناً و کامل استخراج کن (حتی عناوین، شماره بندها، تاریخ‌ها، مبالغ و امضاها). بخش ناخوانا را [ناخوانا] بنویس.

سپس دقیقاً این جداکننده را در یک خط بنویس:
${CONTRACT_MARKER}

گام ۲ — بعد از جداکننده، تحلیل حقوقی کامل قرارداد را به فارسی بنویس:
۱) نوع قرارداد و موضوع آن
۲) نقاط ضعف، ریسک‌ها و بندهای یک‌طرفه با ذکر شمارهٔ بند
۳) استناد به مواد قانونی ایران مرتبط (فقط ماده‌هایی که از وجودشان مطمئنی — مثل مواد ۱۰، ۲۱۹ و ۲۳۰ قانون مدنی یا قوانین تخصصی)
۴) تعهدات، جریمه‌ها و مهلت‌های مهم
۵) یک توصیهٔ عملی برای اصلاح قرارداد

هیچ‌وقت خودت را وکیل رسمی معرفی نکن.`;
  const r = await askVisionLLM(prompt, dataUrl, 4000);
  const out = (r.text ?? "").trim();
  if (!out) {
    // برای عیب‌یابی در لاگ Vercel — خطای هر ارائه‌دهندهٔ بینایی ثبت می‌شود
    console.error("[dadban] vision-contract failed:", r.errors.join(" | "));
    const err = new Error("خواندن متن از تصویر در حال حاضر ممکن نشد؛ لطفاً عکس واضح‌تری آپلود کنید یا متن قرارداد را در کادر بچسبانید.") as Error & { detail?: string };
    err.detail = r.errors.join(" | ").slice(0, 400);
    throw err;
  }
  const idx = out.indexOf(CONTRACT_MARKER);
  if (idx === -1) {
    // جداکننده نیامد — اگر خروجی بلند است همان را متن فرض کن تا دست‌کم آمار/تحلیل محلی داشته باشیم
    if (out.length < 80) {
      throw new Error("متنی از این تصویر استخراج نشد؛ لطفاً عکس واضح‌تر و نزدیک‌تری از قرارداد آپلود کنید.");
    }
    return { text: out.slice(0, MAX_CHARS), analysis: "" };
  }
  const text = out.slice(0, idx).trim();
  const analysis = out.slice(idx + CONTRACT_MARKER.length).trim();
  if (text.length < 30) {
    throw new Error("متنی از این تصویر استخراج نشد؛ لطفاً عکس واضح‌تر و نزدیک‌تری از قرارداد آپلود کنید.");
  }
  return { text: text.slice(0, MAX_CHARS), analysis };
}

export interface AnalyzedUpload {
  text: string;
  name: string;
  chars: number;
  /** تحلیل آمادهٔ مدل بینایی (فقط برای عکس) — null یعنی مسیر LLM متنی لازم است */
  analysis: string | null;
}

/**
 * نقطهٔ ورود واحد برای فایل آپلودی قرارداد: عکس → تحلیل یک‌جای بینایی؛
 * PDF/Word/متن → استخراج متن (تحلیل در مسیر بعدی LLM متنی انجام می‌شود).
 */
export async function analyzeContractFile(file: File): Promise<AnalyzedUpload> {
  const name = file.name || "قرارداد";
  if (file.size > MAX_BYTES) throw new Error("حجم فایل باید کمتر از ۵ مگابایت باشد.");
  if (file.size === 0) throw new Error("فایل خالی است.");
  const buf = Buffer.from(await file.arrayBuffer());

  const img = imageMimeOf(name, file);
  if (img === "unsupported") {
    throw new Error("این فرمت تصویر پشتیبانی نمی‌شود؛ از PNG، JPG یا WebP استفاده کنید.");
  }
  if (img) {
    const r = await analyzeContractImage(buf, img);
    return { text: r.text, name, chars: r.text.length, analysis: r.analysis || null };
  }

  const extracted = await extractContractFile(file);
  return { text: extracted.text, name: extracted.name, chars: extracted.chars, analysis: null };
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
      throw new Error("این PDF قابل خواندن نیست؛ اگر اسکن‌شده (تصویری) است، از صفحه‌هایش عکس بگیرید و عکس‌ها را آپلود کنید — عکس‌ها با مدل بینایی خوانده و تحلیل می‌شوند.");
    }
  } else if (lower.endsWith(".doc")) {
    throw new Error("فرمت قدیمی doc پشتیبانی نمی‌شود؛ فایل را با پسوند docx یا pdf ذخیره کنید.");
  } else {
    // txt / md / csv و سایر فایل‌های متنی
    raw = buf.toString("utf8");
  }

  const text = raw.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
  if (text.length < 30) {
    throw new Error("از این فایل متن قابل استخراجی پیدا نشد؛ اگر PDF اسکن‌شده (تصویری) است، از صفحه‌هایش عکس بگیرید و عکس‌ها را آپلود کنید یا متن را در کادر بچسبانید.");
  }
  return { text: text.slice(0, MAX_CHARS), name, chars: text.length };
}
