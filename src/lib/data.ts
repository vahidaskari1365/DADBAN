// Central static data for the Dadban legal platform.
// (Persian content, RTL)

export type IconKey =
  | "search" | "calendar" | "video" | "folder" | "file" | "gavel" | "mail"
  | "stamp" | "family" | "home" | "shield" | "building" | "truck" | "calculator"
  | "book" | "balance" | "lock" | "chat" | "phone" | "user" | "sparkles"
  | "check" | "clock" | "star" | "badge" | "bolt" | "document" | "landmark"
  | "money" | "alert" | "scale" | "briefcase" | "id" | "arrow" | "chevron" | "plus" | "filter" | "x" | "send" | "menu" | "location";

/* ---------------- Legal topics (hero selector) ---------------- */
export const LEGAL_TOPICS: { label: string; icon: IconKey; hint: string }[] = [
  { label: "طلاق", icon: "family", hint: "طلاق توافقی، یک‌طرفه، خلع" },
  { label: "مهریه", icon: "balance", hint: "مطالبه و اجرای مهریه" },
  { label: "نفقه و حضانت", icon: "family", hint: "نفقه زن و فرزندان" },
  { label: "ارث", icon: "scale", hint: "تقسیم ترکه و انحصار وراثت" },
  { label: "چک", icon: "money", hint: "چک برگشتی و مطالبه" },
  { label: "ملک و اجاره", icon: "home", hint: "تخلیه، الزام به تنظیم سند" },
  { label: "قرارداد", icon: "document", hint: "تنظیم و بررسی قرارداد" },
  { label: "کیفری", icon: "shield", hint: "سرقت، کلاهبرداری، خیانت در امانت" },
  { label: "تصرف عدوانی", icon: "home", hint: "ردّ تصرف و خلع ید" },
  { label: "شرکت", icon: "building", hint: "ثبت و تغییرات شرکت" },
  { label: "مالیات", icon: "calculator", hint: "مالیات و مالیات حقوقی" },
  { label: "کار", icon: "briefcase", hint: "حقوق کارگر و کارفرما" },
  { label: "سرقفلی", icon: "truck", hint: "حقوق تجاری و سرقفلی" },
  { label: "مهاجرت", icon: "id", hint: "وکالت و امور مهاجرتی" },
];

/* ---------------- Services (quick-access grid) ---------------- */
export const SERVICES: {
  title: string;
  desc: string;
  icon: IconKey;
  href: string;
  accent?: boolean;
}[] = [
  { title: "جستجوی وکیل", desc: "وکیل متخصص را بر اساس تخصص و شهر پیدا کنید", icon: "search", href: "/lawyers", accent: true },
  { title: "رزرو مشاوره", desc: "مشاوره متنی، صوتی یا تصویری با وکیل", icon: "calendar", href: "/consultation" },
  { title: "مشاوره آنلاین", desc: "همین حالا سؤال حقوقی خود را بپرسید", icon: "chat", href: "/ai-assistant" },
  { title: "بررسی پرونده", desc: "پرونده خود را ثبت و ارزیابی اولیه بگیرید", icon: "folder", href: "/case/new" },
  { title: "تنظیم قرارداد", desc: "قراردادهای آماده و اختصاصی", icon: "file", href: "/contracts" },
  { title: "تنظیم دادخواست و شکواییه", desc: "تهیه تخصصی دادخواست و شکواییه", icon: "gavel", href: "/contracts?cat=دادخواست" },
  { title: "نگارش اظهارنامه", desc: "تنظیم اظهارنامه حقوقی", icon: "mail", href: "/contracts?cat=اظهارنامه" },
  { title: "خدمات ثبتی", desc: "ثبت شرکت، برند و علامت تجاری", icon: "stamp", href: "/pricing" },
  { title: "خدمات خانواده", desc: "طلاق، مهریه، نفقه و حضانت", icon: "family", href: "/lawyers?sp=خانواده" },
  { title: "خدمات ملکی", desc: "تخلیه، الزام به تنظیم سند، افراز", icon: "home", href: "/lawyers?sp=ملک" },
  { title: "خدمات کیفری", desc: "جرایم و دفاع کیفری", icon: "shield", href: "/lawyers?sp=کیفری" },
  { title: "خدمات شرکت‌ها", desc: "حقوق کسب‌وکار و قراردادهای B2B", icon: "building", href: "/pricing" },
  { title: "پیگیری پرونده", desc: "مدیریت و پیگیری پرونده‌های فعال", icon: "folder", href: "/dashboard/client" },
  { title: "محاسبه هزینه‌ها", desc: "برآورد هزینه‌های دادرسی و خدمات", icon: "calculator", href: "/pricing" },
  { title: "مقالات و آموزش", desc: "بانک دانش و آموزش حقوقی", icon: "book", href: "/knowledge" },
];

