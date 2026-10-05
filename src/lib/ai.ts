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

/** SDK فقط در سندباکس/توسعه فعال است (همان سیاست llm.ts) — روی Vercel
 *  import/create/invoke ممکن است بی‌پاسخ بماند و بودجهٔ RAG را بخورد. */
const SDK_SEARCH_ENABLED = process.env.NODE_ENV !== "production" || !!process.env.ZAI_WEB_SDK_ALLOW;

export async function webSearch(query: string, num = 8, recencyDays?: number): Promise<WebSearchResult[]> {
  const take = Math.min(10, Math.max(1, num));
  // ۱) مسیر اصلی: SDK (سندباکس/توسعه) — با سقف ۸ ثانیه تا هرگز هنگ نکند
  if (SDK_SEARCH_ENABLED) {
    try {
      const zai = await Promise.race([
        getZai(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("sdk-create-timeout")), 8_000)),
      ]);
      const results = (await Promise.race([
        zai.functions.invoke("web_search", {
          query: query.slice(0, 400),
          num: take,
          ...(recencyDays ? { recency_days: recencyDays } : {}),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("sdk-invoke-timeout")), 8_000)),
      ])) as Awaited<ReturnType<ZaiInstance["functions"]["invoke"]>>;
      if (Array.isArray(results) && results.length) return results.slice(0, num);
    } catch {
      /* SDK در دسترس نیست → مسیر پشتیبان */
    }
  }
  // ۲) مسیر پشتیبان بدون کلید (Vercel-friendly): زنجیرهٔ چندموتوره
  return ddgSearch(query, take);
}

/** پشتیبانِ جستجو بدون هیچ کلیدی — زنجیرهٔ چند-موتورهٔ best-effort.
 *  DDG گاهی anomaly می‌دهد؛ برای همین چند منبع مستقل امتحان می‌شود تا روی Vercel هم نتیجه بگیریم. */
async function ddgSearch(query: string, num: number): Promise<WebSearchResult[]> {
  // کش سبک ۱۰ دقیقه‌ای — جلوگیری از فشار مکرر روی موتورهای جستجو (ضد anomaly)
  const cached = searchCache.get(query);
  if (cached && cached.until > Date.now()) return cached.results.slice(0, num);

  const q = encodeURIComponent(query.slice(0, 300));
  const t0 = Date.now();
  let results: WebSearchResult[] = [];
  for (const engine of [
    () => ddgFetch(`https://lite.duckduckgo.com/lite/?q=${q}`, num),
    () => ddgFetch(`https://html.duckduckgo.com/html/?q=${q}&kl=ir-ir`, num),
    () => bingFetch(query, num),
    () => bingFetch(bingKeywords(query), num), // واریانت کلیدواژه‌ای — بینینگ جملهٔ گفتاری را دوست ندارد
    () => gnewsFetch(query, num),
    () => wikiFetch(query, num),
  ]) {
    if (Date.now() - t0 > 18_000) break; // سقف زمانی کل زنجیره — مسیر maxDuration=60 امن بماند
    results = await engine();
    if (results.length) break; // اولین موتورِ پاسخ‌دهنده کافی است
  }
  if (results.length) searchCache.set(query, { results, until: Date.now() + 10 * 60_000 });
  return results.slice(0, num);
}

const searchCache = new Map<string, { results: WebSearchResult[]; until: number }>();

/** استخراج کلیدواژه از جملهٔ گفتاری — حذف واژه‌های پرکاربرد برای موتورهای جستجو. */
function bingKeywords(raw: string): string {
  const stop = new Set([
    "مبلغ", "چقدر", "چگونه", "چیست", "چیه", "است", "بوده", "برای", "چه", "سال", "جاری", "امسال",
    "کامل", "کامله", "در", "به", "از", "با", "و", "من", "می", "را", "رو", "که", "این", "آن",
    "می‌خواهم", "میخوام", "لطفا", "دارد", "دارم", "شده", "شود", "بکنم", "کنم",
  ]);
  const words = raw.replace(/[؟?!.،؛:«»]/g, " ").split(/\s+/).filter(Boolean);
  const kw = words.filter((w) => !stop.has(w));
  return (kw.length ? kw.join(" ") : raw).slice(0, 180);
}

/** گزارش تشخیصی هر موتور پشتیبان (تعداد/وضعیت/خطا) — فقط برای debug جستجو. */
export async function webSearchProbe(query: string): Promise<{ engine: string; ok: boolean; count: number; ms: number; info: string }[]> {
  const q = encodeURIComponent(query.slice(0, 300));
  const out: { engine: string; ok: boolean; count: number; ms: number; info: string }[] = [];
  const engines: [string, () => Promise<WebSearchResult[]>][] = [
    ["ddg-lite", () => ddgFetch(`https://lite.duckduckgo.com/lite/?q=${q}`, 6)],
    ["ddg-html", () => ddgFetch(`https://html.duckduckgo.com/html/?q=${q}&kl=ir-ir`, 6)],
    ["bing", () => bingFetch(query, 6)],
    ["bing-keywords", () => bingFetch(bingKeywords(query), 6)],
    ["gnews-rss", () => gnewsFetch(query, 6)],
    ["wiki-fa", () => wikiFetch(query, 6)],
  ];
  for (const [name, fn] of engines) {
    const t0 = Date.now();
    try {
      const r = await fn();
      out.push({ engine: name, ok: r.length > 0, count: r.length, ms: Date.now() - t0, info: r.length ? "" : "0 result" });
    } catch (e) {
      out.push({ engine: name, ok: false, count: 0, ms: Date.now() - t0, info: String((e as Error)?.message ?? e).slice(0, 80) });
    }
  }
  return out;
}

