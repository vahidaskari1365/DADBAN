// ============================================================
// دادبان — موتور هوش مصنوعی چند-تأمین‌کننده با سوییچ خودکار
// معماری برگرفته از زنجیره LLM پروژه homeino1 (LLM_KEYS_JSON + fallback)
//
// ترتیب امتحان (کیفیت فارسیِ حقوقی در اولویت):
//   1) LLM_KEYS_JSON   — زنجیره کلیدهای مالک؛ آرایه‌ای از ارائه‌دهنده‌ها:
//        [{"id":"glm","base":"https://api.z.ai/api/paas/v4","key":"...","model":"glm-4.7-flash","maxTokens":2400}]
//   2) ZAI_API_KEY / LLM_API_KEY + LLM_BASE_URL + LLM_MODEL
//      (+ self-heal: اگر مدل پولی/ناموجود بود، مدل‌های همیشه‌رایگان glm-4.7-flash و glm-4.5-flash روی همان کلید امتحان می‌شوند)
//   3) GEMINI_API_KEY  — کیفیت فارسی بالا (v1beta/openai)
//   4) OPENROUTER_API_KEY / GROQ_API_KEY
//   5) z-ai-web-dev-sdk (فقط سندباکس توسعه)
//   6) بدون‌کلید (اضطراری): llm7 → pollinations POST → pollinations GET → hackclub → freellmapi
//
// فیوز خرابی (circuit breaker): هر ارائه‌دهنده‌ی خراب ۵ دقیقه کنار می‌رود و
// برنده‌ی موفق قبلی در درخواست‌های بعدی اول امتحان می‌شود (sticky).
// هرگز کلید واقعی در کد ذخیره نمی‌شود؛ همه از Environment Variable می‌آید.
// ============================================================

const SYSTEM_LEGAL = `تو دستیار حقوقی دادبان هستی — یک دستیار هوشمند حقوقی فارسی‌زبان.
پاسخ‌ها کوتاه، هدفمند و کاربردی باشد (حداکثر ۸-۱۰ خط) و دقیقاً این ساختار را داشته باشد:
۱) پاسخ مستقیم به پرسش در یک تا دو جمله.
۲) «مستند قانونی»: استناد به ماده/تبصره مرتبط با قالب «ماده X قانون Y» یا «تبصره X ماده Y».
۳) یک توصیه عملی کوتاه.

قواعد استناد:
- فقط به موادی که از وجود و شماره‌ی آن‌ها مطمئن هستی استناد کن؛ هرگز ماده، تبصره یا متن قانونی‌ای که وجود ندارد نساز.
- اگر شماره‌ی دقیق ماده را نمی‌دانی، بدون شماره فقط به نام قانون و موضوع ارجاع بده (مثلاً «طبق قانون حمایت خانواده ۱۳۹۱…»).
- اگر در پرامپت، نتایج جستجوی وب داده شده است، پاسخ باید بر اساس همان منابع واقعی باشد و منبع [۱] یا [۲] را ذکر کن.

لنگرگاه‌های مطمئن (واقعی):
- مهریه عندالاستطاعه: ماده ۱۰۸۲ قانون مدنی و تبصره الحاقی آن.
- حق طلاق برای زوج: ماده ۱۱۳۳ قانون مدنی؛ وکالت زوجه در طلاق: ماده ۱۱۱۹ قانون مدنی.
- حضانت فرزند: مواد ۱۱۶۹ تا ۱۱۷۵ قانون مدنی به‌همراه قانون حمایت خانواده ۱۳۹۱ — ملاک «مصلحت فرزند» است، نه سن ثابت.
- کلاهبرداری: ماده ۱ قانون تشدید مجازات مرتکبین ارتشا، اختلاس و کلاهبرداری ۱۳۶۷.
- کلاهبرداری رایانه‌ای: ماده ۷۵۰ قانون مجازات اسلامی (جرایم رایانه‌ای).
- صدور چک بلامحل: ماده ۱۰ قانون صدور چک ۱۳۵۲.
- اخراج کارگر به‌علت تقصیر: ماده ۲۷ قانون کار ۱۳۶۹.
- اصول قراردادها (الزام به وفا/آزادی قراردادها): مواد ۱۰، ۲۱۹ و ۲۲۰ قانون مدنی.

اگر پاسخ دقیق نیاز به مطالعه اسناد/قوانین دارد، بگو برای نظر قطعی با وکیل مشورت کند.
پاسخ را حتماً فقط با الفبای فارسی بنویس و از هر کاراکتر یا کلمه‌ی غیرفارسی (لاتین، چینی، کره‌ای،
ژاپنی، روسی و غیره) داخل جمله‌ها جداً خودداری کن.
هیچ‌وقت خودت را وکیل رسمی معرفی نکن و در پایان در یک جمله یادآوری کن: "این پاسخ جنبه اطلاع‌رسانی دارد و جایگزین مشاوره حقوقی رسمی نیست."`;

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

