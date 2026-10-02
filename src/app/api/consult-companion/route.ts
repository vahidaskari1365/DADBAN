import { NextResponse } from "next/server";
import { askLLM } from "@/lib/llm";
import { rateLimit } from "@/lib/api-security";
import { logger } from "@/lib/logger";
import { detectSpecialtiesFromMessage, hasLawyerIntent, matchLawyers, type MatchedLawyer } from "@/lib/lawyer-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `تو «مشاور همراه دادبان» هستی — یک دستیار حقوقی هوشمند و دوست‌داشتنی که هم به سوالات حقوقی پاسخ می‌ده و هم در استفاده از سایت به کاربر کمک می‌کند.

ویژگی‌های شخصیت تو:
- لحن دوستانه، گرم و حرفه‌ای — مثل یک دوست وکیل
- پاسخ‌های مختصر و کاربردی (۳-۸ خط)
- همیشه فارسی روان صحبت کن
- اگه نمی‌دونی، صادقانه بگو

اطلاعات سایت که می‌توانی به کاربر معرفی کنی:
- /lawyers — جستجوی وکیل متخصص (بر اساس تخصص و شهر)
- /consultation — رزرو مشاوره متنی/صوتی/تصویری با وکیل
- /case/new — ثبت پرونده حقوقی
- /contracts — تنظیم و بررسی قرارداد
- /contracts/builder — ساخت قرارداد اختصاصی
- /contracts/review — بررسی قرارداد موجود
- /ai-assistant — دستیار حقوقی هوش مصنوعی (پاسخ با استناد به قانون)
- /services — خدمات پیگیری و انجام امور
- /services/category/family — خدمات خانواده (طلاق، مهریه، حضانت، نفقه، ارث)
- /services/category/property — خدمات ملکی (تخلیه، تصرف عدوانی، اجاره)
- /services/category/criminal — خدمات کیفری
- /services/category/commercial — خدمات تجاری
- /services/category/administrative — خدمات کار و مالیات
- /knowledge — مقالات حقوقی
- /qa — پرسش و پاسخ حقوقی
- /laws — مرکز قوانین ایران
- /judgments — آرای قضایی
- /glossary — واژه‌نامه حقوقی
- /pricing — تعرفه خدمات
- /business — خدمات کسب‌وکار
- /support — پشتیبانی
- /consultation/live — مشاوره زنده تصویری + متنی

قوانین پاسخ:
۱) اگه کاربر می‌خواد کاری انجام بده (مثلاً «وکیل می‌خوام»، «قرارداد می‌خوام»)، هم راهنمایی کن و هم در انتهای پاسخ، یک خط جداگانه با فرمت [LINK:label|href] لینک صفحه‌ی مربوطه رو معرفی کن.
۲) اگه سوال حقوقی پرسید (مثلاً «مهریه چطور مطالبه می‌شه؟»)، پاسخ کوتاه بده و پیشنهاد کن از /ai-assistant استفاده کنه.
۳) اگه اطلاعات تماس خواست، بگو به /support مراجعه کنه.
۴) در پایان پاسخ‌های طولانی، یک پیشنهاد بعدی بده.

فرمت لینک‌ها: در انتهای پاسخ، اگه می‌خوای لینک معرفی کنی، این فرمت رو استفاده کن:
[LINK:عنوان لینک|/مسیر]

مثال:
برای پیدا کردن وکیل می‌تونی به صفحه‌ی جستجوی وکلا بری:
[LINK:جستجوی وکیل|/lawyers]

