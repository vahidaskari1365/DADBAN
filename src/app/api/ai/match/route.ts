import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers, cases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { askLLM } from "@/lib/llm";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * موتور تطبیق هوشمند دادپیو (#23)
 * POST /api/ai/match  { description, city?, budget? }
 *   → دسته‌بندی پرونده + درصد اطمینان + تخمین هزینه/مدت + وکلای پیشنهادی با امتیاز تطبیق
 * GET /api/ai/match?caseId=123 → تحلیل ذخیره‌شدهٔ پرونده
 *
 * استراتژی: اول تطبیق قطعی بر اساس تخصص وکلا (قابل‌اعتماد)،
 * سپس تحلیل متن با LLM برای دسته‌بندی و تخمین؛ در صورت خطای LLM، fallback قطعی کار می‌کند.
 */

const SPECIALTIES = [
  "خانواده", "ملک", "کیفری", "قراردادها", "چک و اسناد", "تجارت", "شرکت‌ها",
  "مالیاتی", "ارث", "کار", "مهاجرت", "عمومی",
];

type Analysis = {
  category: string;
  confidence: number;
  durationMonths: number;
  feeRange: string;
  urgency: "low" | "normal" | "high";
  summary: string;
  checklist: string[];
};

function heuristicAnalysis(description: string): Analysis {
  const d = description;
  const has = (...k: string[]) => k.some((x) => d.includes(x));
  let category = "عمومی";
  if (has("طلاق", "مهریه", "نفقه", "حضانت", "ازدواج", "اجرت‌المثل")) category = "خانواده";
  else if (has("ملک", "سند", "تخلیه", "اجاره", "تصرف", "خلع ید", "زمین", "آپارتمان")) category = "ملک";
  else if (has("کلاهبرداری", "سرقت", "ضرب", "جرح", "خیانت در امانت", "شکایت کیفری", "دیه", "جعل")) category = "کیفری";
  else if (has("چک", "سفته", "برگشت", "وصول")) category = "چک و اسناد";
  else if (has("قرارداد", "پیش‌فروش", "مشارکت", "پیمانکاری")) category = "قراردادها";
  else if (has("ارث", "ترکه", "انحصار وراثت", "وصیت")) category = "ارث";
  else if (has("مالیات", "گمرک", "اعتراض مالیاتی")) category = "مالیاتی";
  else if (has("اخراج", "اداره کار", "سنوات", "دستمزد", "کارفرما")) category = "کار";
  else if (has("شرکت", "ثبت برند", "علامت تجاری", "سهام", "مجمع")) category = "شرکت‌ها";

  const confidence = Math.min(94, 60 + Math.floor(d.length / 40) * 5 + (category !== "عمومی" ? 14 : 0));
  return {
    category,
    confidence,
    durationMonths: category === "کیفری" ? 8 : category === "ملکی" ? 5 : 3,
    feeRange:
      category === "کیفری" ? "۱۵۰ تا ۳۰۰ میلیون تومان"
        : category === "ملکی" ? "۸۰ تا ۱۵۰ میلیون تومان"
          : "۵۰ تا ۱۲۰ میلیون تومان",
    urgency: has("فوری", "اضطراری", "مهلت", "جلسه") ? "high" : "normal",
    summary: `بر اساس شرح پرونده، موضوع در حوزه «${category}» دسته‌بندی می‌شود.`,
    checklist: ["تشخیص نوع دعوا", "تخصص موردنیاز", "بررسی قبولیت اولیه", "تخمین هزینه و مدت", "معرفی وکلای مجرب"],
  };
}

function parseLlmJson(raw: string | null): Partial<Analysis> | null {
  if (!raw) return null;
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    if (typeof j !== "object" || !j) return null;
    return j as Partial<Analysis>;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "ai-match", 12, 60 * 60_000);
  if (limited) return limited;

  const body = (await readJson(req, 12_000)) as
    | { description?: string; city?: string; budget?: string }
    | null;
  const description = text(body?.description, 3000);
  if (!description) {
    return NextResponse.json({ ok: false, error: "شرح پرونده الزامی است" }, { status: 422 });
  }
  const city = text(body?.city, 60) ?? "";

  /* ۱) تحلیل پایه (قطعی — همیشه در دسترس) */
  const base = heuristicAnalysis(description);

  /* ۲) غنی‌سازی با LLM (در صورت در دسترس بودن) */
  let llm: Partial<Analysis> | null = null;
  try {
    const raw = await askLLM(
      [
        {
          role: "user",
          content: `یک پرونده حقوقی ایرانی را تحلیل کن و «فقط» JSON فارسی برگردان:
{"category":"یکی از: ${SPECIALTIES.slice(0, 11).join("، ")}","confidence":عدد ۰ تا ۱۰۰,"durationMonths":عدد,"feeRange":"بازه تومانی واقع‌بینانه","urgency":"low|normal|high","summary":"یک جمله","checklist":["حداکثر ۵ مورد"]}
شرح پرونده: ${description}
${city ? `شهر: ${city}` : ""}`,
        },
      ],
      500,
      "تو دستیار تحلیل پرونده پلتفرم دادپیو هستی؛ خروجی فقط JSON باشد، بدون توضیح اضافه."
    );
    llm = parseLlmJson(raw);
  } catch {
    /* LLM optional */
  }

  const analysis: Analysis = {
    category:
      llm?.category && SPECIALTIES.some((s) => String(llm!.category).includes(s))
        ? String(llm!.category)
        : base.category,
    confidence: typeof llm?.confidence === "number" ? Math.min(99, Math.max(40, Math.round(llm.confidence))) : base.confidence,
    durationMonths: typeof llm?.durationMonths === "number" ? Math.min(24, Math.max(1, Math.round(llm.durationMonths))) : base.durationMonths,
    feeRange: typeof llm?.feeRange === "string" && llm.feeRange.length < 80 ? llm.feeRange : base.feeRange,
    urgency: llm?.urgency === "high" || llm?.urgency === "low" ? llm.urgency : base.urgency,
    summary: typeof llm?.summary === "string" && llm.summary.length < 300 ? llm.summary : base.summary,
    checklist: base.checklist,
  };

  /* ۳) تطبیق وکلا: تخصص + امتیاز + سابقه (قطعی) */
  let matched: unknown[] = [];
  try {
    const rows = (await db.select().from(lawyers).limit(60)) as unknown as Record<string, unknown>[];
    const list = Array.isArray(rows) ? rows : ((rows as { rows?: Record<string, unknown>[] }).rows ?? []);
    const cat = analysis.category;
    matched = list
      .map((l) => {
        const specs = String(l.specialties ?? "");
        const name = String(l.name ?? "");
        const lRating = Number(l.rating ?? 0);
        const exp = Number(l.experienceYears ?? 0);
        let score = 55;
        if (specs.includes(cat) || name.includes(cat)) score += 30;
        score += Math.round(lRating * 2);
        score += Math.min(8, Math.floor(exp / 3));
        if (String(l.city ?? "") === city) score += 3;
        return {
          id: Number(l.id ?? 0),
          slug: String(l.slug ?? ""),
          name,
          title: String(l.title ?? "وکیل پایه یک دادگستری"),
          city: String(l.city ?? ""),
          rating: lRating,
          reviewCount: Number(l.reviewCount ?? 0),
          experienceYears: exp,
          specialties: specs,
          matchScore: Math.min(99, score),
        };
      })
      .filter((l) => l.matchScore >= 60)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
  } catch {
    /* degraded mode */
  }

  return NextResponse.json({
    ok: true,
    analysis,
    lawyers: matched,
    disclaimer: "تحلیل اولیه صرفاً راهنماست و جایگزین مشاوره با وکیل نیست.",
  });
}

