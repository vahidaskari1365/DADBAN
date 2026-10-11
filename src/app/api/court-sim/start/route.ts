// ============================================================
// دادبان — شبیه‌سازی دادگاه: شروع جلسه
// POST /api/court-sim/start
//   body: { caseNumber?: string, topic?: string, claim?: string, side?: "خواهان"|"خوانده" }
// سناریو ساخته می‌شود، قاضی با اولین سؤال جلسه را باز می‌کند و
// session در court_sessions ذخیره می‌شود (برای مرور بازخورد بعدی).
// ============================================================

import { db } from "@/db";
import { courtSessions } from "@/db/schema";
import { rateLimit, readJson, clientIp } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { askLLMRetry as askLLM } from "@/lib/llm";
import { loadCaseForDesk, buildCaseContextChunks } from "@/lib/case-desk";
import { buildCourtScenarioPrompt } from "@/lib/court-sim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

  const limited = rateLimit(req, "court-sim-start", 10, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  const body = await readJson(req, 12_000);
  if (!body) return Response.json({ ok: false, error: "بدنهٔ درخواست نامعتبر است." }, { status: 422 });

  const caseNumber = typeof body.caseNumber === "string" ? body.caseNumber.trim().slice(0, 60) : "";
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 300) : "";
  const claim = typeof body.claim === "string" ? body.claim.trim().slice(0, 1500) : "";
  const side = body.side === "خوانده" ? "خوانده" : "خواهان";

  if (!caseNumber && topic.length < 4) {
    return Response.json({ ok: false, error: "موضوع تمرین را بنویسید یا یک پرونده انتخاب کنید." }, { status: 422 });
  }

  let facts = "";
  let title = "";
  let caseId: number | null = null;
  if (caseNumber) {
    const access = await loadCaseForDesk(user, caseNumber);
    if (!access.ok) {
      return Response.json(
        { ok: false, error: access.reason === "forbidden" ? "دسترسی به این پرونده ممکن نیست." : "پرونده پیدا نشد." },
        { status: access.reason === "forbidden" ? 403 : 404 },
      );
    }
    const built = await buildCaseContextChunks(access.case.id);
    facts = built.chunks.join("\n\n").slice(0, 6000);
    title = `تمرین پروندهٔ ${access.case.caseNumber} — ${access.case.subject}`;
    caseId = access.case.id;
  } else {
    facts = `موضوع تمرین: ${topic}\nشرح خواسته/دفاع وکیل:\n${claim || "—"}`;
    title = `تمرین موضوعی: ${topic}`;
  }

  const scenario = buildCourtScenarioPrompt(facts, side);

  try {
    const opening = (
      (await Promise.race([
        askLLM(
          [{ role: "user", content: "جلسه را شروع کن: قاضی با احوال‌پرسی رسمی و اولین سؤال ماهوی باز می‌کند. فقط یک پیام، با برچسب «قاضی:»." }],
          700,
          scenario,
        ),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("ai-timeout")), 100_000)),
      ])) ?? ""
    ).trim();
    if (!opening) return Response.json({ ok: false, error: "شروع جلسه ناموفق بود. دوباره تلاش کنید." }, { status: 502 });

    const [session] = await db
      .insert(courtSessions)
      .values({
        userId: user.id,
        caseId,
        scenario,
        title: title.slice(0, 160),
        messages: JSON.stringify([{ speaker: "judge", text: opening, at: new Date().toISOString() }]),
        turns: 0,
        status: "active",
      })
      .returning({ id: courtSessions.id });

    return Response.json({
      ok: true,
      sessionId: session.id,
      title,
      messages: [{ speaker: "judge", text: opening, at: new Date().toISOString() }],
    });
  } catch (err) {
    console.error("[dadban] court-sim start failed:", err);
    const msg = (err as Error)?.message === "ai-timeout" ? "شروع جلسه بیش از حد طول کشید. دوباره تلاش کنید." : "شروع جلسه با خطا مواجه شد. دوباره تلاش کنید.";
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}
