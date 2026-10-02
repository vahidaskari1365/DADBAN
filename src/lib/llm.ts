// ============================================================
// دادبان — موتور هوش مصنوعی چند-تأمین‌کننده (Multi-Provider LLM)
// زنجیره‌ی تأمین:
//   1) کلید OpenAI-سازگار (ZAI_API_KEY یا LLM_API_KEY) — تولید (api.z.ai پیش‌فرض)
//   2) z-ai-web-dev-sdk (سندباکس توسعه — بدون نیاز به کلید)
//   3) Pollinations بدون‌کلید (fallback نهایی)
// هرگز کلید واقعی در کد ذخیره نمی‌شود؛ همه از Environment Variable می‌آید.
// ============================================================

const SYSTEM_LEGAL = `تو دستیار حقوقی دادبان هستی — یک دستیار هوشمند حقوقی فارسی‌زبان.
به سوالات حقوقی کاربر به فارسی روان و طبیعی پاسخ بده؛ مختصر، دقیق و کاربردی (حداکثر ۸-۱۰ خط).
در پاسخ‌ات حتماً به مواد قانونی مرتبط با موضوع استناد کن: شماره ماده و نام قانون را دقیق بنویس
(مثلاً «ماده ۱۰۸۲ قانون مدنی» یا «ماده ۲ قانون روابط موجر و مستأجر ۱۳۷۶») و اگر آن ماده تبصره دارد،
خلاصه تبصره را هم ذکر کن (مثلاً «تبصره ماده ۱۰۸۲ قانون مدنی مقرر می‌دارد…»).
مهم‌ترین مواد مرتبط را بیاور و اگر موضوع به قانون خاصی مربوط است (قانون صدور چک، قانون کار،
قانون حمایت خانواده، قانون مجازات اسلامی و…)، حتماً به آن استناد کن.
پاسخ را حتماً به زبان فارسی بنویس و از هر کاراکتر غیرفارسی (چینی، کره‌ای، ژاپنی و غیره) خودداری کن.
اگر پاسخ دقیق نیاز به مطالعه اسناد/قوانین دارد، بگو برای نظر قطعی با وکیل مشورت کند.
هیچ​وقت خودت را وکیل رسمی معرفی نکن و در پایان در یک جمله یادآوری کن: "این پاسخ جنبه اطلاع‌رسانی دارد و جایگزین مشاوره حقوقی رسمی نیست."`;

export { SYSTEM_LEGAL };

function sanitizePersian(text: string): string {
  return text
    .replace(
      /[\u0400-\u04ff\u0500-\u052f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0590-\u05ff\u0370-\u03ff\u00c0-\u024f\uff00-\uffef]/g,
      "",
    )
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export type LlmMessage = { role: string; content: string };

/** حذف پیام‌های تکراری/خالی و محدود کردن تعداد پیام‌ها برای جلوگیری از سوءاستفاده توکن. */
function normalizeMessages(messages: LlmMessage[], maxMessages = 16): LlmMessage[] {
  return messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim().length > 0)
    .slice(-maxMessages)
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user", content: m.content.slice(0, 8000) }));
}

async function postOpenAiCompatible(base: string, body: unknown, key: string, timeoutMs = 30_000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`llm http ${res.status}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? data?.output_text ?? data?.response ?? "";
    if (!text) throw new Error("llm empty");
    return text;
  } finally {
    clearTimeout(t);
  }
}

/* ─── 1) تأمین‌کننده HTTP با کلید (تولید — Vercel) ─────────────────────── */

function httpProvider(): { base: string; key: string; model: string } | null {
  const key = process.env.ZAI_API_KEY || process.env.LLM_API_KEY;
  if (!key) return null;
  const base = (process.env.LLM_BASE_URL ?? "https://api.z.ai/api/paas/v4").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "glm-4.6";
  return { base: `${base}/chat/completions`, key, model };
}

async function viaHttp(messages: LlmMessage[], maxTokens: number): Promise<string | null> {
  const provider = httpProvider();
  if (!provider) return null;
  try {
    return sanitizePersian(
      await postOpenAiCompatible(
        provider.base,
        { model: provider.model, messages, max_tokens: maxTokens, temperature: 0.3 },
        provider.key,
      ),
    );
  } catch {
    return null;
  }
}

/* ─── 2) SDK سندباکس (توسعه — بدون کلید) ──────────────────────────────── */

async function viaSdk(messages: LlmMessage[], _maxTokens: number): Promise<string | null> {
  try {
    const mod = (await import("z-ai-web-dev-sdk")) as unknown as { default?: { create: () => Promise<ZaiClient> }; create?: () => Promise<ZaiClient> };
    const createFn = mod.default?.create ?? mod.create;
    if (!createFn) return null;
    const zai = await createFn();
    // طبق مستندات SDK، پیام system با نقش assistant ارسال می‌شود.
    const mapped = messages.map((m, i) => (m.role === "system" && i === 0 ? { role: "assistant", content: m.content } : m));
    const completion = await zai.chat.completions.create({
      messages: mapped as never,
      thinking: { type: "disabled" },
    });
    const text = completion?.choices?.[0]?.message?.content ?? "";
    return text ? sanitizePersian(text) : null;
  } catch {
    return null;
  }
}

interface ZaiClient {
  chat: { completions: { create: (opts: unknown) => Promise<{ choices?: { message?: { content?: string } }[] }> } };
}

/* ─── 3) Pollinations بدون‌کلید (fallback نهایی) ──────────────────────── */

/** مسیر POST — پاسخ ساختاریافته JSON. */
async function pollinationsPost(messages: LlmMessage[], maxTokens: number): Promise<string | null> {
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, model: "openai", max_tokens: maxTokens, seed: 1 }),
      signal: AbortSignal.timeout(14_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? data?.output_text ?? data?.response ?? "";
    return text ? sanitizePersian(String(text)) : null;
  } catch {
    return null;
  }
}

/** مسیر GET — پرامپت در URL؛ برای مواقعی که POST بلاک/کند است. */
async function pollinationsGet(messages: LlmMessage[]): Promise<string | null> {
  try {
    const prompt = messages
      .filter((m) => m.role !== "system")
      .map((m) => m.content)
      .join("\n")
      .slice(-3000);
    const sys = messages.find((m) => m.role === "system")?.content ?? "";
    const url =
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}` +
      `?model=openai${sys ? `&system=${encodeURIComponent(sys.slice(0, 1200))}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? sanitizePersian(text) : null;
  } catch {
    return null;
  }
}

async function viaKeyless(messages: LlmMessage[], maxTokens: number): Promise<string | null> {
  return (await pollinationsPost(messages, maxTokens)) ?? (await pollinationsGet(messages));
}

/* ─── API عمومی ────────────────────────────────────────────────────────── */

export async function askLLM(messages: LlmMessage[], maxTokens = 400, systemPrompt = SYSTEM_LEGAL): Promise<string | null> {
  const all = normalizeMessages([{ role: "system", content: systemPrompt }, ...messages]);
  // ترتیب امتحان: HTTP با کلید → SDK سندباکس → بدون‌کلید
  return (await viaHttp(all, maxTokens)) ?? (await viaSdk(all, maxTokens)) ?? (await viaKeyless(all, maxTokens));
}
