import { NextResponse } from "next/server";
import { llmProbe, zaiDiagnose } from "@/lib/llm";
import { isAdmin } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * تشخیص سلامت زنجیره LLM — فقط برای مالک (ادمین یا توکن محیطی).
 * هرگز مقدار کلیدها را برنمی‌گرداند؛ فقط وضعیت/تأخیر/خطای هر ارائه‌دهنده را می‌دهد.
 *
 * GET  → امتحان سریع همه ارائه‌دهنده‌های زنجیره
 * POST → + تشخیص دقیق کلید z.ai (ترکیب‌های base × model)
 */
async function authorize(req: Request): Promise<boolean> {
  if (await isAdmin()) return true;
  const expected = process.env.LLM_HEALTH_TOKEN;
  if (expected && expected.length >= 16) {
    const got = req.headers.get("x-health-token") ?? "";
    if (got === expected) return true;
  }
  return false;
}

async function handle(req: Request) {
  const limited = rateLimit(req, "llm-health", 10, 10 * 60_000);
  if (limited) return limited;
  if (!(await authorize(req))) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const chain = await llmProbe();
    let zai: Awaited<ReturnType<typeof zaiDiagnose>> | null = null;
    if (req.method === "POST") zai = await zaiDiagnose();
    return NextResponse.json({ ok: true, chain, zai, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e).slice(0, 120) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
