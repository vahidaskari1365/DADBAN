/**
 * ============================================================================
 * dadban — چک‌لیست مدارک بر اساس نوع دعوا (میز پرونده)
 * ----------------------------------------------------------------------------
 * دانش ثابتِ «برای هر نوع دعوا چه مدارکی لازم است» — بدون هوش مصنوعی،
 * بدون هزینه، همیشه فوری. از روی موضوع و شرح پرونده نوع دعوا تشخیص داده می‌شود
 * (تشخیص قابل ویرایش توسط کاربر) و چک‌لیست پایه + چک‌لیست اختصاصی نمایش داده
 * می‌شود. علامت‌زدن در localStorage مرورگر ذخیره می‌شود (پر-دستگاه، حریم خصوصی).
 * طبق رویهٔ سایت: فهرست راهنماست نه مشاوره — همیشه با وکیل چک شود.
 * ============================================================================
 */

export type CaseKind =
  | "mahr"
  | "divorce"
  | "debt"
  | "property-transfer"
  | "lease"
  | "tort-accident"
  | "labor"
  | "insolvency"
  | "general";

export interface ChecklistItem {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

export interface CaseKindInfo {
  kind: CaseKind;
  title: string;
  keywords: string[];
  items: ChecklistItem[];
}

/** چک‌لیست پایه — برای هر پرونده‌ای لازم است */
const BASELINE: ChecklistItem[] = [
  { key: "base-id", label: "کارت ملی و شناسنامهٔ موکل", required: true, hint: "تصویر واضح؛ برای ثبت دادخواست و احراز هویت" },
  { key: "base-opponent", label: "مشخصات دقیق طرف دعوا (نام، کد ملی/شمارهٔ ثبت، نشانی)", required: true, hint: "ابلاغ به این نشانی انجام می‌شود؛ نشانی اشتباه = تأخیر ماه‌ها" },
  { key: "base-poas", label: "وکالت‌نامهٔ تنظیمی (در صورت حضور وکیل)", required: false },
  { key: "base-notice", label: "اظهارنامهٔ اولیه (در صورت ارسال)", required: false, hint: "برای اثبات مطالبه و تاریخ شروع برخی خسارت‌ها مؤثر است" },
  { key: "base-correspondence", label: "مکاتبات و پیام‌های مرتبط با طرف (واتساپ/پیامک/ایمیل)", required: false },
];

export const CASE_KINDS: CaseKindInfo[] = [
  {
    kind: "mahr",
    title: "مطالبهٔ مهریه",
    keywords: ["مهریه", "مهرالمثل", "مهر المعجم", "المسます", "مهریهٔ", "مطالبه مهر"],
    items: [
      { key: "mahr-marridge", label: "عقدنامه (رونوشت مصدق یا نسخهٔ الکترونیکی ثنا)", required: true, hint: "مبنای مطالبهٔ مهریه؛ اگر مهریه در سند ازدواج قید شده باشد" },
      { key: "mahr-behd", label: "سند ازدواج موقت (صیغه‌نامه) — در ازدواج موقت", required: false },
      { key: "mahr-notice", label: "اظهارنامهٔ مطالبهٔ مهریه", required: true, hint: "دیرکرد مهریه از تاریخ مطالبه محاسبه می‌شود؛ اظهارنامه تاریخ را ثابت می‌کند" },
      { key: "mahr-payment", label: "رسید پرداخت بخشی از مهریه (در صورت پرداخت)", required: false },
      { key: "mahr-jahiz", label: "استشهادیهٔ و اسناد جهیزیه", required: false, hint: "برای جلوگیری از توقیف اشتباهِ جهیزیهٔ خانوادهٔ زوجه" },
      { key: "mahr-talaq", label: "گواهی عدم امکان سازش (اگر طلاق گرفته شده)", required: false },
      { key: "mahr-bank", label: "اطلاعات حساب و دارایی‌های زوج (برای توقیف)", required: false },
    ],
  },
  {
    kind: "divorce",
    title: "طلاق و امور زوجیت",
    keywords: ["طلاق", "زوجیت", "نفس", "رجعی", "بائن", "خُلع", "مبارات", "عدم امکان سازش", "فاسخ", "عده"],
    items: [
      { key: "dv-marridge", label: "عقدنامه (رونوشت مصدق)", required: true },
      { key: "dv-jahiz-docs", label: "اسناد و استشهادیهٔ جهیزیه (در درخواست استرداد)", required: true, hint: "فاکتور خرید، استشهادیهٔ ۲ شاهد، عکس" },
      { key: "dv-mahr", label: "اسناد مهریه و نفقه (صیغه‌نامه، رسیدها، اظهارنامه)", required: false },
      { key: "dv-witness", label: "معرفی شهود (استشهادیهٔ محضری یا درخواست استماع شهادت)", required: false },
      { key: "dv-medical", label: "گواهی پزشکی وکیل یا دادگاه (در موارد عسر و حرج جسمی/روانی)", required: false },
      { key: "dv-violence", label: "اسناد درخواست امنیت (گواهی پزشکی قانونی، شکواییه، قرار عدم مزاحمت)", required: false },
      { key: "dv-counseling", label: "گواهی جلسات مشاورهٔ خانواده (در صورت صدور)", required: false },
    ],
  },
  {
    kind: "debt",
    title: "مطالبهٔ وجه (چک، سفته، برات)",
    keywords: ["چک", "سفته", "برات", "مطالبه وجه", "وجه نقد", "وام", "قرض", "دیون", "برگشتی"],
    items: [
      { key: "debt-orig", label: "اصل چک/سفته (پیوست دادخواست) + تصویر", required: true, hint: "اصل سند باید در جلسه ارائه شود" },
      { key: "debt-bank", label: "گواهی عدم پرداخت از بانک (مخصوص چک)", required: true, hint: "با تاریخ و کد برگشت؛ برای دعوای کیفری و مدنی لازم است" },
      { key: "debt-sayadi", label: "استعلام ثبت چک در سامانهٔ صیادی", required: true, hint: "چک ثبت‌نشده از سال ۹۷ قابل وصول از بانک نیست" },
      { key: "debt-notice", label: "اظهارنامهٔ مطالبهٔ وجه", required: true, hint: "شروع خسارت تأخیر تأدیه از تاریخ مطالبه (اظهارنامه یا طرح دعوا) ثابت می‌شود" },
      { key: "debt-base", label: "سند پایهٔ دین (قرارداد بیع/وام/فروش، رسید تحویل کالا)", required: false, hint: "برای دفاع در برابر ادعای «چک ضمانتی» حیاتی است" },
      { key: "debt-msgs", label: "پرینت پیامک/مکاتبات مطالبه و اقرار بدهکار", required: false },
      { key: "debt-criminal", label: "شکواییهٔ کیفری چک (در صورت تمایل به پیگیری موازی)", required: false, hint: "مهلت شکایت کیفری چک ۶ ماه از تاریخ برگشت است" },
    ],
  },
  {
    kind: "property-transfer",
    title: "الزام به تنظیم سند رسمی و خلع ید",
    keywords: ["الزام به تنظیم", "تنظیم سند", "خلع ید", "مبایعه", "قولنامه", "بیع", "انتقال ملک", "سهل انگاری", "ضمان درک", "دلال"],
    items: [
      { key: "pt-contract", label: "قولنامه/مبایعه‌نامه (اصل با امضا و اثر انگشت)", required: true },
      { key: "pt-title", label: "استعلام ثبتی و سند مالکیت فروشنده", required: true, hint: "برای اطمینان از مالکیت و نبود بازداشت/رهن" },
      { key: "pt-payment", label: "رسیدهای پرداخت ثمن (چک‌ها، فیش‌های بانکی)", required: true },
      { key: "pt-possession", label: "دلیل تحویل تصرف (صورتجلسه، استشهادیه، پرداخت شارژ/آب و برق به نام خریدار)", required: false, hint: "برای دعوای خلع ید و خسارت تأخیر اجرا کلیدی است" },
      { key: "pt-valuation", label: "درخواست ارجاع به کارشناس رسمی (ارزش معاملاتی ملک)", required: false },
      { key: "pt-notary", label: "گواهی عدم حضور فروشنده در دفترخانه (اظهارنامهٔ دعوت به دفترخانه)", required: false },
      { key: "pt-mortgage", label: "اسناد رهن/بازداشت (در صورت وجود بر سند)", required: false },
    ],
  },
  {
    kind: "lease",
    title: "اجاره، اجرت‌المثل و تخلیه",
    keywords: ["اجاره", "موجر", "مستأجر", "اجرت المثل", "اجرتالمثل", "تخلیه", "سرقفلی", "کلید"],
    items: [
      { key: "ls-contract", label: "قرارداد اجارهٔ تنظیمی (دو برگ یا نسخهٔ الکترونیکی در اژانس املاک)", required: true },
      { key: "ls-payments", label: "رسیدهای پرداخت اجاره و ودیعه", required: true },
      { key: "ls-notice", label: "اظهارنامهٔ مطالبهٔ اجاره/اجرت‌المثل یا فسخ اجاره", required: true },
      { key: "ls-handover", label: "صورتجلسهٔ تحویل ملک و کلید (در تخلیه)", required: false },
      { key: "ls-good-conduct", label: "گواهی حسن معاشرت مستأجر (برای دعوای تخلیهٔ سریع)", required: false },
      { key: "ls-damage", label: "عکس و کارشناسی خسارات ملک", required: false },
      { key: "ls-witness", label: "استشهادیهٔ همسایه‌ها (در اختلاف تصرف یا سرقفلی)", required: false },
    ],
  },
  {
    kind: "tort-accident",
    title: "خسارت تصادم و دعوای تسبیب",
    keywords: ["تصادم", "تسبیب", "خسارت تصادف", "کروکی", "راهور", "بیمه", "شخص ثالث", "غرم"],
    items: [
      { key: "tr-report", label: "صورتجلسهٔ کارشناس تصادم / کروکی راهور", required: true },
      { key: "tr-insurance", label: "گواهی و برآورد خسارت بیمه (گزارش کارشناس بیمه‌گر)", required: true },
      { key: "tr-repair", label: "فاكتور و رسید تعمیرات (با تفکیک قطعات)", required: false },
      { key: "tr-expert", label: "نظریهٔ کارشناس رسمی دادگستری (در اختلاف برآورد)", required: false },
      { key: "tr-policy", label: "بیمه‌نامهٔ شخص ثالث مقصر و وضعیت بیمه‌نامهٔ خود", required: false },
      { key: "tr-medical", label: "گواهی پزشکی قانونی و اسناد درمان (در خسارت جانی)", required: false },
    ],
  },
  {
    kind: "labor",
    title: "امور کارگری (مطالبهٔ حقوق و مزایا)",
    keywords: ["کارگر", "کارفرما", "حقوق", "مزد", "اخراج", "سازش‌نامه", "بیمه بیکاری", "سنوات", "عیدی", "اضافه‌کاری", "قانون کار"],
    items: [
      { key: "lb-contract", label: "قرارداد کار (یا دلیل رابطهٔ کاری: کارت حضور، فیش حقوق، گواهی همکاران)", required: true },
      { key: "lb-payslip", label: "فیش‌های حقوقی و رسیدهای پرداخت", required: true },
      { key: "lb-insurance", label: "استعلام سابقهٔ بیمهٔ تأمین اجتماعی", required: true, hint: "سابقهٔ بیمه، قوی‌ترین دلیل اثبات رابطهٔ کاری است" },
      { key: "lb-dismissal", label: "اخطار یا صورتجلسهٔ اخراج / استعفا", required: false },
      { key: "lb-labor-letters", label: "رسیدها و مکاتبات با ادارهٔ کار (داوری/هیئت تشخیص)", required: false, hint: "بعضی ادعاها باید اول در هیئت تشخیص طرح شوند" },
      { key: "lb-witness", label: "استشهادیهٔ همکاران", required: false },
    ],
  },
  {
    kind: "insolvency",
    title: "اعسار از محکومٌ‌به",
    keywords: ["اعسار", "اجراییه", "محکوم", "بازداشت", "تقسیط", "اقساط"],
    items: [
      { key: "in-execution", label: "اجراییه و ابلاغ آن", required: true },
      { key: "in-witness", label: "استشهادیهٔ اعسار با ۲ شاهد (محضری یا در دادگاه)", required: true },
      { key: "in-proof", label: "اسناد عدم توان پرداخت (گواهی بیکاری، مستمری، اقساط جاری، اجاره‌نامه)", required: true },
      { key: "in-assets", label: "لیست دارایی‌ها و دیون فعلی", required: false },
      { key: "in-debt-status", label: "اسناد پرداخت بخشی از محکومٌ‌به (در صورت پرداخت)", required: false },
    ],
  },
  {
    kind: "general",
    title: "سایر دعاوی",
    keywords: [],
    items: [],
  },
];

/** تشخیص نوع دعوا از موضوع و شرح — با شمارش کلمات کلیدی */
export function detectCaseKind(subject: string, description: string): CaseKind {
  const text = `${subject || ""} ${description || ""}`.trim();
  if (!text) return "general";
  let best: { kind: CaseKind; score: number } = { kind: "general", score: 0 };
  for (const info of CASE_KINDS) {
    if (!info.keywords.length) continue;
    let score = 0;
    for (const kw of info.keywords) {
      if (text.includes(kw)) score += kw.length >= 4 ? 2 : 1;
    }
    if (score > best.score) best = { kind: info.kind, score };
  }
  return best.kind;
}

export function getCaseKindInfo(kind: CaseKind): CaseKindInfo {
  return CASE_KINDS.find((k) => k.kind === kind) ?? CASE_KINDS[CASE_KINDS.length - 1];
}

/** چک‌لیست کامل: پایه + اختصاصی نوع دعوا */
export function buildChecklist(kind: CaseKind): ChecklistItem[] {
  const info = getCaseKindInfo(kind);
  return [...BASELINE, ...info.items];
}

/** متن قابل کپی چک‌لیست (با وضعیت تیک‌ها) */
export function checklistToText(kind: CaseKind, checked: Record<string, boolean>): string {
  const info = getCaseKindInfo(kind);
  const items = buildChecklist(kind);
  const lines = [`چک‌لیست مدارک — ${info.title}`, ""];
  for (const item of items) {
    const mark = checked[item.key] ? "[✓]" : "[ ]";
    lines.push(`${mark} ${item.label}${item.required ? " (لازم)" : ""}${item.hint ? ` — ${item.hint}` : ""}`);
  }
  const done = items.filter((i) => checked[i.key]).length;
  lines.push("", `پیشرفت: ${done} از ${items.length} — دادورزان (dadban)`);
  return lines.join("\n");
}
