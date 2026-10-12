import { NextResponse } from "next/server";
import { askLLM } from "@/lib/llm";
import { rateLimit } from "@/lib/api-security";
import { GATEWAY_TIERS } from "@/data/ai-resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * «تست سلامت دروازه» — الهام از تلمتری OmniRoute
 * یک پرسش کوچک به زنجیره‌ی تأمین دادورزان می‌فرستد و گزارش می‌دهد
 * کدام طبقه از زنجیره پاسخ داده و با چه تأخیری.
 */

const PROBE_PROMPT = "فقط این عدد را به فارسی بنویس: ۱";
const EXPECTED_HINT = ["۱", "1"];

export async function POST(req: Request) {
  const limited = rateLimit(req, "res-gateway", 6, 60 * 60_000);
  if (limited) return limited;

  const started = Date.now();
  const reply = await askLLM([{ role: "user", content: PROBE_PROMPT }], 16);
  const latencyMs = Date.now() - started;

  if (!reply) {
    return NextResponse.json({
      ok: true,
      healthy: false,
      latencyMs,
      message: "هیچ طبقه‌ای از زنجیره پاسخ نداد — fallback کامل شکست خورد.",
    });
  }

  const clean = reply.replace(/\s/g, "");
  const coherent = EXPECTED_HINT.some((h) => clean.includes(h)) || clean.length <= 24;

  return NextResponse.json({
    ok: true,
    healthy: coherent,
    latencyMs,
    tiers: GATEWAY_TIERS.map((t) => ({
      tier: t.tier,
      name: t.name,
      provider: t.provider,
      needsKey: t.needsKey,
      active: t.needsKey ? Boolean(t.keyEnv ? process.env[t.keyEnv] : (process.env.ZAI_API_KEY || process.env.LLM_API_KEY)) : true,
    })),
    message: coherent
      ? `دروازه‌ی دادورزان سالم است — پاسخ در ${latencyMs} میلی‌ثانیه دریافت شد.`
      : "پاسخی دریافت شد اما معنادار نبود؛ ممکن است تأمین‌کننده محدود شده باشد.",
  });
}
