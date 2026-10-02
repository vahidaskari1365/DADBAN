import { NextResponse } from "next/server";
import { analyzeLegalQuery, analyzeContract } from "@/lib/legal-engine";
import { askLLM, SYSTEM_LEGAL } from "@/lib/llm";
import { webSearch, type WebSearchResult } from "@/lib/ai";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { detectSpecialtiesFromMessage, matchLawyers, TOPIC_SPECIALTIES, type MatchedLawyer } from "@/lib/lawyer-match";

export const runtime = "nodejs";

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
  const body = await readJson(req, 16_384);
  const limited = rateLimit(req, "ai", 15, 60 * 60_000);
  if (limited) return limited;

  const contract = text(body?.contract, 6000);
  const query = text(body?.query, 3000);
  const mode = body?.mode;
  const useWeb = body?.webSearch === true;

  try {
    if (mode === "contract" || contract) {
      if (!contract) return NextResponse.json({ ok: false, error: "متن قرارداد معتبر نیست." }, { status: 400 });
      const llm = await withTimeout(askLLM([{ role: "user", content: `${CONTRACT_PROMPT}${contract}` }], 700), 20_000);
      if (llm) return NextResponse.json({ ok: true, mode: "contract", source: "llm", analysis: llm });
      return NextResponse.json({ ok: true, mode: "contract", source: "local", ...analyzeContract(contract) });
    }

    if (!query) return NextResponse.json({ ok: false, error: "لطفاً سؤال خود را بنویسید." }, { status: 400 });

    // حالت جستجوی وب: ابتدا نتایج واقعی گرفته و به زمینه‌ی مدل تزریق می‌شود
    let sources: { title: string; url: string; host: string; snippet: string }[] = [];
    let systemPrompt = undefined;
    if (useWeb) {
      try {
        const results = await withTimeout(webSearch(query, 6), 12_000);
        if (results.length) {
          sources = results.map((r) => ({ title: r.name, url: r.url, host: r.host_name, snippet: r.snippet }));
          systemPrompt = systemWithSources(results);
        }
      } catch {
        /* جستجو شکست خورد → پاسخ بدون وب */
      }
    }

    const llm = await withTimeout(askLLM([{ role: "user", content: query }], 700, systemPrompt), 25_000);

    // پیشنهاد وکیل بر اساس مشکل کاربر (۱۰ وکیل هم‌تخصص از دیتابیس واقعی)
    let lawyerMatch: { topic: string | null; specialties: string[]; lawyers: MatchedLawyer[] } | undefined;
    try {
      const det = detectSpecialtiesFromMessage(query);
      if (det.specialties.length > 0) {
        const matched = await matchLawyers(det.specialties, 10);
        if (matched.length) lawyerMatch = { topic: det.topic, specialties: det.specialties, lawyers: matched };
      }
    } catch {
      /* non-fatal */
    }

    if (llm) return NextResponse.json({ ok: true, mode: "guide", source: "llm", answer: llm, sources, lawyerMatch });
    const guidance = analyzeLegalQuery(query);
    if (!lawyerMatch && guidance.matched && TOPIC_SPECIALTIES[guidance.topic]) {
      try {
        const specs = TOPIC_SPECIALTIES[guidance.topic];
        const matched = await matchLawyers(specs, 10);
        if (matched.length) lawyerMatch = { topic: guidance.topic, specialties: specs, lawyers: matched };
      } catch {
        /* non-fatal */
      }
    }
    return NextResponse.json({ ok: true, mode: "guide", source: "local", guidance, sources: [], lawyerMatch });
  } catch {
    return NextResponse.json({ ok: false, error: "پاسخ‌گویی در حال حاضر ممکن نیست." }, { status: 503 });
  }
}
