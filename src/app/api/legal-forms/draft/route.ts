import { rateLimit, readJson, clientIp } from "@/lib/api-security";
import { getDraftDef, missingRequired, buildSystemPrompt, buildUserPrompt } from "@/lib/legal-drafts";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { styleBlockForUser } from "@/lib/lawyer-style";
import { askLLM } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (obj: unknown, status: number) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

const MAX_FIELD_LEN = 2000;

/**
 * POST /api/legal-forms/draft — «دادخواست‌ساز هوشمند»
 * بدنه: { slug, answers: Record<fieldId, string> }
 * خروجی: استریم SSE با رویدادهای {delta} → {done:true} یا {error}
 */
export async function POST(req: Request) {
  // سقف ۸ سند در ساعت برای هر IP — جلوگیری از سوختن بودجهٔ LLM
  const limited = rateLimit(req, "legal-draft", 8, 60 * 60_000, clientIp(req));
  if (limited) return limited;

  const body = await readJson(req, 32_768);
  if (!body) {
    return json({ ok: false, error: "بدنهٔ درخواست نامعتبر یا بیش از حد بزرگ است." }, 422);
  }

  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const def = getDraftDef(slug);
  if (!def) {
    return json({ ok: false, error: "نوع سند شناخته‌شده نیست. لطفاً از فهرست فرم‌های حقوقی یکی را انتخاب کنید." }, 422);
  }

  const rawAnswers =
    body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : {};
  const answers: Record<string, string> = {};
  for (const f of def.fields) {
    const v = rawAnswers[f.id];
    if (typeof v === "string") answers[f.id] = v.trim().slice(0, MAX_FIELD_LEN);
  }

  const missing = missingRequired(def, answers);
  if (missing.length) {
    return json(
      { ok: false, error: `برای تولید سند، تکمیل این موارد الزامی است: ${missing.join("، ")}`, missing },
      422,
    );
  }

  const systemBase = buildSystemPrompt(def);
  const user = buildUserPrompt(def, answers);

  // «سبک اختصاصی وکیل»: اگر کاربر لاگین‌شده وکیل باشد و پروفایل سبک داشته باشد،
  // ادبیات سند باید با سبک خودِ او هم‌سانی بگیرد (نه ادبیات عمومی مدل).
  let system = systemBase;
  try {
    const current = await getCurrentUser();
    if (current && (isLawyerSideRole(current.role) || current.role === "staff" || current.role === "supervisor")) {
      const styleBlock = await styleBlockForUser(current.id);
      if (styleBlock) system = `${systemBase}\n\n${styleBlock}`;
    }
  } catch {
    /* بدون سبک هم تولید ادامه می‌یابد */
  }

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
        // یک فراخوانی کامل با زنجیرهٔ چند-تأمین‌کنندهٔ llm.ts؛ سپس تکه‌تکه‌سازی به‌صورت SSE
        const full = ((await Promise.race([
          askLLM([{ role: "user", content: user }], 4000, system),
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error("ai-timeout")), 100_000)),
        ])) ?? "").trim();
        if (!full) throw new Error("ai-empty");

        // تکه‌تکه‌سازی تدریجی (هم‌الگوی ai-assistant/stream) — با پایش abort
        for (let i = 0; i < full.length; i += 12) {
          if (req.signal.aborted || closed) break;
          send(controller, { delta: full.slice(i, i + 12) });
          await new Promise((r) => setTimeout(r, 15));
        }
        if (!closed && !req.signal.aborted) send(controller, { done: true });
      } catch (err) {
        if (!closed && !req.signal.aborted) {
          const msg =
            (err as Error)?.message === "ai-timeout"
              ? "تنظیم سند بیش از حد طول کشید. لطفاً دوباره تلاش کنید."
              : "تولید سند در میانهٔ کار با خطا مواجه شد. لطفاً دوباره تلاش کنید.";
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
