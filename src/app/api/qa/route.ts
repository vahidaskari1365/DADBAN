import { NextResponse } from "next/server";
import { db } from "@/db";
import { qaSubmissions } from "@/db/schema";
import { phone as normalizePhone, rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";

/**
 * POST /api/qa — community question intake.
 * Persists every question to `qa_submissions` for expert review (visible in
 * the ops API), so the "ثبت شد" acknowledgement is actually true.
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "qa", 8, 60 * 60_000);
  if (limited) return limited;

  const body = (await readJson(req, 16_384)) as
    | { question?: string; name?: string; phone?: string }
    | null;
  const question = text(body?.question, 2000);
  if (!question) {
    return NextResponse.json({ ok: false, error: "سؤال خالی است" }, { status: 422 });
  }
  const name = text(body?.name, 120) ?? "کاربر";
  const phone = body?.phone ? normalizePhone(body.phone) : null;

  try {
    await db.insert(qaSubmissions).values({ name, phone, question });
    return NextResponse.json({
      ok: true,
      message: "پرسش شما دریافت شد و در صف بررسی کارشناسان قرار گرفت؛ پاسخ در بخش پرسش و پاسخ منتشر می‌شود.",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