یادآوری: تو وکیل رسمی نیستی و نمی‌توانی مشاوره‌ی حقوقی قطعی بدی. در موارد حساس، همیشه کاربر را به مشاوره با وکیل واقعی ارجاع بده.`;

/**
 * استخراج لینک‌ها از پاسخ LLM.
 * فرمت: [LINK:label|href]
 */
function extractLinks(text: string): { cleaned: string; links: { label: string; href: string }[] } {
  const links: { label: string; href: string }[] = [];
  const linkRegex = /\[LINK:([^\]|]+)\|([^\]]+)\]/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    links.push({
      label: match[1].trim(),
      href: match[2].trim(),
    });
  }
  const cleaned = text.replace(linkRegex, "").trim();
  return { cleaned, links };
}

/**
 * مشاور همراه API.
 *
 * POST /api/consult-companion
 * body: { message: string, history?: {role, content}[] }
 */
export async function POST(req: Request) {
  const limited = rateLimit(req, "companion", 30, 60 * 60_000); // ۳۰ پیام در ساعت
  if (limited) return limited;

  try {
    const body = await req.json();
    const { message, history = [] } = body as {
      message?: string;
      history?: { role: string; content: string }[];
    };

    if (!message || typeof message !== "string" || message.length < 2) {
      return NextResponse.json(
        { ok: false, error: "پیام نامعتبر" },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { ok: false, error: "پیام بیش از حد طولانی (حداکثر ۱۰۰۰ کاراکتر)" },
        { status: 400 }
      );
    }

    const log = logger.child({ module: "companion" });

    // تطبیق وکیل: اگر پیام نیت وکیل/مشاوره دارد یا موضوع حقوقی شناسایی شد،
    // ۱۰ وکیل پیشنهادی (بر اساس تخصص واقعی) کنار پاسخ برمی‌گردد.
    const { specialties, topic } = detectSpecialtiesFromMessage(message);
    const wantLawyers = hasLawyerIntent(message) || specialties.length > 0;
    let matched: MatchedLawyer[] = [];
    if (wantLawyers) {
      try {
        matched = await matchLawyers(specialties, 10);
      } catch {
        /* non-fatal — پاسخ بدون پیشنهاد وکیل */
      }
    }

    // ساخت messages برای LLM
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-5).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // timeout 25 ثانیه
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    const llmResponse = await askLLM(messages, 400);
    clearTimeout(timeout);

    if (!llmResponse) {
      // fallback پاسخ‌های آماده بر اساس keywords
      const fallback = getFallbackResponse(message);
      log.warn("LLM failed, using fallback", { message: message.slice(0, 50) });
      return NextResponse.json({
        ok: true,
        answer: fallback.text,
        links: fallback.links,
        source: "fallback",
        lawyerMatch: matched.length ? { topic, specialties, lawyers: matched } : undefined,
      });
    }

    // استخراج لینک‌ها از پاسخ
    const { cleaned, links } = extractLinks(llmResponse);

    log.info("companion response", {
      messageLen: message.length,
      responseLen: cleaned.length,
      linksCount: links.length,
    });

    return NextResponse.json({
      ok: true,
      answer: cleaned,
      links,
      source: "llm",
      lawyerMatch: matched.length ? { topic, specialties, lawyers: matched } : undefined,
    });
  } catch (err) {
    logger.error("companion error", err);
    return NextResponse.json(
      { ok: false, error: "پاسخ‌گویی در حال حاضر ممکن نیست" },
      { status: 500 }
    );
  }
}

/**
 * پاسخ‌های fallback وقتی LLM در دسترس نیست.
 * بر اساس keywords در پیام کاربر، پاسخ آماده برمی‌گردونه.
 */
function getFallbackResponse(message: string): { text: string; links: { label: string; href: string }[] } {
  const msg = message.toLowerCase();

  if (msg.includes("وکیل") || msg.includes("lawyer")) {
    return {
      text: "برای پیدا کردن وکیل متخصص می‌تونی به صفحه‌ی جستجوی وکلا بری. اونجا می‌تونی بر اساس تخصص (خانواده، ملکی، کیفری و...) و شهر فیلتر کنی.",
      links: [{ label: "جستجوی وکیل", href: "/lawyers" }],
    };
  }

  if (msg.includes("مشاوره") || msg.includes("consultation")) {
    return {
      text: "برای رزرو مشاوره آنلاین با وکیل، می‌تونی به صفحه‌ی مشاوره بری. سه نوع مشاوره داریم: متنی، صوتی و تصویری.",
      links: [{ label: "رزرو مشاوره", href: "/consultation" }],
    };
  }

  if (msg.includes("قرارداد") || msg.includes("contract")) {
    return {
      text: "برای تنظیم یا بررسی قرارداد، به صفحه‌ی قراردادها برو. می‌تونی از قالب‌های آماده استفاده کنی یا قرارداد اختصاصی بسازی.",
      links: [
        { label: "کتابخانه قراردادها", href: "/contracts" },
        { label: "ساخت قرارداد", href: "/contracts/builder" },
      ],
    };
  }

  if (msg.includes("پرونده") || msg.includes("case")) {
    return {
      text: "برای ثبت پرونده حقوقی، به صفحه‌ی ثبت پرونده برو. وکلای ما پرونده‌ت رو بررسی می‌کنن.",
      links: [{ label: "ثبت پرونده", href: "/case/new" }],
    };
  }

  if (msg.includes("قانون") || msg.includes("law")) {
    return {
      text: "برای مراجعه به قوانین ایران، به مرکز قوانین برو. هم‌چنین مقالات حقوقی و آرای قضایی هم داریم.",
      links: [
        { label: "مرکز قوانین", href: "/laws" },
        { label: "مقالات حقوقی", href: "/knowledge" },
      ],
    };
  }

  if (msg.includes("هزینه") || msg.includes("price") || msg.includes("تعرفه")) {
    return {
      text: "برای مشاهده‌ی تعرفه خدمات، به صفحه‌ی قیمت‌گذاری برو.",
      links: [{ label: "تعرفه خدمات", href: "/pricing" }],
    };
  }

  if (msg.includes("پشتیبانی") || msg.includes("support") || msg.includes("تماس")) {
    return {
      text: "برای تماس با پشتیبانی، به صفحه‌ی پشتیبانی برو.",
      links: [{ label: "پشتیبانی", href: "/support" }],
    };
  }

  return {
    text: "متأسفم، الان نمی‌تونم پاسخ بدم. ولی می‌تونی به این صفحات بری:\n\n- /lawyers برای جستجوی وکیل\n- /consultation برای رزرو مشاوره\n- /ai-assistant برای سوال حقوقی\n- /support برای پشتیبانی",
    links: [
      { label: "جستجوی وکیل", href: "/lawyers" },
      { label: "مشاوره آنلاین", href: "/consultation" },
      { label: "دستیار AI", href: "/ai-assistant" },
    ],
  };
}