/* ─── ارائه‌دهنده‌ها ───────────────────────────────────────────────────── */

type Provider = {
  id: string;
  base: string; // آدرس کامل chat/completions
  key?: string;
  model: string;
  timeoutMs: number;
  maxTokens?: number;
  group: "keyed" | "sdk" | "keyless";
};

async function postOpenAiCompatible(
  url: string,
  body: unknown,
  key: string | undefined,
  timeoutMs = 30_000,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`llm http ${res.status}`);
  const raw = await res.text();
  let text = "";
  try {
    const data = JSON.parse(raw) as {
      choices?: { message?: { content?: string | null } }[];
      output_text?: string;
      response?: string;
    };
    text = data?.choices?.[0]?.message?.content ?? data?.output_text ?? data?.response ?? "";
    // برخی گیت‌وی‌ها (مثل atria) پاسخ را دوباره-JSON برمی‌گردانند — یک بار باز کردن
    if (typeof text === "string" && text.trim().startsWith("{")) {
      try {
        const inner = JSON.parse(text) as { choices?: { message?: { content?: string | null } }[] };
        const innerContent = inner?.choices?.[0]?.message?.content;
        if (typeof innerContent === "string") text = innerContent;
      } catch { /* متن عادی بود */ }
    }
  } catch {
    text = raw; // پاسخ متنی خام (مثل pollinations متن ساده برمی‌گرداند)
  }
  if (!text || !String(text).trim()) throw new Error("llm empty");
  return String(text);
}

/** 1) زنجیره کلیدهای مالک — همان فرمت LLM_KEYS_JSON پروژه homeino1 */
function parseKeysJsonProviders(): Provider[] {
  const raw = process.env.LLM_KEYS_JSON;
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e): e is Record<string, unknown> => !!e && typeof e === "object" && typeof (e as { base?: unknown }).base === "string" && typeof (e as { key?: unknown }).key === "string")
      .map((e, i) => ({
        id: `key-${typeof e.id === "string" && e.id ? e.id : i}`,
        base: `${String(e.base).replace(/\/$/, "")}/chat/completions`,
        key: String(e.key),
        model: typeof e.model === "string" && e.model ? e.model : "glm-4.7-flash",
        timeoutMs: 22_000,
        maxTokens: typeof e.maxTokens === "number" ? e.maxTokens : undefined,
        group: "keyed" as const,
      }));
  } catch {
    return [];
  }
}

