// Deterministic, explainable recommendation engine (QuickStart → Next Best Action).
// No AI required: maps (topic, stage, city) to THREE actionable paths,
// transparent reasons and pre-filled funnel context for the case form.

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

/** افزودن زمینه‌ی فانل (موضوع/مرحله/استان) به هر لینک — برای prefill فرم پرونده */
const withFunnelParams = (href: string, input: { topic: string; stage: string; city: string }): string => {
  const params = new URLSearchParams();
  params.set("topic", input.topic);
  params.set("stage", input.stage);
  if (input.city) params.set("province", input.city);
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${params.toString()}`;
};

export interface FunnelOption extends RecommendationOption {
  key: HelpType;
}

export interface FunnelRecommendation {
  specialty: string | null;
  reasons: string[];
  nextStep: string;
  /** سه مسیر: استخدام وکیل / مشاوره / تنظیم سند */
  options: FunnelOption[];
}

/**
 * پیشنهاد پس از انتخاب موضوع + مرحله + استان — سه گزینه‌ی نهایی.
 * استفاده در فانل هیرو و ویزارد «شروع مسیر من».
 */
export function buildFunnelOptions(input: { topic: string; stage: string; city: string }): FunnelRecommendation {
  const { topic, stage, city } = input;
  const specialty = TOPIC_SPECIALTY[topic] ?? null;
  const inCourt = COURT_STAGES.has(stage);

  const reasons: string[] = [];
  if (topic) reasons.push(`موضوع شما (${topic}) در حوزه «${specialty ?? "عمومی"}» قرار می‌گیرد.`);
  if (stage) reasons.push(`پرونده در مرحله «${stage}» است.`);
  if (city) reasons.push(`استان شما: ${city}.`);
  if (inCourt) reasons.push("در این مرحله، حضور وکیل متخصص معمولاً تعیین‌کننده است.");

  const lawyerOption: FunnelOption = {
    key: "lawyer",
    title: specialty ? `استخدام وکیل متخصص ${specialty}` : "استخدام وکیل متخصص",
    desc: city
      ? `وکلای تأییدشده ${specialty ?? ""} در ${city} را ببینید و درخواست وکالت ثبت کنید.`
      : "از میان وکلای تأییدشده با پروانه معتبر، وکیل پرونده‌تان را انتخاب کنید.",
    href: withFunnelParams(lawyersHref(specialty, city), input),
    icon: "user",
  };

  const consultOption: FunnelOption = {
    key: "consult",
    title: specialty ? `مشاوره با وکیل متخصص ${specialty}` : "مشاوره حقوقی با وکیل",
    desc: "در یک جلسه کوتاه، مسیر قانونی، هزینه‌ها و ریسک‌های پرونده شما روشن می‌شود.",
    href: withFunnelParams("/consultation", input),
    icon: "chat",
  };

  const docOption: FunnelOption = {
    key: "doc",
    title: "تنظیم سند و قرارداد",
    desc: "قرارداد، دادخواست یا شکواییه خود را گام‌به‌گام بسازید یا با هوش مصنوعی بررسی کنید.",
    href: withFunnelParams("/contracts", input),
    icon: "document",
  };

  return {
    specialty,
    reasons,
    nextStep: inCourt
      ? "پرونده شما در مرحله دادرسی است — پیشنهاد ما شروع با وکیل متخصص است."
      : "یکی از مسیرهای زیر را انتخاب کنید؛ انتخاب‌های شما ذخیره می‌شود تا فرم‌ها خودکار پر شوند.",
    options: [lawyerOption, consultOption, docOption],
  };
}

/** ذخیره‌ی انتخاب‌های فانل — فرم «ثبت پرونده» با همین اطلاعات خودکار پر می‌شود. */
export function saveFunnelSelections(input: { topic: string; stage: string; province: string }): void {
  try {
    window.localStorage.setItem("dadban_funnel", JSON.stringify({ ...input, at: Date.now() }));
  } catch {
    /* حافظه محلی در دسترس نیست */
  }
}
