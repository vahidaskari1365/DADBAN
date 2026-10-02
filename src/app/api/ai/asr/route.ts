import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai";
import { rateLimit, clientIp } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = new Set(["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/webm", "audio/ogg"]);

/** تبدیل گفتار به متن — فایل صوتی از طریق FormData دریافت می‌شود. */
export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-asr", 20, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "فایل صوتی ارسال نشده است." }, { status: 400 });

  if (!ALLOWED.has(file.type) && !/\.(wav|mp3|m4a|webm|ogg)$/i.test(file.name)) {
    return NextResponse.json({ ok: false, error: "فرمت صوتی پشتیبانی نمی‌شود (WAV، MP3، M4A، WebM، OGG)." }, { status: 415 });
  }
  if (file.size === 0 || file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ ok: false, error: "حجم فایل صوتی باید بین ۱ و ۸ مگابایت باشد." }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await transcribeAudio(buffer.toString("base64"));
    if (!text) return NextResponse.json({ ok: false, error: "صدای قابل تشخیصی پیدا نشد. دوباره تلاش کنید." }, { status: 422 });
    return NextResponse.json({ ok: true, text });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در تبدیل گفتار به متن." }, { status: 500 });
  }
}
