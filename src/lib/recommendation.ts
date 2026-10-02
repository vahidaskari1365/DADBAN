// Deterministic, explainable recommendation engine (QuickStart → Next Best Action).
// No AI required: maps (topic, stage, city, helpType) to an actionable,
// transparent recommendation plus an alternative and a free option.

import type { IconKey } from "./data";

export type HelpType = "consult" | "lawyer" | "doc";

export interface RecommendationInput {
  topic: string;
  description?: string;
  stage: string;
  city: string;
  help: HelpType;
}

export interface RecommendationOption {
  title: string;
  desc: string;
  href: string;
  icon: IconKey;
}

export interface Recommendation {
  /** پیشنهاد اصلی (Next Best Action) */
  primary: RecommendationOption;
  /** گزینه جایگزین */
  alternative: RecommendationOption;
  /** مسیر بدون هزینه */
  free: RecommendationOption;
  /** تخصص وکیل پیشنهادی (اگر مرتبط باشد) */
  specialty: string | null;
  /** چرا این پیشنهاد؟ — توضیح‌پذیری */
  reasons: string[];
  /** جمله خلاصه اقدام بعدی */
  nextStep: string;
}

/** موضوع → تخصص وکیل مرتبط (هم‌راستا با SPECIALTIES در data.ts) */
const TOPIC_SPECIALTY: Record<string, string> = {
  "طلاق": "خانواده",
  "مهریه": "خانواده",
  "نفقه و حضانت": "خانواده",
  "ارث": "ارث",
  "چک": "چک و اسناد",
  "ملک و اجاره": "ملک",
  "قرارداد": "قراردادها",
  "کیفری": "کیفری",
  "تصرف عدوانی": "ملک",
  "شرکت": "شرکت‌ها",
  "مالیات": "مالیاتی",
  "کار": "کار",
  "سرقفلی": "تجارت",
  "مهاجرت": "مهاجرت",
};

/** مرحله پرونده → انطباق: آیا وکیل ضروری‌تر است؟ */
const COURT_STAGES = new Set(["در دادگاه/دادسراست", "رأی صادر شده", "مرحله اجرا"]);

const lawyersHref = (specialty: string | null, city?: string) => {
  const params = new URLSearchParams();
  if (specialty) params.set("sp", specialty);
  if (city) params.set("city", city);
  const qs = params.toString();
  return `/lawyers${qs ? `?${qs}` : ""}`;
};

export function buildRecommendation(input: RecommendationInput): Recommendation {
  const { topic, stage, city, help } = input;
  const specialty = TOPIC_SPECIALTY[topic] ?? null;
  const inCourt = COURT_STAGES.has(stage);

  const reasons: string[] = [];
  if (topic) reasons.push(`موضوع شما (${topic}) در حوزه «${specialty ?? "عمومی"}» قرار می‌گیرد.`);
  if (stage) reasons.push(`پرونده در مرحله «${stage}» است.`);
  if (city) reasons.push(`شهر شما: ${city}.`);
  if (inCourt) reasons.push("در این مرحله، حضور وکیل متخصص معمولاً تعیین‌کننده است.");

  const q = encodeURIComponent(topic ? `مشکل ${topic} (مرحله: ${stage})` : "مشکل حقوقی");

  // خروجی بر اساس نوع کمک درخواستی
  let primary: RecommendationOption;
  let alternative: RecommendationOption;
  let nextStep: string;

  if (help === "doc") {
    primary = {
      title: "تنظیم سند حقوقی با قراردادساز",
      desc: "قرارداد، دادخواست یا شکواییه خود را گام‌به‌گام بسازید و برای بازبینی نهایی به وکیل بسپارید.",
      href: "/contracts",
      icon: "document",
    };
    alternative = {
      title: "بررسی و بازبینی توسط وکیل متخصص",
      desc: "سند فعلی‌تان را تحلیل کنید و بندهای پرریسک را شناسایی کنید.",
      href: "/contracts/review",
      icon: "file",
    };
    nextStep = "قدم بعدی پیشنهادی: ساخت یا بررسی سند موردنیاز شما.";
  } else if (help === "lawyer" || inCourt) {
    primary = {
      title: specialty ? `پیدا کردن وکیل متخصص ${specialty}` : "پیدا کردن وکیل متخصص",
      desc: city
        ? `وکلای تأییدشده ${specialty ?? ""} در ${city} را ببینید و مشاوره رزرو کنید.`
        : "از میان وکلای تأییدشده با پروانه معتبر انتخاب کنید.",
      href: lawyersHref(specialty, city),
      icon: "user",
    };
    alternative = {
      title: "ثبت پرونده و معرفی وکیل",
      desc: "پرونده را ثبت کنید تا کارشناسان دادبان، وکیل مناسب را معرفی کنند.",
      href: "/case/new",
      icon: "folder",
    };
    nextStep = "قدم بعدی پیشنهادی: رزرو مشاوره ۳۰ دقیقه‌ای با وکیل متخصص.";
  } else {
    // مشاوره و راهنمایی
    primary = {
      title: specialty ? `مشاوره با وکیل متخصص ${specialty}` : "مشاوره با وکیل متخصص",
      desc: "در یک جلسه کوتاه، مسیر قانونی، هزینه‌ها و ریسک‌های پرونده شما روشن می‌شود.",
      href: "/consultation",
      icon: "chat",
    };
    alternative = {
      title: specialty ? `مشاهده وکلای متخصص ${specialty}` : "مشاهده وکلای متخصص",
      desc: "پروفایل، تعرفه و نظرات وکلا را مقایسه و مستقیم انتخاب کنید.",
      href: lawyersHref(specialty, city),
      icon: "search",
    };
    nextStep = "قدم بعدی پیشنهادی: رزرو مشاوره برای شفاف شدن مسیر.";
  }

  const freeDescription =
    help === "doc"
      ? "پاسخ اولیه و نکات مهم درباره سند موردنظر را از دستیار حقوقی بگیرید."
      : "مراحل، مدارک لازم و ریسک‌ها را بدون هزینه مرور کنید؛ پاسخ‌ها راهنمای اولیه‌اند.";

  return {
    primary,
    alternative,
    free: {
      title: "راهنمای رایگان با دستیار حقوقی",
      desc: freeDescription,
      href: `/ai-assistant?q=${q}`,
      icon: "sparkles",
    },
    specialty,
    reasons,
    nextStep,
  };
}
