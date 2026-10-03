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
در پاسخ‌ات به مواد قانونی مرتبط استناد کن، اما فقط به موادی که از وجود و شماره‌ی آن‌ها مطمئن هستی.
هرگز ماده، تبصره یا متن قانونی‌ای که وجود ندارد نساز؛ اگر شماره‌ی دقیق ماده را نمی‌دانی، بدون شماره
فقط به نام قانون و موضوع ارجاع بده (مثلاً «طبق قانون حمایت خانواده ۱۳۹۱…»).
نکته‌های مرجع: قانون حمایت خانواده ۱۳۹۱ در حضانت، معیار «مصلحت فرزند» را ملاک قرار داده است
(سن ثابت ملاک نیست)؛ مهریه عندالاستطاعه بر اساس ماده ۱۰۸۲ قانون مدنی و تبصره آن است؛
کلاهبرداری رایانه‌ای در ماده ۷۵۰ قانون مجازات اسلامی (بند الف تبصره ۱ ماده ۲) جرم‌انگاری شده است؛
قانون صدور چک برای چک برگشتی و قانون کار ۱۳۶۹ (مواد ۲۷ و بعد) برای اخراج کارگر ملاک است.
اگر پاسخ دقیق نیاز به مطالعه اسناد/قوانین دارد، بگو برای نظر قطعی با وکیل مشورت کند.
پاسخ را حتماً فقط با الفبای فارسی بنویس و از هر کاراکتر یا کلمه‌ی غیرفارسی (لاتین، چینی، کره‌ای،
ژاپنی، روسی و غیره) داخل جمله‌ها جداً خودداری کن.
هیچ​وقت خودت را وکیل رسمی معرفی نکن و در پایان در یک جمله یادآوری کن: "این پاسخ جنبه اطلاع‌رسانی دارد و جایگزین مشاوره حقوقی رسمی نیست."`;

export { SYSTEM_LEGAL };

function sanitizePersian(text: string): string {
  return text
    .replace(
      /[\u0400-\u04ff\u0500-\u052f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0590-\u05ff\u0370-\u03ff\u00c0-\u024f\uff00-\uffef]/g,
      "",
    )
    // حذف خرده‌حروف لاتین چسبیده به کلمات فارسی (مثل «حضunft» ناشی از خروجی مخلوط مدل)
    .replace(/(?<=[\u0600-\u06FF])[A-Za-z]+/g, "")
    .replace(/[A-Za-z]+(?=[\u0600-\u06FF])/g, "")
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
      body: JSON.stringify({ messages, model: "openai", max_tokens: maxTokens, seed: 1, referrer: "dadban" }),
      signal: AbortSignal.timeout(9_000),
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
      `?model=openai&referrer=dadban${sys ? `&system=${encodeURIComponent(sys.slice(0, 1200))}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? sanitizePersian(text) : null;
  } catch {
    return null;
  }
}

/* ─── 4) تأمین‌کننده‌ی بدون‌کلید دوم (fallback اضطراری روی Vercel) ─────── */

async function hackClubPost(messages: LlmMessage[]): Promise<string | null> {
  try {
    const res = await fetch("https://ai.hackclub.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return text ? sanitizePersian(String(text)) : null;
  } catch {
    return null;
  }
}

async function viaKeyless(messages: LlmMessage[], maxTokens: number): Promise<string | null> {
  return (
    (await pollinationsPost(messages, maxTokens)) ??
    (await pollinationsGet(messages)) ??
    (await hackClubPost(messages))
  );
}

/* ─── API عمومی ────────────────────────────────────────────────────────── */

export async function askLLM(messages: LlmMessage[], maxTokens = 400, systemPrompt = SYSTEM_LEGAL): Promise<string | null> {
  const all = normalizeMessages([{ role: "system", content: systemPrompt }, ...messages]);
  // ترتیب امتحان: HTTP با کلید → SDK سندباکس → بدون‌کلید
  return (await viaHttp(all, maxTokens)) ?? (await viaSdk(all, maxTokens)) ?? (await viaKeyless(all, maxTokens));
}