/** ذخیرهٔ نتیجهٔ تحلیل روی پرونده (هنگام ثبت پرونده از ویزارد صدا زده می‌شود) */
export async function PUT(req: Request) {
  const limited = rateLimit(req, "ai-match-save", 20, 60 * 60_000);
  if (limited) return limited;
  const body = (await readJson(req, 4_000)) as
    | { caseId?: number; category?: string; confidence?: number; estimate?: string }
    | null;
  const caseId = Number(body?.caseId ?? 0);
  if (!caseId) return NextResponse.json({ ok: false, error: "caseId الزامی است" }, { status: 422 });
  try {
    await db
      .update(cases)
      .set({
        aiCategory: text(body?.category, 40) ?? "",
        aiConfidence: Math.min(99, Math.max(0, Number(body?.confidence ?? 0))),
        aiEstimate: text(body?.estimate, 120) ?? "",
      })
      .where(eq(cases.id, caseId));
    return NextResponse.json({ ok: true });
  } catch {
    return publicError();
  }
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "ai-match-get", 60, 60 * 60_000);
  if (limited) return limited;
  const url = new URL(req.url);
  const caseId = Number(url.searchParams.get("caseId") ?? 0);
  if (!caseId) return NextResponse.json({ ok: false, error: "caseId الزامی است" }, { status: 422 });
  try {
    const rows = (await db.select().from(cases).where(eq(cases.id, caseId)).limit(1)) as unknown as {
      rows?: Record<string, unknown>[];
    };
    const list = rows.rows ?? (rows as unknown as Record<string, unknown>[]);
    const c = list[0];
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد" }, { status: 404 });
    const pick = (k1: string, k2: string) => (c[k1] !== undefined && c[k1] !== "" ? c[k1] : c[k2]);
    return NextResponse.json({
      ok: true,
      analysis: {
        category: pick("ai_category", "aiCategory") ?? "",
        confidence: pick("ai_confidence", "aiConfidence") ?? 0,
        estimate: pick("ai_estimate", "aiEstimate") ?? "",
      },
    });
  } catch {
    return publicError();
  }
}
