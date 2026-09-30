/**
 * ============================================================================
 * sharifmand — Keyword Research & Content Strategy
 * ----------------------------------------------------------------------------
 * تحلیل کلمات کلیدی تجاری + ارزشمند + mapping به صفحات.
 *
 * منبع تحلیل:
 *  - Search intent (commercial, transactional, informational)
 *  - Volume estimate (high/medium) برای بازار حقوقی ایران
 *  - Keyword difficulty و موقعیت رقابتی
 *  - Long-tail keywords برای Content Gap
 * ============================================================================
 */

export type KeywordIntent = "commercial" | "transactional" | "informational" | "navigational";
export type KeywordVolume = "high" | "medium" | "low";

export interface Keyword {
  term: string;
  intent: KeywordIntent;
  volume: KeywordVolume;
  /** مسیر صفحه‌ای که این کلمه را target می‌کند. */
  page: string;
  /** کلمات کلیدی مرتبط (LSI / semantic) */
  lsi: string[];
}

/**
 * کلمات کلیدی اصلی — اولویت‌بندی بر اساس ارزش تجاری.
 * صفحات conversion-critical بالاترین اولویت رو دارن.
 */
export const TARGET_KEYWORDS: Keyword[] = [
  // ─── صفحه اصلی (Homepage) ───
  {
    term: "مشاوره حقوقی آنلاین",
    intent: "commercial",
    volume: "high",
    page: "/",
    lsi: ["وکیل آنلاین", "پرسش از وکیل", "مشاوره حقوقی تلفنی", "مشاوره وکیل"],
  },
  {
    term: "وکیل پایه یک",
    intent: "commercial",
    volume: "high",
    page: "/",
    lsi: ["وکیل دادگستری", "پروانه وکالت", "کانون وکلای دادگستری"],
  },
  // ─── وکیل‌یابی ───
  {
    term: "وکیل خانواده",
    intent: "commercial",
    volume: "high",
    page: "/lawyers?sp=خانواده",
    lsi: ["وکیل طلاق", "وکیل مهریه", "وکیل حضانت", "بهترین وکیل خانواده تهران"],
  },
  {
    term: "وکیل ملکی",
    intent: "commercial",
    volume: "high",
    page: "/lawyers?sp=ملک",
    lsi: ["وکیل تخلیه", "وکیل تصرف عدوانی", "وکیل سرقفلی", "وکیل اجاره"],
  },
  {
    term: "وکیل کیفری",
    intent: "commercial",
    volume: "high",
    page: "/lawyers?sp=کیفری",
    lsi: ["وکیل کلاهبرداری", "وکیل سرقت", "وکیل جعل", "دفاع کیفری"],
  },
  {
    term: "وکیل طلاق",
    intent: "transactional",
    volume: "high",
    page: "/lawyers?sp=خانواده",
    lsi: ["طلاق توافقی", "طلاق یک‌طرفه", "وکیل طلاق تهران", "هزینه طلاق"],
  },
  {
    term: "وکیل مهریه",
    intent: "transactional",
    volume: "high",
    page: "/lawyers?sp=خانواده",
    lsi: ["مطالبه مهریه", "اجرای مهریه", "توقیف مهریه"],
  },
  {
    term: "وکیل چک برگشتی",
    intent: "transactional",
    volume: "high",
    page: "/lawyers?sp=کیفری",
    lsi: ["چک برگشتی", "اجرای چک", "واخواست چک"],
  },
  // ─── مشاوره ───
  {
    term: "مشاوره حقوقی",
    intent: "commercial",
    volume: "high",
    page: "/consultation",
    lsi: ["مشاوره حقوقی تلفنی", "مشاوره حقوقی متنی", "مشاوره وکیل آنلاین"],
  },
  // ─── قراردادها ───
  {
    term: "تنظیم قرارداد",
    intent: "transactional",
    volume: "high",
    page: "/contracts",
    lsi: ["قرارداد اجاره", "قرارداد مشارکت", "قرارداد استخدام", "تنظیم سند"],
  },
  {
    term: "بررسی قرارداد",
    intent: "commercial",
    volume: "medium",
    page: "/contracts/review",
    lsi: ["تحلیل قرارداد", "مشکل قرارداد", "بند قرارداد"],
  },
  // ─── پرونده ───
  {
    term: "ثبت پرونده حقوقی",
    intent: "transactional",
    volume: "medium",
    page: "/case/new",
    lsi: ["ثبت دادخواست", "ثبت شکواییه", "شروع دعوی"],
  },
  {
    term: "پیگیری پرونده",
    intent: "commercial",
    volume: "medium",
    page: "/services",
    lsi: ["پیگیری دادرسی", "وضعیت پرونده", "دفاع پرونده"],
  },
  // ─── AI Assistant ───
  {
    term: "دستیار حقوقی هوش مصنوعی",
    intent: "informational",
    volume: "medium",
    page: "/ai-assistant",
    lsi: ["وکیل هوش مصنوعی", "پرسش حقوقی AI", "مشاور حقوقی AI"],
  },
  // ─── پایگاه دانش ───
  {
    term: "قوانین ایران",
    intent: "informational",
    volume: "high",
    page: "/laws",
    lsi: ["قانون مدنی", "قانون مجازات", "قانون کار", "قانون تجارت"],
  },
  {
    term: "آرای قضایی",
    intent: "informational",
    volume: "medium",
    page: "/judgments",
    lsi: ["رأی دیوان عالی کشور", "رأی دادگاه", "پرونده‌های قضایی"],
  },
  {
    term: "واژه‌نامه حقوقی",
    intent: "informational",
    volume: "low",
    page: "/glossary",
    lsi: ["اصطلاحات حقوقی", "تعریف حقوقی", "لغت‌نامه حقوق"],
  },
  // ─── کسب‌وکار ───
  {
    term: "واحد حقوقی شرکت",
    intent: "commercial",
    volume: "medium",
    page: "/business",
    lsi: ["حقوق شرکت‌ها", "مشاور حقوقی کسب‌وکار", "حقوق‌دان شرکت"],
  },
  {
    term: "ثبت شرکت",
    intent: "transactional",
    volume: "high",
    page: "/services",
    lsi: ["ثبت شرکت مسئولیت محدود", "ثبت شرکت سهامی", "تغییرات شرکت"],
  },
];

