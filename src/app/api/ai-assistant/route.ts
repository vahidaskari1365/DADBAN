import { NextResponse } from "next/server";
import { analyzeLegalQuery, analyzeContract } from "@/lib/legal-engine";
import { askLLM, SYSTEM_LEGAL } from "@/lib/llm";
import { webSearch, type WebSearchResult } from "@/lib/ai";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { extractContractFile } from "@/lib/extract-text";
import { detectSpecialtiesFromMessage, detectProvinceFromMessage, matchLawyers, TOPIC_SPECIALTIES, type MatchedLawyer } from "@/lib/lawyer-match";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel fluid — بودجه کافی برای OCR عکس + زنجیره fallback

const withTimeout = <T,>(task: Promise<T>, ms: number) =>
  Promise.race<T>([task, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);

const CONTRACT_PROMPT = `قرارداد زیر را تحلیل کن و نقاط ضعف، ریسک‌ها و بندهای مهم آن را به فارسی فهرست کن.
در تحلیل خود به مواد قانونی مرتبط هم استناد کن (مانند مواد ۱۰، ۲۱۹ و ۲۳۰ قانون مدنی) و شماره ماده و تبصره را ذکر کن:

`;

/** ساخت پرامپت سیستمی با زمینه‌ی نتایج جستجوی وب (RAG ساده). */
function systemWithSources(sources: WebSearchResult[]): string {
  const context = sources
    .slice(0, 6)
    .map((s, i) => `[${i + 1}] ${s.name}\n${s.snippet}\nمنبع: ${s.url}`)
    .join("\n\n");
  return `${SYSTEM_LEGAL}

اگر نتایج جستجوی وب زیر به سؤال مرتبط است، از آن‌ها استفاده کن و در پایان پاسخ، منابع مرتبط را با شماره [۱] و [۲] ذکر کن. اگر نتیجه‌ای مرتبط نیست، نادیده‌اش بگیر:

${context}`;
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "ai", 15, 60 * 60_000);
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
    let systemPrompt = undefined;
    if (useWeb) {
      try {
        const results = await withTimeout(webSearch(query, 6), 25_000);
        if (results.length) {
          sources = results.map((r) => ({ title: r.name, url: r.url, host: r.host_name, snippet: r.snippet }));
          systemPrompt = systemWithSources(results);
        }
      } catch {
        /* جستجو شکست خورد → پاسخ بدون وب */
      }
    }

    const llm = await withTimeout(askLLM([{ role: "user", content: query }], 700, systemPrompt), 27_000);

    // پیشنهاد وکیل بر اساس مشکل کاربر (۱۰ وکیل هم‌تخصص از دیتابیس واقعی)
    let lawyerMatch: { topic: string | null; specialties: string[]; province: string | null; lawyers: MatchedLawyer[] } | undefined;
    try {
      const det = detectSpecialtiesFromMessage(query);
      if (det.specialties.length > 0) {
        const matched = await matchLawyers(det.specialties, 10, province);
        if (matched.length) lawyerMatch = { topic: det.topic, specialties: det.specialties, province, lawyers: matched };
      }
    } catch {
      /* non-fatal */
    }

    if (llm) return NextResponse.json({ ok: true, mode: "guide", source: "llm", answer: llm, sources, lawyerMatch });
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
    return NextResponse.json({ ok: true, mode: "guide", source: "local", guidance, sources: [], lawyerMatch });
  } catch {
    return NextResponse.json({ ok: false, error: "پاسخ‌گویی در حال حاضر ممکن نیست." }, { status: 503 });
  }
}
