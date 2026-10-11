// ============================================================
// دادبان — شبیه‌سازی دادگاه: نوبت وکیل
// POST /api/court-sim/turn  body: { sessionId, text }
// پیام وکیل ذخیره می‌شود؛ مدل نقش قاضی/وکیل‌خصم پاسخ می‌دهد.
// سقف ۲۰ نوبت در هر جلسه — کنترل هزینهٔ توکن.
// ============================================================

import { db } from "@/db";
import { courtSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { rateLimit, readJson, clientIp } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { askLLM } from "@/lib/llm";
import { parseCourtSpeakers, MAX_COURT_TURNS, type CourtSpeaker } from "@/lib/court-sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface StoredMessage {
  speaker: CourtSpeaker | string;
  text: string;
  at?: string;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

  const limited = rateLimit(req, "court-sim-turn", 40, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  const body = await readJson(req, 12_000);
  if (!body || typeof body.sessionId !== "number") {
    return Response.json({ ok: false, error: "شناسهٔ جلسه نامعتبر است." }, { status: 422 });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (text.length < 2) {
    return Response.json({ ok: false, error: "پاسخ خود را بنویسید." }, { status: 422 });
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
    console.error("[dadban] court-sim turn: load failed:", err);
    return Response.json({ ok: false, error: "بارگذاری جلسه ناموفق بود." }, { status: 502 });
  }
  if (!session) return Response.json({ ok: false, error: "جلسهٔ تمرین پیدا نشد." }, { status: 404 });
  if (session.status !== "active") return Response.json({ ok: false, error: "این جلسه پایان یافته است." }, { status: 422 });
  if (session.turns >= MAX_COURT_TURNS) {
    return Response.json({ ok: false, error: "سقف نوبت‌های این جلسه پر شده است. جلسه را با بازخورد ببندید یا جلسهٔ جدید بسازید." }, { status: 422 });
  }

  let stored: StoredMessage[] = [];
  try {
    const parsed = JSON.parse(session.messages || "[]") as unknown;
    if (Array.isArray(parsed)) stored = parsed.filter((m): m is StoredMessage => !!m && typeof (m as StoredMessage).text === "string");
  } catch {
    stored = [];
  }

  const now = new Date().toISOString();
  const withUser: StoredMessage[] = [...stored, { speaker: "lawyer", text, at: now }];

  // تاریخچهٔ گفتگو برای مدل — فقط نقش‌ها، کوتاه‌شده
  const history = withUser.map((m) => {
    const label = m.speaker === "lawyer" ? "وکیل (کاربر)" : m.speaker === "judge" ? "قاضی" : m.speaker === "opponent" ? "وکیل خصم" : "سردستگاه";
    return { role: "user" as const, content: `${label}: ${m.text.slice(0, 1200)}` };
  });

  try {
    const raw = (
      (await Promise.race([
        askLLM(history.slice(-14), 700, session.scenario),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("ai-timeout")), 100_000)),
      ])) ?? ""
    ).trim();
    if (!raw) return Response.json({ ok: false, error: "پاسخ جلسه دریافت نشد. دوباره تلاش کنید." }, { status: 502 });

    const speakerMsgs = parseCourtSpeakers(raw);
    const newMsgs: StoredMessage[] = speakerMsgs.map((m) => ({ speaker: m.speaker, text: m.text, at: new Date().toISOString() }));
    const all = [...withUser, ...newMsgs];
    const turns = session.turns + 1;

    await db
      .update(courtSessions)
      .set({ messages: JSON.stringify(all), turns, updatedAt: new Date() })
      .where(eq(courtSessions.id, session.id));

    return Response.json({ ok: true, messages: newMsgs, turns });
  } catch (err) {
    console.error("[dadban] court-sim turn failed:", err);
    const msg = (err as Error)?.message === "ai-timeout" ? "پاسخ بیش از حد طول کشید. دوباره تلاش کنید." : "پاسخ با خطا مواجه شد. دوباره تلاش کنید.";
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}
