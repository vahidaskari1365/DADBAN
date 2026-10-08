import { NextResponse } from "next/server";
import { analyzeLegalQuery, analyzeContract } from "@/lib/legal-engine";
import { askLLM, SYSTEM_LEGAL_CORE } from "@/lib/llm";
import { webSearch, type WebSearchResult } from "@/lib/ai";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { extractContractFile } from "@/lib/extract-text";
import { detectSpecialtiesFromMessage, detectProvinceFromMessage, matchLawyers, TOPIC_SPECIALTIES, type MatchedLawyer } from "@/lib/lawyer-match";
import { tdyn } from "@/lib/i18n/dynamic";
import { detectQueryLang, LANG_NAME, type QueryLang } from "@/lib/i18n/lang-detect";
import type { LlmMessage } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel fluid — بودجه کافی برای OCR عکس + زنجیره fallback

const withTimeout = <T,>(task: Promise<T>, ms: number) =>
  Promise.race<T>([task, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

/* ─── چندزبانه: تشخیص زبان سؤال و دستور پاسخ همان زبان — helper مشترک lang-detect ─── */

/** دستور ساختار پاسخ کامل‌تر و چندزبانه — روی هستهٔ پرامپت سوار می‌شود */
function languageDirective(lang: QueryLang): string {
  const rich =
    lang === "fa"
      ? `پاسخ کامل‌تر و ساختارمندتر از حالت عادی بده (۱۰ تا ۱۶ خط):
۱) پاسخ مستقیم به پرسش (۲-۳ جمله)
۲) توضیح گام‌به‌گام روند/مراحل قانونی
۳) «مستند قانونی» با ذکر ماده و نام قانون
۴) مدارک یا مهلت‌های مهم (اگر موضوع دارد)
۵) هشدارها و اشتباهات رایج
۶) جمع‌بندی با یک توصیهٔ عملی`
      : `Give a fuller, well-structured answer (10-16 lines):
1) Direct answer to the question (2-3 sentences)
2) Step-by-step legal procedure
3) "Legal basis" citing the relevant article/statute
4) Required documents or important deadlines (if applicable)
5) Warnings and common mistakes
6) Wrap-up with one practical recommendation`;
  const mirror =
    lang === "fa"
      ? `پاسخ را حتماً فقط با الفبای فارسی بنویس و از هر کاراکتر غیرفارسی داخل جمله‌ها خودداری کن.`
      : `IMPORTANT LANGUAGE RULE: Detect the language of the user's last message and write the ENTIRE answer in exactly that language (${LANG_NAME[lang]}). Never mix scripts inside sentences. Legal terms of Iran's law should be given with a short explanation in that language.`;
  const disclaimer =
    lang === "fa"
      ? `هیچ‌وقت خودت را وکیل رسمی معرفی نکن و در پایان در یک جمله یادآوری کن: "این پاسخ جنبه اطلاع‌رسانی دارد و جایگزین مشاوره حقوقی رسمی نیست."`
      : `Never present yourself as an official lawyer. At the end add one line in the user's language: "This answer is informational and does not replace formal legal advice."`;
  return `${rich}\n${mirror}\n${disclaimer}`;
}

/** پرامپت سیستمی نهایی برای سؤال فعلی با توجه به زبان و منابع وب */
function buildSystemPrompt(lang: QueryLang, sources: WebSearchResult[]): string {
  const base = `${SYSTEM_LEGAL_CORE}\n${languageDirective(lang)}`;
  if (!sources.length) return base;
  const context = sources
    .slice(0, 6)
    .map((s, i) => `[${i + 1}] ${s.name}\n${s.snippet}\nمنبع: ${s.url}`)
    .join("\n\n");
  return `${base}\n\nاگر نتایج جستجوی وب زیر به سؤال مرتبط است، از آن‌ها استفاده کن و در پایان پاسخ، منابع مرتبط را با شماره [۱] و [۲] ذکر کن. اگر نتیجه‌ای مرتبط نیست، نادیده‌اش بگیر:\n\n${context}`;
}

/** تاریخچهٔ گفتگو: پاکسازی و محدودسازی (حداکثر ۳ دور = ۶ پیام) */
function sanitizeHistory(raw: unknown): LlmMessage[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .filter(
      (m): m is { role: string; content: string } =>
        !!m && typeof m === "object" &&
        typeof (m as { role?: unknown }).role === "string" &&
        typeof (m as { content?: unknown }).content === "string" &&
        (m as { role: string; content: string }).content.trim().length > 0,
    )
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
}

const CONTRACT_PROMPT = `قرارداد زیر را تحلیل کن و نقاط ضعف، ریسک‌ها و بندهای مهم آن را به فارسی فهرست کن.
در تحلیل خود به مواد قانونی مرتبط هم استناد کن (مانند مواد ۱۰، ۲۱۹ و ۲۳۰ قانون مدنی) و شماره ماده و تبصره را ذکر کن:

`;

/** بومی‌سازی فیلدهای نمایشی وکلا در پاسخ AI (اسم/عنوان/شهر) برای زبان‌های غیر فارسی — با کش */
async function localizeMatch(
  m: { topic: string | null; specialties: string[]; province: string | null; lawyers: MatchedLawyer[] } | undefined,
  lang: QueryLang,
) {
  if (!m || lang === "fa") return m;
  try {
    const lawyers = await Promise.all(
      m.lawyers.map(async (l) => ({
        ...l,
        name: await tdyn(lang, l.name, 300),
        title: await tdyn(lang, l.title, 300),
        city: await tdyn(lang, l.city, 200),
      })),
    );
    return { ...m, lawyers };
  } catch {
    return m;
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "ai", 20, 60 * 60_000);
  if (limited) return limited;

  // آپلود فایل قرارداد (multipart/form-data) یا بدنه JSON معمولی
  let upload: { text: string; name: string; chars: number } | null = null;
  let body: Record<string, unknown> = {};
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "فایلی برای تحلیل انتخاب نشده است." }, { status: 400 });
    }
    try {
      upload = await extractContractFile(file);
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "خواندن فایل ناموفق بود." },
        { status: 400 },
      );
    }
    const m = form.get("mode");
    body = { mode: typeof m === "string" && m ? m : "contract" };
  } else {
    body = (await readJson(req, 16_384)) ?? {};
  }

  const contract = upload ? upload.text : text(body?.contract, 6000);
  const query = text(body?.query, 3000);
  const mode = body?.mode;
  // تاریخچهٔ گفتگو (چنددوری تا ۳ دور) + زبان سؤال فعلی
  const history = sanitizeHistory(body?.history);
  const lang = detectQueryLang(query || history.map((h) => h.content).join(" "));
  // جستجوی وب: اگر کاربر فعال کرده باشد یا سؤال به مبالغ/قوانین زمان‌مند مربوط باشد
  // (دیه، دستمزد، مالیات، وام، سقف‌ها…) خودکار فعال می‌شود تا پاسخ با قوانین روز ایران باشد.
  const TIME_SENSITIVE_RE = /(دیه|دستمزد|مالیات|وام|جریمه|سقف|تورم|امسال|سال جاری|۱۴۰۳|۱۴۰۴|۱۴۰۲|شورای عالی کار|ابلاغیه)/;
  const useWeb = body?.webSearch === true || (!!query && TIME_SENSITIVE_RE.test(query));
  // استان کاربر: از state فانل (انتخاب در ویزارد) یا از خود متن پیام تشخیص داده می‌شود
  const province = text(body?.province, 60) || (query ? detectProvinceFromMessage(query) : null);

  try {
    if (mode === "contract" || contract) {
      if (!contract) return NextResponse.json({ ok: false, error: "متن قرارداد معتبر نیست." }, { status: 400 });
      // تحلیل محلی همیشه محاسبه می‌شود تا UI آمار/ریسک داشته باشد؛ متن تحلیل هوش مصنوعی در صورت موفقیت اضافه می‌شود
      const local = analyzeContract(contract);
      const meta = upload ? { fileName: upload.name, chars: upload.chars } : {};
      const llm = await withTimeout(askLLM([{ role: "user", content: `${CONTRACT_PROMPT}${contract}` }], 700), 27_000);
      if (llm) {
        return NextResponse.json({ ok: true, mode: "contract", source: "llm", ...meta, analysis: llm, findings: local.findings, riskScore: local.riskScore });
      }
      return NextResponse.json({ ok: true, mode: "contract", source: "local", ...meta, ...local });
    }

    if (!query) return NextResponse.json({ ok: false, error: "لطفاً سؤال خود را بنویسید." }, { status: 400 });

    // حالت جستجوی وب: ابتدا نتایج واقعی گرفته و به زمینه‌ی مدل تزریق می‌شود
    let sources: { title: string; url: string; host: string; snippet: string }[] = [];
    let systemPrompt = buildSystemPrompt(lang, []);
    if (useWeb) {
      try {
        const results = await withTimeout(webSearch(query, 6), 25_000);
        if (results.length) {
          sources = results.map((r) => ({ title: r.name, url: r.url, host: r.host_name, snippet: r.snippet }));
          systemPrompt = buildSystemPrompt(lang, results);
        }
      } catch {
        /* جستجو شکست خورد → پاسخ بدون وب */
      }
    }

    // چنددوری: تاریخچه + سؤال فعلی — پاسخ کامل‌تر (توکن ۱۲۰۰) و سانیتایزر فقط برای فارسی
    const llmMessages: LlmMessage[] = [...history, { role: "user", content: query }];
    const llm = await withTimeout(askLLM(llmMessages, 1200, systemPrompt, { sanitize: lang === "fa" }), 27_000);

    // پیشنهاد وکیل بر اساس مشکل کاربر (۱۰ وکیل هم‌تخصص از دیتابیس واقعی)
    // متن تشخیص: سؤال فعلی + سؤال‌های قبلی گفتگو (تا موضوع در ادامهٔ چت هم گم نشود)
    const detectText = [query, ...history.filter((h) => h.role === "user").map((h) => h.content)].join(" ");
    let lawyerMatch: { topic: string | null; specialties: string[]; province: string | null; lawyers: MatchedLawyer[] } | undefined;
    try {
      const det = detectSpecialtiesFromMessage(detectText);
      if (det.specialties.length > 0) {
        const matched = await matchLawyers(det.specialties, 10, province);
        if (matched.length) lawyerMatch = { topic: det.topic, specialties: det.specialties, province, lawyers: matched };
      }
    } catch {
      /* non-fatal */
    }

    if (llm) return NextResponse.json({ ok: true, mode: "guide", source: "llm", answer: llm, sources, lawyerMatch: await localizeMatch(lawyerMatch, lang), lang });
    const guidance = analyzeLegalQuery(query);
    if (!lawyerMatch && guidance.matched && TOPIC_SPECIALTIES[guidance.topic]) {
      try {
        const specs = TOPIC_SPECIALTIES[guidance.topic];
        const matched = await matchLawyers(specs, 10, province);
        if (matched.length) lawyerMatch = { topic: guidance.topic, specialties: specs, province, lawyers: matched };
      } catch {
        /* non-fatal */
      }
    }
    return NextResponse.json({ ok: true, mode: "guide", source: "local", guidance, sources: [], lawyerMatch: await localizeMatch(lawyerMatch, lang) });
  } catch {
    return NextResponse.json({ ok: false, error: "پاسخ‌گویی در حال حاضر ممکن نیست." }, { status: 503 });
  }
}