/** گوگل‌نیوز RSS — قالب ماشینی و معمولاً از IPهای دیتاسنتر در دسترس. */
async function gnewsFetch(query: string, num: number): Promise<WebSearchResult[]> {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query.slice(0, 250))}&hl=fa&gl=IR&ceid=IR:fa`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; DadbanBot/1.0)" }, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split("<item>").slice(1, num + 1);
    const out: WebSearchResult[] = [];
    for (const it of items) {
      const pick = (tag: string): string => {
        const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(it);
        return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
      };
      const title = pick("title").replace(/\s+-\s+[^-]+$/, "");
      if (!title) continue;
      const src = new RegExp('<source[^>]*>([\\s\\S]*?)</source>').exec(it)?.[1]?.trim() ?? "";
      const url = pick("link");
      out.push({
        url: url || `https://news.google.com/search?q=${encodeURIComponent(query)}`,
        name: title,
        snippet: src ? `${src} — ${pick("pubDate")}` : pick("pubDate"),
        host_name: "news.google.com",
        rank: out.length + 1,
        date: pick("pubDate").slice(0, 16),
        favicon: "",
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** ویکی‌پدیای فارسی — API ماشینی باز، معمولاً از دیتاسنترها قابل دسترس. */
async function wikiFetch(query: string, num: number): Promise<WebSearchResult[]> {
  try {
    const res = await fetch(
      `https://fa.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(bingKeywords(query).slice(0, 200))}&srlimit=${num}&format=json&origin=*`,
      { headers: { "User-Agent": "DadbanBot/1.0 (dadban.ir)" }, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { query?: { search?: { title: string; snippet: string }[] } };
    const items = data?.query?.search ?? [];
    const out: WebSearchResult[] = [];
    for (const it of items) {
      if (!it.title) continue;
      out.push({
        url: `https://fa.wikipedia.org/wiki/${encodeURIComponent(it.title.replace(/\s/g, "_"))}`,
        name: it.title,
        snippet: it.snippet?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() ?? "",
        host_name: "fa.wikipedia.org",
        rank: out.length + 1,
        date: "",
        favicon: "",
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** بینینگ HTML — مسیر پشتیبان چهارم. */
async function bingFetch(query: string, num: number): Promise<WebSearchResult[]> {
  try {
    const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query.slice(0, 250))}&setlang=fa&mkt=fa-IR`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "fa,en;q=0.8",
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const out: WebSearchResult[] = [];
    const re = /<li class="b_algo"[\s\S]*?<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?<\/li>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < num) {
      const title = m[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      if (!title) continue;
      let host = "";
      try { host = new URL(m[1]).hostname.replace(/^www\./, ""); } catch { continue; }
      out.push({
        url: m[1],
        name: title,
        snippet: m[3] ? m[3].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : "",
        host_name: host,
        rank: out.length + 1,
        date: "",
        favicon: "",
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function ddgFetch(url: string, num: number): Promise<WebSearchResult[]> {
  const decodeEntities = (s: string): string =>
    s
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)));
  const stripTags = (s: string): string => decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "fa,en;q=0.8",
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    // ۱) همهٔ لینک‌های ریدایرکت DDG (uddg=) — مستقل از کلاس و ترتیب ویژگی‌ها
    const linkRe = /<a[^>]*href="([^"]*uddg=[^"&]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    // ۲) خلاصه‌ها (هر کدام که حاضر بود)
    const snippets: string[] = [];
    const snipRes = [
      /<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/g,
      /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
    ];
    for (const re of snipRes) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && snippets.length < 12) {
        const s = stripTags(m[1]);
        if (s) snippets.push(s);
      }
      if (snippets.length) break;
    }
    const out: WebSearchResult[] = [];
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(html)) && out.length < num) {
      const title = stripTags(lm[2]);
      if (!title || title.length < 3) continue;
      let href = decodeURIComponent(lm[1]);
      if (href.startsWith("//")) href = `https:${href}`;
      let host = "";
      try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { continue; }
      if (!host || host.endsWith("duckduckgo.com")) continue;
      out.push({ url: href, name: title, snippet: snippets[out.length] ?? "", host_name: host, rank: out.length + 1, date: "", favicon: "" });
    }
    return out;
  } catch {
    return [];
  }
}