/** 2-4) کلیدهای env — z.ai / atria / gemini / openrouter / groq */
function keyedEnvProviders(): Provider[] {
  const out: Provider[] = [];
  const key = process.env.ZAI_API_KEY || process.env.LLM_API_KEY;
  if (key) {
    const base = (process.env.LLM_BASE_URL ?? "https://api.z.ai/api/paas/v4").replace(/\/$/, "");
    const model = process.env.LLM_MODEL ?? "glm-4.6";
    // ۱) مدل همیشه‌رایگان اول — سریع، پایدار و هیچ توکن پولی مصرف نمی‌کند (صرفه‌جویی)
    out.push({ id: "zai-free", base: `${base}/chat/completions`, key, model: "glm-4.5-flash", timeoutMs: 22_000, group: "keyed" });
    // ۲) آتریا — پشتیبان اصلی همه چت‌ها؛ وقتی flash محدود شد خودکار جواب می‌دهد
    //    (مدل Preview برای پاسخ‌های بلند کند است؛ timeout محافظت‌شده)
    if (process.env.ATRIA_API_KEY) {
      out.push({
        id: "atria",
        base: `${(process.env.ATRIA_BASE_URL ?? "https://api.atria-asi.ai/v1").replace(/\/$/, "")}/chat/completions`,
        key: process.env.ATRIA_API_KEY,
        model: process.env.ATRIA_MODEL ?? "Atria-Dawn-Preview",
        timeoutMs: 18_000,
        group: "keyed",
      });
    }
    // ۳) مدل پولی — فقط به‌عنوان ارتقا وقتی سهمیه شارژ شده باشد
    out.push({ id: "zai", base: `${base}/chat/completions`, key, model, timeoutMs: 22_000, group: "keyed" });
  }
  if (!key && process.env.ATRIA_API_KEY) {
    // اگر کلید z.ai نبود، آتریا تأمین‌کننده اصلی است
    out.push({
      id: "atria",
      base: `${(process.env.ATRIA_BASE_URL ?? "https://api.atria-asi.ai/v1").replace(/\/$/, "")}/chat/completions`,
      key: process.env.ATRIA_API_KEY,
      model: process.env.ATRIA_MODEL ?? "Atria-Dawn-Preview",
      timeoutMs: 18_000,
      group: "keyed",
    });
  }
  if (process.env.GEMINI_API_KEY) {
    out.push({
      id: "gemini",
      base: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      timeoutMs: 22_000,
      group: "keyed",
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    out.push({
      id: "openrouter",
      base: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL ?? "z-ai/glm-4.5-flash:free",
      timeoutMs: 22_000,
      group: "keyed",
    });
  }
  if (process.env.GROQ_API_KEY) {
    out.push({
      id: "groq",
      base: "https://api.groq.com/openai/v1/chat/completions",
      key: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      timeoutMs: 20_000,
      group: "keyed",
    });
  }
  // حذف ترکیب تکراری (base+model)
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = `${p.base}|${p.model}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** 6) بدون‌کلید — فقط برای اضطرار؛ در Vercel ممکن است بلاک باشند */
function keylessProviders(): Provider[] {
  return [
    { id: "llm7-glm", base: "https://api.llm7.io/v1/chat/completions", key: "unused", model: "GLM-5.3-Flash", timeoutMs: 12_000, group: "keyless" },
    { id: "pollinations-post", base: "https://text.pollinations.ai/", model: "openai", timeoutMs: 9_000, group: "keyless" },
    { id: "pollinations-get", base: "https://text.pollinations.ai/", model: "openai", timeoutMs: 8_000, group: "keyless" },
  ];
}

function buildChain(): Provider[] {
  const sdk = process.env.NODE_ENV === "production" && !process.env.ZAI_WEB_SDK_ALLOW ? [] : [{ id: "sdk", base: "", model: "-", timeoutMs: 20_000, group: "sdk" as const }];
  return [...parseKeysJsonProviders(), ...keyedEnvProviders(), ...sdk, ...keylessProviders()];
}

/* ─── اجرای یک ارائه‌دهنده ─────────────────────────────────────────────── */

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
    return text ? text : null;
  } catch {
    return null;
  }
}

async function viaSdk(messages: LlmMessage[]): Promise<string | null> {
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
    return text || null;
  } catch {
    return null;
  }
}

interface ZaiClient {
  chat: { completions: { create: (opts: unknown) => Promise<{ choices?: { message?: { content?: string } }[] }> } };
}

async function runProvider(p: Provider, messages: LlmMessage[], maxTokens: number): Promise<string> {
  if (p.group === "sdk") return (await viaSdk(messages)) ?? "";
  if (p.id === "pollinations-get") return (await pollinationsGet(messages)) ?? "";
  const bodyObj: Record<string, unknown> =
    p.id === "pollinations-post"
      ? { messages, model: "openai", max_tokens: maxTokens, seed: 1, referrer: "dadban" }
      : { model: p.model, messages, max_tokens: maxTokens, temperature: 0.3 };
  // مدل‌های GLM-4.5+ و آتریا تفکر زنجیره‌ای دارند؛ غیرفعال‌سازی برای پاسخ مستقیم و جلوگیری از هدررفت توکن
  if (p.base.includes("api.z.ai") || p.base.includes("bigmodel.cn") || p.base.includes("atria-asi.ai")) bodyObj.thinking = { type: "disabled" };
  const body = bodyObj;
  const extra: Record<string, string> = {};
  if (p.id === "openrouter") {
    extra["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dadban-brown.vercel.app";
    extra["X-Title"] = "DADBAN";
  }
  const text = await postOpenAiCompatible(p.base, body, p.key, p.timeoutMs, extra);
  return sanitizePersian(text);
}

/* ─── فیوز خرابی (circuit breaker) ─────────────────────────────────────── */

const breaker = new Map<string, { fail: number; until: number }>();
const COOLDOWN_MS = 5 * 60_000;
let preferred: string | null = null;

function isDown(id: string): boolean {
  const b = breaker.get(id);
  return !!b && b.until > Date.now();
}

function markFail(id: string): void {
  const prev = breaker.get(id);
  breaker.set(id, { fail: (prev?.fail ?? 0) + 1, until: Date.now() + COOLDOWN_MS });
}

function markOk(id: string): void {
  breaker.delete(id);
  preferred = id;
}

/* ─── API عمومی ────────────────────────────────────────────────────────── */

export async function askLLM(messages: LlmMessage[], maxTokens = 400, systemPrompt = SYSTEM_LEGAL): Promise<string | null> {
  const all = normalizeMessages([{ role: "system", content: systemPrompt }, ...messages]);
  const chain = buildChain();
  const ordered = [
    ...chain.filter((p) => p.id === preferred),
    ...chain.filter((p) => p.id !== preferred && !isDown(p.id)),
  ];
  let keylessTried = 0;
  for (const p of ordered) {
    if (p.group === "keyless" && ++keylessTried > 3) break; // بودجه زمانی درخواست
    try {
      const text = await runProvider(p, all, p.maxTokens ?? maxTokens);
      if (text && text.trim().length > 1) {
        markOk(p.id);
        return text;
      }
      markFail(p.id);
    } catch {
      markFail(p.id);
    }
  }
  return null;
}

/* ─── بینایی ماشین (OCR تصویر قرارداد) ────────────────────────────────── */

/** ارائه‌دهنده‌های دارای قابلیت بینایی (vision) برای خواندن متن از تصویر */
function visionProviders(): Provider[] {
  const out: Provider[] = [];
  const key = process.env.ZAI_API_KEY || process.env.LLM_API_KEY;
  const seen = new Set<string>();
  const push = (id: string, base: string, model: string, timeoutMs: number) => {
    const k = `${base}|${model}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ id, base, key, model, timeoutMs, group: "keyed" });
  };
  if (key) {
    const canonical = "https://api.z.ai/api/paas/v4/chat/completions";
    const custom = (process.env.LLM_BASE_URL ?? "").replace(/\/$/, "");
    // ۱) پایه‌ی کنونیکال z.ai — مستقل از LLM_BASE_URL (اگر پایه‌ی سفارشی مدل vision نداشته باشد)
    push("zai-vision", canonical, process.env.VISION_MODEL ?? "glm-4.5v", 16_000);
    push("zai-vision", canonical, "glm-4.1v-thinking-flash", 16_000);
    // ۲) پایه‌ی سفارشی (در صورت متفاوت بودن)
    if (custom && `${custom}/chat/completions` !== canonical) {
      push("zai-vision-custom", `${custom}/chat/completions`, process.env.VISION_MODEL ?? "glm-4.5v", 16_000);
    }
  }
  if (process.env.ATRIA_API_KEY) {
    out.push({
      id: "atria-vision",
      base: `${(process.env.ATRIA_BASE_URL ?? "https://api.atria-asi.ai/v1").replace(/\/$/, "")}/chat/completions`,
      key: process.env.ATRIA_API_KEY,
      model: process.env.ATRIA_MODEL ?? "Atria-Dawn-Preview",
      timeoutMs: 16_000,
      group: "keyed",
    });
  }
  if (process.env.GEMINI_API_KEY) {
    out.push({
      id: "gemini-vision",
      base: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      timeoutMs: 16_000,
      group: "keyed",
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    out.push({
      id: "openrouter-vision",
      base: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_VISION_MODEL ?? "google/gemini-2.0-flash-exp:free",
      timeoutMs: 16_000,
      group: "keyed",
    });
  }
  return out;
}

export type VisionResult = { text: string | null; errors: string[] };

/**
 * استخراج متن از تصویر قرارداد با مدل بینایی (OCR هوشمند).
 * imageData باید Data URL کامل باشد (data:image/png;base64,...)
 * خروجی: متن استخراج‌شده یا null به‌همراه فهرست خطاهای هر ارائه‌دهنده (برای تشخیص).
 */
export async function askVisionLLM(prompt: string, imageData: string, maxTokens = 4000): Promise<VisionResult> {
  const errors: string[] = [];
  const t0 = Date.now();
  for (const p of visionProviders()) {
    if (Date.now() - t0 > 42_000) { errors.push("deadline"); break; } // بودجه زمانی — مسیر maxDuration=60 امن بماند
    try {
      const body: Record<string, unknown> = {
        model: p.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageData } },
            ],
          },
        ],
        max_tokens: maxTokens,
        temperature: 0.1,
      };
      if (p.base.includes("api.z.ai") || p.base.includes("bigmodel.cn")) body.thinking = { type: "disabled" };
      const extra: Record<string, string> = {};
      if (p.id === "openrouter-vision") {
        extra["HTTP-Referer"] = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dadban-brown.vercel.app";
        extra["X-Title"] = "DADBAN";
      }
      const text = await postOpenAiCompatible(p.base, body, p.key, p.timeoutMs, extra);
      if (text && text.trim().length > 20) return { text: text.trim(), errors };
      errors.push(`${p.id}/${p.model}: empty`);
    } catch (e) {
      errors.push(`${p.id}/${p.model}: ${String((e as Error)?.message ?? e).slice(0, 90)}`);
    }
  }
  return { text: null, errors };
}