/* ---------------- Specialties ---------------- */
export const SPECIALTIES: string[] = [
  "خانواده", "ملک", "کیفری", "قراردادها", "تجارت", "شرکت‌ها",
  "کار", "مالیاتی", "ارث", "چک و اسناد", "ثبت برند", "مهاجرت",
];

/* ---------------- Provinces & Cities ---------------- */
export const LOCATIONS: { province: string; cities: string[] }[] = [
  { province: "تهران", cities: ["تهران", "اسلام‌شهر", "شهریار", "ورامین", "پاکدشت", "ری"] },
  { province: "اصفهان", cities: ["اصفهان", "کاشان", "نجف‌آباد", "خمینی‌شهر", "شاهین‌شهر"] },
  { province: "خراسان رضوی", cities: ["مشهد", "نیشابور", "تربت", "سبزوار", "قوچان"] },
  { province: "فارس", cities: ["شیراز", "مرودشت", "کازرون", "جهرم", "فسا"] },
  { province: "آذربایجان شرقی", cities: ["تبریز", "مراغه", "میانه", "اهر", "بناب"] },
  { province: "گیلان", cities: ["رشت", "بندر انزلی", "لاهیجان", "آستارا", "صومعه‌سرا"] },
  { province: "خوزستان", cities: ["اهواز", "آبادان", "خرمشهر", "دزفول", "ماهشهر"] },
  { province: "البرز", cities: ["کرج", "فردیس", "نظرآباد", "اشتهارد", "هشتگرد"] },
  { province: "قم", cities: ["قم", "قنوات", "کهک", "جعفریه"] },
  { province: "مازندران", cities: ["ساری", "بابل", "آمل", "قائم‌شهر", "نوشهر"] },
];

export const ALL_PROVINCES = LOCATIONS.map((l) => l.province);
export const ALL_CITIES = Array.from(
  new Set(LOCATIONS.flatMap((l) => l.cities)),
).sort();

/* ---------------- Consultation durations ---------------- */
export const CONSULTATION_TYPES: {
  key: "chat" | "voice" | "video";
  title: string;
  desc: string;
  icon: IconKey;
}[] = [
  { key: "chat", title: "مشاوره متنی", desc: "سؤال بنویسید، پاسخ مکتوب بگیرید", icon: "chat" },
  { key: "voice", title: "مشاوره صوتی", desc: "تماس تلفنی با وکیل", icon: "phone" },
  { key: "video", title: "مشاوره تصویری", desc: "جلسه ویدئویی داخل پلتفرم", icon: "video" },
];

/* ---------------- Trust badges ----------------
   Only claims the platform can actually honour today. Nothing here may
   promise something there is no backend for (no fake ratings / guarantees). */
export const TRUST_BADGES: { title: string; desc: string; icon: IconKey }[] = [
  { title: "احراز هویت و تأیید پروانه", desc: "هویت و پروانه همه وکلا توسط کارشناسان دادبان راستی‌آزمایی می‌شود.", icon: "badge" },
  { title: "محرمانگی اطلاعات", desc: "اطلاعات شما محرمانه نگه‌داری می‌شود و طبق سیاست حریم خصوصی در اختیار غیر قرار نمی‌گیرد.", icon: "lock" },
  { title: "بازگشت وجه طبق سیاست شفاف", desc: "اگر خدمتی ارائه نشود، وجه شما طبق سیاست بازگشت وجه عودت داده می‌شود.", icon: "shield" },
  { title: "حل اختلاف شفاف", desc: "تیم پشتیبانی در صورت بروز اختلاف، رسیدگی بی‌طرفانه انجام می‌دهد.", icon: "balance" },
];

