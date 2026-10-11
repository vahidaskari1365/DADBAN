import "server-only";
import { logger } from "./logger";

/**
 * ============================================================================
 * dadban — موتور TTS بدون کلید (Microsoft Edge TTS)
 * ----------------------------------------------------------------------------
 * چرا؟ موتور قبلی (z-ai SDK) فقط در سندباکس کار می‌کند و روی Vercel در دسترس
 * نیست — باگ واقعی پروداکشن که در تست «صدای قاضی» کشف شد.
 * Edge TTS: رایگان، بدون کلید API، با صداهای عصبی فارسی باکیفیت:
 *  - fa-IR-FaridNeural  (مرد — برای قاضی)
 *  - fa-IR-DilaraNeural (زن — پیش‌فرض عمومی)
 * خروجی MP3 است که مرورگر مستقیم پخش می‌کند.
 * NEVER throws — خطا فقط null برمی‌گرداند تا مسیر اصلی نشکند.
 * ============================================================================
 */

export const EDGE_VOICES = {
  judge: "fa-IR-FaridNeural",
  default: "fa-IR-DilaraNeural",
} as const;

export async function edgeSynthesize(
  input: string,
  opts?: { voice?: string; speed?: number },
): Promise<Buffer | null> {
  const text = input.slice(0, 1024).trim();
  if (!text) return null;
  try {
    // لود تنبل: msedge-tts فقط وقتی واقعاً نیاز است import می‌شود تا باندل سرد سرورلس سبک بماند
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const tts = new MsEdgeTTS();
    const voice = opts?.voice && opts.voice.startsWith("fa-") ? opts.voice : EDGE_VOICES.default;
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    // سرعت: SDK قبلی 0.5..2 می‌پذیرفت؛ Edge به‌صورت درصد نسبی می‌خواهد
    const speed = Math.min(2, Math.max(0.5, opts?.speed ?? 1));
    const ratePercent = Math.round((speed - 1) * 100);
    const { audioStream } = tts.toStream(text, ratePercent !== 0 ? { rate: `${ratePercent > 0 ? "+" : ""}${ratePercent}%` } : undefined);
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    return buffer.length > 100 ? buffer : null;
  } catch (err) {
    logger.warn("[tts-edge] synthesize failed:", { error: (err as Error)?.message?.slice(0, 160) });
    return null;
  }
}
