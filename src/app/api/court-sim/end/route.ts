// ============================================================
// دادبان — شبیه‌سازی دادگاه: پایان جلسه و بازخورد
// POST /api/court-sim/end  body: { sessionId }
// مدل از کل مکالمه، بازخورد ۴بخشی وکیل می‌سازد؛ جلسه «ended» می‌شود.
// ============================================================

import { db } from "@/db";
import { courtSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimit, readJson, clientIp } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { getZai, isAiAvailable } from "@/lib/ai";
import { buildCourtFeedbackPrompt, type CourtSpeaker } from "@/lib/court-sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface StoredMessage {
  speaker: CourtSpeaker | string;
  text: string;
  at?: string;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

  const limited = rateLimit(req, "court-sim-end", 10, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  const body = await readJson(req, 4_096);
  if (!body || typeof body.sessionId !== "number") {
    return Response.json({ ok: false, error: "شناسهٔ جلسه نامعتبر است." }, { status: 422 });
  }

  let session: typeof courtSessions.$inferSelect | null = null;
  try {
    const rows = await db
      .select()
      .from(courtSessions)
      .where(and(eq(courtSessions.id, body.sessionId), eq(courtSessions.userId, user.id)))
      .limit(1);
    session = rows[0] ?? null;
  } catch (err) {
    console.error("[dadban] court-sim end: load failed:", err);
    return Response.json({ ok: false, error: "بارگذاری جلسه ناموفق بود." }, { status: 502 });
  }
  if (!session) return Response.json({ ok: false, error: "جلسهٔ تمرین پیدا نشد." }, { status: 404 });

  let stored: StoredMessage[] = [];
  try {
    const parsed = JSON.parse(session.messages || "[]") as unknown;
    if (Array.isArray(parsed)) stored = parsed.filter((m): m is StoredMessage => !!m && typeof (m as StoredMessage).text === "string");
  } catch {
    stored = [];
  }

  // جلسهٔ خیلی کوتاه — بازخورد معنا ندارد
  if (stored.length < 2) {
    await db.update(courtSessions).set({ status: "ended", updatedAt: new Date() }).where(eq(courtSessions.id, session.id));
    return Response.json({ ok: true, feedback: "", ended: true, note: "جلسه بسیار کوتاه بود؛ بازخوردی ثبت نشد." });
  }

  if (!(await isAiAvailable())) {
    return Response.json({ ok: false, error: "سرویس هوش مصنوعی موقتاً در دسترس نیست. بعداً تلاش کنید." }, { status: 503 });
  }

  const labelOf = (s: string) => (s === "lawyer" ? "وکیل (تمرین‌کننده)" : s === "judge" ? "قاضی" : s === "opponent" ? "وکیل خصم" : "سامانه");
  const transcript = stored.map((m) => `${labelOf(String(m.speaker))}: ${m.text}`).join("\n\n");
  const { system, user: userPrompt } = buildCourtFeedbackPrompt(transcript);

  try {
    const zai = await getZai();
    const completion = (await Promise.race([
      zai.chat.completions.create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1400,
        temperature: 0.4,
        thinking: { type: "disabled" },
      }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("ai-timeout")), 70_000)),
    ])) as { choices?: { message?: { content?: string } }[] } | null;

    const feedback = (completion?.choices?.[0]?.message?.content ?? "").trim();
    await db
      .update(courtSessions)
      .set({ feedback: feedback.slice(0, 6000), status: "ended", updatedAt: new Date() })
      .where(eq(courtSessions.id, session.id));

    return Response.json({ ok: true, feedback, ended: true });
  } catch (err) {
    console.error("[dadban] court-sim end failed:", err);
    // جلسه را ببندیم حتی اگر بازخورد نگرفت — صادقانه اعلام می‌کنیم
    await db.update(courtSessions).set({ status: "ended", updatedAt: new Date() }).where(eq(courtSessions.id, session.id));
    const msg = (err as Error)?.message === "ai-timeout" ? "ساخت بازخورد بیش از حد طول کشید؛ جلسه بسته شد ولی بازخورد ثبت نشد." : "ساخت بازخورد با خطا مواجه شد؛ جلسه بسته شد.";
    return Response.json({ ok: false, error: msg, ended: true }, { status: 502 });
  }
}
