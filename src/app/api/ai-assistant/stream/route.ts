import { askLLM, SYSTEM_LEGAL } from "@/lib/llm";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// پرامپت سیستمی قانونی — تک‌منبع حقیقت: src/lib/llm.ts (هماهنگ با دستیار اصلی)

/**
 * Streaming endpoint — پاسخ‌های LLM را token-by-token استریم می‌کند.
 * این کار تجربه کاربری را بهتر می‌کند (کاربر منتظر کامل شدن پاسخ نمی‌ماند).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const limited = rateLimit(req, "ai-stream", 20, 60 * 60_000);
  if (limited) return limited;

  const { query, messages } = body as { query?: string; messages?: { role: string; content: string }[] };

  if (!query && !messages?.length) {
    return new Response(JSON.stringify({ ok: false, error: "لطفاً سؤال خود را بنویسید." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const allMessages = messages?.length
    ? [{ role: "system", content: SYSTEM_LEGAL }, ...messages]
    : [{ role: "system", content: SYSTEM_LEGAL }, { role: "user", content: query || "" }];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "start" }) + "\n\n"));

        const llmResponse = await askLLM(allMessages, 500);
        if (!llmResponse) {
          controller.enqueue(
            encoder.encode("data: " + JSON.stringify({ type: "error", error: "پاسخ‌گویی در حال حاضر ممکن نیست." }) + "\n\n")
          );
          controller.close();
          return;
        }

        // شبیه‌سازی streaming: پاسخ را به قطعات کوچک تقسیم کن
        const chunkSize = 3;
        for (let i = 0; i < llmResponse.length; i += chunkSize) {
          const chunk = llmResponse.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode("data: " + JSON.stringify({ type: "token", token: chunk }) + "\n\n")
          );
          await new Promise((r) => setTimeout(r, 12));
        }

        controller.enqueue(encoder.encode("data: " + JSON.stringify({ type: "done" }) + "\n\n"));
        controller.close();
      } catch {
        controller.enqueue(
          encoder.encode("data: " + JSON.stringify({ type: "error", error: "خطا در پردازش." }) + "\n\n")
        );
        controller.close();
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