/* ---------------- Main navigation ---------------- */
export const NAV: {
  label: string;
  href: string;
  /** Highlights this tab as the AI assistant (special accent styling). */
  ai?: boolean;
  children?: { label: string; href: string; desc?: string }[];
}[] = [
  {
    label: "خدمات حقوقی",
    href: "/services",
    children: [
      { label: "مشاوره حقوقی", href: "/consultation", desc: "متنی، صوتی و تصویری" },
      { label: "ثبت پرونده و درخواست وکیل", href: "/case/new", desc: "معرفی وکیل توسط کارشناسان" },
      { label: "تنظیم قرارداد", href: "/contracts/builder", desc: "قراردادساز گام‌به‌گام" },
      { label: "تنظیم دادخواست و شکواییه", href: "/legal-forms", desc: "فرم‌های حقوقی آماده" },
      { label: "بررسی قرارداد", href: "/contracts/review", desc: "تحلیل بندهای پرریسک" },
      { label: "خدمات ثبتی", href: "/pricing", desc: "ثبت شرکت و برند" },
    ],
  },
  {
    label: "وکیل‌یابی",
    href: "/lawyers",
    children: [
      { label: "همه وکلا", href: "/lawyers", desc: "جستجو با فیلتر پیشرفته" },
      { label: "وکلای خانواده", href: "/lawyers?sp=خانواده", desc: "طلاق، مهریه، حضانت" },
      { label: "وکلای ملکی", href: "/lawyers?sp=ملک", desc: "تخلیه، سند، تصرف" },
      { label: "وکلای کیفری", href: "/lawyers?sp=کیفری", desc: "دفاع کیفری" },
      { label: "وکلا بر اساس شهر", href: "/lawyers#cities", desc: "وکلای شهر شما" },
    ],
  },
  {
    label: "ابزارها",
    href: "/ai-assistant",
    children: [
      { label: "دستیار حقوقی", href: "/ai-assistant", desc: "راهنمای حقوقی هوشمند" },
      { label: "تحلیل قرارداد", href: "/contracts/review", desc: "بندهای پرریسک" },
      { label: "قراردادساز", href: "/contracts/builder", desc: "ساخت قرارداد گام‌به‌گام" },
      { label: "فرم‌های حقوقی", href: "/legal-forms", desc: "دادخواست، شکواییه، اظهارنامه" },
    ],
  },
  {
    label: "دانش حقوقی",
    href: "/knowledge",
    children: [
      { label: "مقالات", href: "/knowledge", desc: "بانک مقالات حقوقی" },
      { label: "قوانین", href: "/laws", desc: "مرکز قوانین" },
      { label: "آرای قضایی", href: "/judgments", desc: "رویه قضایی" },
      { label: "پرسش و پاسخ", href: "/qa", desc: "پاسخ وکلای متخصص" },
      { label: "واژه‌نامه حقوقی", href: "/glossary", desc: "اصطلاحات حقوقی" },
    ],
  },
  { label: "برای کسب‌وکارها", href: "/business" },
  { label: "پیگیری پرونده", href: "/track-case" },
  { label: "دستیار حقوقی", href: "/ai-assistant", ai: true },
];

/* ---------------- Contract categories ---------------- */
export const CONTRACT_CATEGORIES: string[] = [
  "اجاره", "خرید و فروش", "مشارکت", "پیمانکاری", "استخدام",
  "قرارداد محرمانگی (NDA)", "سرمایه‌گذاری", "شراکت", "نمایندگی",
  "خدمات", "دادخواست", "شکواییه", "اظهارنامه", "وکالت‌نامه", "لایحه",
];

/* ---------------- Persian number helper ---------------- */
export function faNum(n: number | string): string {
  const map = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).replace(/\d/g, (d) => map[+d]);
}

export function faPrice(n: number): string {
  return faNum(n.toLocaleString("en-US")) + " تومان";
}

export function relativeTime(date: Date | string): string {
  // استفاده از helper شمسی (jalali.ts) برای زمان نسبی فارسی
  const { relativeTimeJalali } = require("./jalali");
  return relativeTimeJalali(date);
}
