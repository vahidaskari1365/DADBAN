// ============================================================
// دادبان — تحلیل کلِ پرونده (SSE استریم + ذخیرهٔ نتیجه)
// POST /api/case-desk/analyze  body: { caseNumber }
// خروجی SSE: {delta}… {sections} {done:true} یا {error}
// «sections» همان ۶ بخش پارس‌شده است که در case_analyses هم ذخیره می‌شود.
// ============================================================

import { rateLimit, readJson, clientIp } from "@/lib/api-security";
import { getCurrentUser } from "@/lib/user-auth";
import { askLLM } from "@/lib/llm";
import { db } from "@/db";
import { caseAnalyses } from "@/db/schema";
import {
  loadCaseForDesk,
  buildCaseContextChunks,
  buildAnalysisSystemPrompt,
  buildAnalysisUserPrompt,
  parseAnalysisSections,
} from "@/lib/case-desk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

  const limited = rateLimit(req, "case-desk-analyze", 8, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  const body = await readJson(req, 4_096);
  const caseNumber = typeof body?.caseNumber === "string" ? body.caseNumber.trim().slice(0, 60) : "";
  if (!caseNumber) return Response.json({ ok: false, error: "شمارهٔ پرونده ارسال نشده است." }, { status: 422 });

  const access = await loadCaseForDesk(user, caseNumber);
  if (!access.ok) {
    return Response.json(
      { ok: false, error: access.reason === "forbidden" ? "دسترسی به این پرونده ممکن نیست." : "پرونده پیدا نشد." },
      { status: access.reason === "forbidden" ? 403 : 404 },
    );
  }
  let chunks: string[] = [];
  let docCount = 0;
  try {
    const built = await buildCaseContextChunks(access.case.id);
    chunks = built.chunks;
    docCount = built.docCount;
  } catch (err) {
    console.error("[dadban] case-desk analyze: context build failed:", err);
    return Response.json({ ok: false, error: "ساخت بافتار پرونده ناموفق بود. ابتدا متن اسناد را استخراج کنید." }, { status: 502 });
  }

  const system = buildAnalysisSystemPrompt();
  const userPrompt = buildAnalysisUserPrompt();
  // بافتار پرونده به‌صورت چانک‌های ≤۶.۵k + پیام نهایی دستور (هماهنگ با normalizeMessages در llm.ts)
  const llmMessages = [...chunks.map((c) => ({ role: "user", content: c })), { role: "user", content: userPrompt }];

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
        const full = ((await Promise.race([
          askLLM(llmMessages, 3000, system),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error("ai-timeout")), 100_000)),
        ])) ?? "").trim();
        if (!full) throw new Error("ai-empty");

        // استریم تدریجی (هم‌الگوی دادخواست‌ساز)
        for (let i = 0; i < full.length; i += 10) {
          if (req.signal.aborted || closed) break;
          send(controller, { delta: full.slice(i, i + 10) });
          await new Promise((r) => setTimeout(r, 12));
        }

        // پارس و ذخیره (حتی اگر کلاینت قطع شده باشد، نتیجه ذخیره شود)
        const sections = parseAnalysisSections(full);
        if (!closed && !req.signal.aborted) send(controller, { sections });
        try {
          await db.insert(caseAnalyses).values({
            caseId: access.case.id,
            createdBy: user.id,
            docCount,
            overview: sections.overview,
            strengths: sections.strengths,
            weaknesses: sections.weaknesses,
            contradictions: sections.contradictions,
            missingDocs: sections.missingDocs,
            nextSteps: sections.nextSteps,
          });
        } catch (err) {
          console.error("[dadban] case-desk analyze: save failed:", err);
        }
        if (!closed && !req.signal.aborted) send(controller, { done: true });
      } catch (err) {
        if (!closed && !req.signal.aborted) {
          const msg =
            (err as Error)?.message === "ai-timeout"
              ? "تحلیل پرونده بیش از حد طول کشید. لطفاً دوباره تلاش کنید."
              : "تحلیل پرونده در میانهٔ کار با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
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
