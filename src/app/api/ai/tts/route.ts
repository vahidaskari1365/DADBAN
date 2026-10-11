import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/ai";
import { edgeSynthesize, EDGE_VOICES } from "@/lib/tts-edge";
import { rateLimit, readJson } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** تبدیل متن فارسی به گفتار — موتور اصلی: Edge TTS بدون کلید (روی Vercel هم کار می‌کند)؛
 *  موتور دوم: z-ai SDK (فقط سندباکس/توسعه). خروجی MP3 یا WAV برای پخش مستقیم. */
export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-tts", 30, 60 * 60_000);
  if (limited) return limited;

  const body = await readJson(req, 8_192);
  if (!body) return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });

  const raw = typeof body.text === "string" ? body.text : "";
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return NextResponse.json({ ok: false, error: "متنی برای تبدیل وارد کنید." }, { status: 400 });
  if (text.length > 1024) return NextResponse.json({ ok: false, error: "متن باید حداکثر ۱۰۲۴ کاراکتر باشد." }, { status: 400 });

  const speed = typeof body.speed === "number" ? body.speed : 1;
  const voice = typeof body.voice === "string" ? body.voice : undefined;

  try {
    // ۱) Edge TTS — بدون کلید، روی پروداکشن در دسترس؛ صدای قاضی مردانه (Farid)
    const effectiveVoice = voice === "judge" ? EDGE_VOICES.judge : voice;
    const edge = await edgeSynthesize(text, { voice: effectiveVoice, speed });
    if (edge) {
      return new Response(new Uint8Array(edge), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(edge.length),
          "Cache-Control": "no-store",
        },
      });
    }

    // ۲) موتور دوم — SDK (در سندباکس/توسعه کار می‌کند)
    const audio = await synthesizeSpeech(text, { speed });
    if (!audio) return NextResponse.json({ ok: false, error: "تولید صدا در حال حاضر ممکن نیست." }, { status: 503 });
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(audio.length),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطا در تولید صدا." }, { status: 500 });
  }
}