/* ─── تشخیص سلامت (برای /api/ai/llm-health) — هرگز کلید برنمی‌گرداند ───── */

export type ProbeRow = { id: string; model: string; ok: boolean; ms: number; info: string };

export async function llmProbe(): Promise<ProbeRow[]> {
  const chain = buildChain();
  const out: ProbeRow[] = [];
  const msgs: LlmMessage[] = [{ role: "user", content: "سلام. فقط بنویس: آماده" }];
  for (const p of chain) {
    const t0 = Date.now();
    try {
      const text = await runProvider(p, msgs, 64);
      out.push({ id: p.id, model: p.model, ok: !!text && text.trim().length > 0, ms: Date.now() - t0, info: text ? `len=${text.trim().length}` : "پاسخ خالی" });
    } catch (e) {
      out.push({ id: p.id, model: p.model, ok: false, ms: Date.now() - t0, info: String((e as Error)?.message ?? e).slice(0, 80) });
    }
  }
  return out;
}

/** تشخیص دقیق کلید z.ai: ترکیب‌های مختلف base × model تا منبع خرابی پیدا شود. */
export async function zaiDiagnose(): Promise<{ configured: boolean; combos: { base: string; model: string; ok: boolean; ms: number; error?: string }[] }> {
  const key = process.env.ZAI_API_KEY || process.env.LLM_API_KEY;
  if (!key) return { configured: false, combos: [] };
  const bases = [...new Set([
    (process.env.LLM_BASE_URL ?? "https://api.z.ai/api/paas/v4").replace(/\/$/, ""),
    "https://api.z.ai/api/paas/v4",
    "https://api.z.ai/api/coding/paas/v4",
  ])];
  const models = [...new Set([process.env.LLM_MODEL ?? "glm-4.6", "glm-4.7-flash", "glm-4.5-flash"])];
  const combos: { base: string; model: string; ok: boolean; ms: number; error?: string }[] = [];
  for (const base of bases) {
    let baseOk = false;
    for (const model of models) {
      const t0 = Date.now();
      try {
        const text = await postOpenAiCompatible(`${base}/chat/completions`, { model, messages: [{ role: "user", content: "سلام" }], max_tokens: 8, temperature: 0 }, key, 8_000);
        combos.push({ base, model, ok: !!text, ms: Date.now() - t0 });
        if (text) baseOk = true;
      } catch (e) {
        combos.push({ base, model, ok: false, ms: Date.now() - t0, error: String((e as Error)?.message ?? e).slice(0, 60) });
      }
    }
    if (baseOk) break; // یک base سالم کافی است
  }
  return { configured: true, combos };
}
