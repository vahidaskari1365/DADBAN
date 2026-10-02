// ============================================================
// دادبان — کتابخانه‌ی مرکزی قابلیت‌های هوش مصنوعی (فقط سمت سرور)
// قابلیت‌ها: بینایی ماشین (VLM)، گفتار به متن (ASR)، متن به گفتار (TTS)،
// جستجوی وب (web_search) — همه از طریق z-ai-web-dev-sdk
// ============================================================
// امنیت: این ماژول هرگز نباید در کد سمت کلاینت import شود.
// "server-only" از bundling در کلاینت جلوگیری می‌کند.
import "server-only";

type ZaiInstance = {
  chat: {
    completions: {
      create: (opts: unknown) => Promise<{ choices?: { message?: { content?: string } }[] }>;
      createVision: (opts: unknown) => Promise<{ choices?: { message?: { content?: string } }[] }>;
    };
  };
  audio: {
    tts: { create: (opts: unknown) => Promise<Response> };
    asr: { create: (opts: unknown) => Promise<{ text?: string }> };
  };
  functions: {
    invoke: (
      name: "web_search" | "page_reader",
      args: { query: string; num?: number; recency_days?: number } | { url: string },
    ) => Promise<
      { url: string; name: string; snippet: string; host_name: string; rank: number; date: string; favicon: string }[]
      | { title?: string; html?: string; url?: string; publishedTime?: string }
    >;
  };
};

const globalForAi = globalThis as typeof globalThis & { __dadbanZai?: Promise<ZaiInstance> };

/** نمونه‌ی Singleton از SDK — یک‌بار ساخته می‌شود و در کل عمر پروسه استفاده می‌شود. */
export async function getZai(): Promise<ZaiInstance> {
  if (!globalForAi.__dadbanZai) {
    globalForAi.__dadbanZai = (async () => {
      const mod = (await import("z-ai-web-dev-sdk")) as unknown as {
        default?: { create: () => Promise<ZaiInstance> };
        create?: () => Promise<ZaiInstance>;
      };
      const createFn = mod.default?.create ?? mod.create;
      if (!createFn) throw new Error("z-ai-web-dev-sdk is unavailable");
      return createFn();
    })().catch((err) => {
      globalForAi.__dadbanZai = undefined;
      throw err;
    });
  }
  return globalForAi.__dadbanZai;
}

/** آیا قابلیت‌های SDK در دسترس هستند؟ (برای نمایش/مخفی کردن UI) */
export async function isAiAvailable(): Promise<boolean> {
  try {
    await getZai();
    return true;
  } catch {
    return false;
  }
}

/* ─── بینایی ماشین: تحلیل تصویر/سند ─────────────────────────────────── */

export async function visionAnalyze(
  imageDataUrl: string,
  prompt: string,
  systemPrompt?: string,
): Promise<string | null> {
  const zai = await getZai();
  const messages = [
    ...(systemPrompt ? [{ role: "assistant" as const, content: systemPrompt }] : []),
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: prompt },
        { type: "image_url" as const, image_url: { url: imageDataUrl } },
      ],
    },
  ];
  const res = await zai.chat.completions.createVision({ messages, thinking: { type: "disabled" } });
  const text = res?.choices?.[0]?.message?.content ?? "";
  return text.trim() ? text.trim() : null;
}

/* ─── گفتار به متن (ASR) ─────────────────────────────────────────────── */

export async function transcribeAudio(fileBase64: string): Promise<string | null> {
  const zai = await getZai();
  const res = await zai.audio.asr.create({ file_base64: fileBase64 });
  const text = res?.text ?? "";
  return text.trim() ? text.trim() : null;
}

/* ─── متن به گفتار (TTS) — حداکثر ۱۰۲۴ کاراکتر ───────────────────────── */

export async function synthesizeSpeech(
  input: string,
  opts?: { voice?: string; speed?: number },
): Promise<Buffer | null> {
  const text = input.slice(0, 1024);
  if (!text.trim()) return null;
  const zai = await getZai();
  const response = await zai.audio.tts.create({
    input: text,
    voice: opts?.voice ?? "tongtong",
    speed: Math.min(2, Math.max(0.5, opts?.speed ?? 1)),
    response_format: "wav",
    stream: false,
  });
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));
  return buffer.length > 100 ? buffer : null;
}

/* ─── جستجوی وب ──────────────────────────────────────────────────────── */

export type WebSearchResult = {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date: string;
  favicon: string;
};

export async function webSearch(query: string, num = 8, recencyDays?: number): Promise<WebSearchResult[]> {
  const zai = await getZai();
  const results = await zai.functions.invoke("web_search", {
    query: query.slice(0, 400),
    num: Math.min(10, Math.max(1, num)),
    ...(recencyDays ? { recency_days: recencyDays } : {}),
  });
  return Array.isArray(results) ? results.slice(0, num) : [];
}
