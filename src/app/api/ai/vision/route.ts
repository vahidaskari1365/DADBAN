import { NextResponse } from "next/server";
import { visionAnalyze } from "@/lib/ai";
import { rateLimit, readJson, clientIp } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISION_SYSTEM = `تو کارشناس تحلیل اسناد حقوقی دادپیو هستی.
تصاویر اسناد حقوقی (دادخواست، قرارداد، ابلاغیه، چک، سند، گواهی و…) را تحلیل می‌کنی.
همیشه به فارسی، ساختارمند و دقیق پاسخ بده و به مواد قانونی مرتبط استناد کن.
هیچ‌وقت خودت را وکیل رسمی معرفی نکن؛ در پایان یادآوری کن که این تحلیل جنبه اطلاع‌رسانی دارد.`;

const DEFAULT_PROMPT = `این تصویر یک سند حقوقی است. آن را کامل تحلیل کن:
۱) نوع سند چیست؟
۲) طرفین، تاریخ‌ها و مبالغ کلیدی را استخراج کن.
۳) نکات مهم، ریسک‌ها یا ایرادهای احتمالی سند را فهرست کن.
۴) مواد قانونی مرتبط را ذکر کن.
۵) اقدام پیشنهادی بعدی چیست؟`;

export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-vision", 12, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  // تصاویر base64 حجیم هستند — سقف ~10MB متن
  const body = await readJson(req, 10_485_760);
  if (!body) return NextResponse.json({ ok: false, error: "حجم تصویر بیش از حد مجاز است (حداکثر ~۷ مگابایت)." }, { status: 413 });

  const image = typeof body.image === "string" ? body.image : "";
  const question = typeof body.question === "string" ? body.question.slice(0, 2000) : "";

  // فقط data URL های تصویری مجاز است — جلوگیری از SSRF و محتوای غیرتصویری
  const match = /^data:(image\/(png|jpeg|jpg|webp|gif|bmp));base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!match) return NextResponse.json({ ok: false, error: "لطفاً یک تصویر معتبر (PNG، JPEG، WebP) بارگذاری کنید." }, { status: 400 });

  const base64Len = match[3].length;
  if (base64Len < 100 || base64Len > 7_340_032) {
    return NextResponse.json({ ok: false, error: "اندازه تصویر نامعتبر است." }, { status: 400 });
  }

  try {
    const analysis = await visionAnalyze(image, question || DEFAULT_PROMPT, VISION_SYSTEM);
    if (!analysis) return NextResponse.json({ ok: false, error: "تحلیل در حال حاضر ممکن نیست. لطفاً بعداً تلاش کنید." }, { status: 503 });
    return NextResponse.json({ ok: true, analysis });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در تحلیل تصویر." }, { status: 500 });
  }
}