/**
 * Content Gap — کلماتی که رقبا دارند ولی ما هنوز صفحه‌ی اختصاصی نداریم.
 * این‌ها فرصت‌های تولید محتوای جدید هستند.
 */
export const CONTENT_GAPS: { term: string; intent: KeywordIntent; suggestedPage: string }[] = [
  { term: "هزینه وکیل", intent: "commercial", suggestedPage: "/pricing" },
  { term: "تعرفه وکالت", intent: "informational", suggestedPage: "/pricing" },
  { term: "حقوق ارث", intent: "informational", suggestedPage: "/knowledge/ارث" },
  { term: "انحصار وراثت", intent: "informational", suggestedPage: "/knowledge/انحصار-وراثت" },
  { term: "وصیت‌نامه", intent: "informational", suggestedPage: "/knowledge/وصیت" },
  { term: "حضانت فرزند", intent: "informational", suggestedPage: "/knowledge/حضانت" },
  { term: "نفقه زن", intent: "informational", suggestedPage: "/knowledge/نفقه" },
  { term: "اجرای احکام", intent: "informational", suggestedPage: "/services" },
  { term: "دادیار", intent: "informational", suggestedPage: "/glossary/دادیار" },
  { term: "خیانت در امانت", intent: "informational", suggestedPage: "/knowledge/خیانت-در-امانت" },
];

/**
 * Internal Links — نقشه‌ی لینک‌های داخلی پیشنهادی.
 * این لینک‌ها باید در محتوای صفحات به‌صورت طبیعی درج شوند.
 */
export const INTERNAL_LINK_MAP: { from: string; to: string; anchor: string }[] = [
  // از homepage به صفحات conversion
  { from: "/", to: "/lawyers", anchor: "جستجوی وکیل متخصص" },
  { from: "/", to: "/consultation", anchor: "مشاوره حقوقی آنلاین" },
  { from: "/", to: "/case/new", anchor: "ثبت پرونده حقوقی" },
  { from: "/", to: "/contracts", anchor: "تنظیم و بررسی قرارداد" },
  { from: "/", to: "/ai-assistant", anchor: "دستیار حقوقی هوش مصنوعی" },
  // از services به وکیل‌یابی
  { from: "/services/family", to: "/lawyers?sp=خانواده", anchor: "وکیل خانواده" },
  { from: "/services/property", to: "/lawyers?sp=ملک", anchor: "وکیل ملکی" },
  { from: "/services/criminal", to: "/lawyers?sp=کیفری", anchor: "وکیل کیفری" },
  { from: "/services/commercial", to: "/lawyers?sp=تجاری", anchor: "وکیل تجاری" },
  // از consultation به صفحات مرتبط
  { from: "/consultation", to: "/lawyers", anchor: "همه وکلا" },
  { from: "/consultation", to: "/contracts", anchor: "تنظیم قرارداد" },
  // از knowledge به conversion
  { from: "/knowledge", to: "/consultation", anchor: "مشاوره با وکیل" },
  { from: "/knowledge", to: "/lawyers", anchor: "پیدا کردن وکیل" },
  // از qa به consultation
  { from: "/qa", to: "/consultation", anchor: "مشاوره تخصصی" },
  { from: "/qa", to: "/ai-assistant", anchor: "دستیار هوش مصنوعی" },
  // از lawyers profile به consultation
  { from: "/lawyers/[slug]", to: "/consultation", anchor: "رزرو مشاوره" },
  // cross-link بین knowledge hubs
  { from: "/laws", to: "/glossary", anchor: "واژه‌نامه حقوقی" },
  { from: "/laws", to: "/judgments", anchor: "آرای قضایی" },
  { from: "/glossary", to: "/knowledge", anchor: "مقالات حقوقی" },
  // از business به services
  { from: "/business", to: "/services", anchor: "خدمات پیگیری" },
  { from: "/business", to: "/contracts", anchor: "تنظیم قرارداد" },
];

/**
 * Keyword map برای هر صفحه — برای استفاده در metadata و content.
 */
export function getKeywordsForPage(pathname: string): string[] {
  const matches = TARGET_KEYWORDS.filter((k) => k.page === pathname);
  const main = matches.map((k) => k.term);
  const lsi = matches.flatMap((k) => k.lsi);
  return [...main, ...lsi];
}

/** بهترین کلمات کلیدی برای meta keywords (deprecated ولی گاهی مفید). */
export function getMetaKeywords(pathname: string): string[] {
  const kws = getKeywordsForPage(pathname);
  return kws.slice(0, 10); // حداکثر ۱۰ کلمه
}
