// ============================================================
// دادبان — تولید «لایحهٔ دفاعیه» از دل پرونده (SSE استریم)
// POST /api/case-desk/brief  body: { caseNumber, side: "خواهان"|"خوانده", extra? }
// بافتار پرونده (اسناد کش‌شده) + آخرین تحلیل + «سبک اختصاصی وکیل»
// اگر سبکی ذخیره شده باشد، ادبیات لایحه با خود وکیل هم‌سانی می‌گیرد.
// ============================================================

import { rateLimit, readJson, clientIp } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { getZai, isAiAvailable } from "@/lib/ai";
import { loadCaseForDesk, buildCaseContext, buildBriefPrompts } from "@/lib/case-desk";
import { styleBlockForUser } from "@/lib/lawyer-style";
import { latestCaseAnalysis } from "@/lib/case-desk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

  const limited = rateLimit(req, "case-desk-brief", 8, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  const body = await readJson(req, 8_192);
  const caseNumber = typeof body?.caseNumber === "string" ? body.caseNumber.trim().slice(0, 60) : "";
  const side = body?.side === "خوانده" ? "خوانده" : "خواهان";
  const extra = typeof body?.extra === "string" ? body.extra.trim().slice(0, 1500) : "";
  if (!caseNumber) return Response.json({ ok: false, error: "شمارهٔ پرونده ارسال نشده است." }, { status: 422 });

  const access = await loadCaseForDesk(user, caseNumber);
  if (!access.ok) {
    return Response.json(
      { ok: false, error: access.reason === "forbidden" ? "دسترسی به این پرونده ممکن نیست." : "پرونده پیدا نشد." },
      { status: access.reason === "forbidden" ? 403 : 404 },
    );
  }
  if (!(await isAiAvailable())) {
    return Response.json({ ok: false, error: "سرویس هوش مصنوعی موقتاً در دسترس نیست. بعداً تلاش کنید." }, { status: 503 });
  }

  const built = await buildCaseContext(access.case.id);
  const analysis = await latestCaseAnalysis(access.case.id);
  const analysisNote = analysis
    ? `چکیدهٔ تحلیل قبلی پرونده (به‌عنوان راهنمای استدلال):\nنقاط قوت: ${analysis.strengths.slice(0, 500)}\nریسک‌ها: ${analysis.weaknesses.slice(0, 400)}\n`
    : "";
  const styleBlock = await styleBlockForUser(user.id);
  const { system, user: userPrompt } = buildBriefPrompts(built.context, side, extra, styleBlock);

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, obj: unknown) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const finish = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            /* قبلاً بسته شده */
          }
        }
      };
      const onAbort = () => finish();
      if (req.signal.aborted) return finish();
      req.signal.addEventListener("abort", onAbort, { once: true });

      try {
        const zai = await getZai();
        const completion = (await Promise.race([
          zai.chat.completions.create({
            messages: [
              { role: "system", content: system },
              { role: "user", content: `${userPrompt}\n${analysisNote}` },
            ],
            max_tokens: 4000,
            temperature: 0.35,
            thinking: { type: "disabled" },
          }),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error("ai-timeout")), 90_000)),
        ])) as { choices?: { message?: { content?: string } }[] } | null;

        const full = (completion?.choices?.[0]?.message?.content ?? "").trim();
        if (!full) throw new Error("ai-empty");

        for (let i = 0; i < full.length; i += 12) {
          if (req.signal.aborted || closed) break;
          send(controller, { delta: full.slice(i, i + 12) });
          await new Promise((r) => setTimeout(r, 14));
        }
        if (!closed && !req.signal.aborted) send(controller, { done: true });
      } catch (err) {
        if (!closed && !req.signal.aborted) {
          const msg =
            (err as Error)?.message === "ai-timeout"
              ? "تنظیم لایحه بیش از حد طول کشید. لطفاً دوباره تلاش کنید."
              : "تولید لایحه در میانهٔ کار با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
          try {
            send(controller, { error: msg });
          } catch {
            /* استریم بسته شده */
          }
        }
      } finally {
        req.signal.removeEventListener("abort", onAbort);
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
