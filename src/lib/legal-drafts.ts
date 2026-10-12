// ============================================================
// دادورزان — «دادخواست‌ساز هوشمند»: رجیستری تعریف اسناد + ساخت پرامپت
// این ماژول هم سمت سرور و هم سمت کلاینت import می‌شود —
// عمداً «server-only» ندارد و هیچ وابستگی سروری (db/sdk) ندارد.
// ============================================================

export type DraftDocKind = "دادخواست" | "شکواییه" | "اظهارنامه" | "لایحه" | "درخواست" | "توافق‌نامه";

export type DraftFieldType = "text" | "textarea" | "select";

export interface DraftField {
  id: string;
  label: string;
  type: DraftFieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface DraftDef {
  slug: string;
  docKind: DraftDocKind;
  title: string;
  fields: DraftField[];
}

/* ----------------- رجیستری اسناد -----------------
 * دو گروه: (الف) slugهای واقعی LEGAL_FORMS در src/lib/content.ts
 * (ب) slugهای دستهٔ خدمات (family/property/…) برای سازگاری با قرارداد تسک 6-b.
 */
export const DRAFT_DEFS: DraftDef[] = [
  /* —— فرم‌های واقعی صفحهٔ فرم‌های حقوقی —— */
  {
    slug: "dadkhasat",
    docKind: "دادخواست",
    title: "دادخواست",
    fields: [
      { id: "kind", label: "نوع دعوا", type: "select", required: true, options: ["مطالبهٔ وجه", "الزام به تنظیم سند رسمی", "خلع ید و تصرف عدوانی", "تخلیهٔ عین مستأجره", "مطالبهٔ خسارت", "سایر دعاوی مدنی"] },
      { id: "plaintiff", label: "مشخصات خواهان", type: "text", required: true, placeholder: "نام، نام خانوادگی، کد ملی و نشانی خواهان" },
      { id: "defendant", label: "مشخصات خوانده", type: "text", required: true, placeholder: "نام، نام خانوادگی، کد ملی و نشانی خوانده" },
      { id: "story", label: "شرح موضوع دعوا", type: "textarea", required: true, placeholder: "شرح وقایع، قرارداد یا تعهد مربوطه…" },
      { id: "demands", label: "خواسته‌ها", type: "textarea", required: true, placeholder: "خواسته‌های دعوا را شماره‌وار بنویسید…" },
      { id: "docs", label: "مدارک پیوست (اختیاری)", type: "text", placeholder: "مثلاً قرارداد، رسید پرداخت، مکاتبات" },
    ],
  },
  {
    slug: "shokavye",
    docKind: "شکواییه",
    title: "شکواییه",
    fields: [
      { id: "kind", label: "نوع شکایت", type: "select", required: true, options: ["کلاهبرداری", "خیانت در امانت", "تهدید", "ضرب‌وجرح", "جعل سند یا امضا", "سایر جرایم"] },
      { id: "complainant", label: "مشخصات شاکی", type: "text", required: true, placeholder: "نام، نام خانوادگی، کد ملی و نشانی شاکی" },
      { id: "accused", label: "مشخصات مشتکی‌عنه", type: "text", required: true, placeholder: "نام و هرگونه نشانی یا مشخصات شناخته‌شده از مشتکی‌عنه" },
      { id: "story", label: "شرح وقایع و موضوع جرم", type: "textarea", required: true, placeholder: "شرح زمان‌بندی‌شدهٔ وقایع و رکن جرم…" },
      { id: "whenwhere", label: "تاریخ و مکان وقوع", type: "text", required: true, placeholder: "مثلاً: ۱۴۰۳/۰۵/۱۲ — تهران، خیابان …" },
      { id: "witnesses", label: "شهود و ادله (اختیاری)", type: "textarea", placeholder: "نام شهود، اسناد، پیام‌ها و مدارک تأییدکننده…" },
    ],
  },
  {
    slug: "ozharname",
    docKind: "اظهارنامه",
    title: "اظهارنامه",
    fields: [
      { id: "subject", label: "موضوع اظهارنامه", type: "text", required: true, placeholder: "مثلاً: مطالبهٔ وجه، اخطار پیش از طرح دعوا" },
      { id: "sender", label: "مشخصات اظهارکننده", type: "text", required: true, placeholder: "نام، نام خانوادگی، کد ملی و نشانی اظهارکننده" },
      { id: "receiver", label: "مشخصات گیرندهٔ اظهارنامه", type: "text", required: true, placeholder: "نام، نام خانوادگی و نشانی گیرنده" },
      { id: "body", label: "متن اظهارات و مطالبه", type: "textarea", required: true, placeholder: "اظهارات، مستندات و مطالبهٔ مشخص خود را بنویسید…" },
      { id: "deadline", label: "مهلت تعیین‌شده (اختیاری)", type: "text", placeholder: "مثلاً: مهلت ۱۰ روز از تاریخ ابلاغ" },
      { id: "docs", label: "مدارک پیوست (اختیاری)", type: "text", placeholder: "مثلاً سند، قرارداد، رسید" },
    ],
  },
  {
    slug: "layehe",
    docKind: "لایحه",
    title: "لایحهٔ دفاعیه",
    fields: [
      { id: "caseno", label: "شماره پرونده", type: "text", required: true, placeholder: "شماره و تاریخ پروندهٔ جاری" },
      { id: "court", label: "مرجع رسیدگی‌کننده", type: "text", required: true, placeholder: "مثلاً: دادگاه عمومی حقوقی تهران" },
      { id: "presenter", label: "مشخصات ارائه‌دهندهٔ لایحه", type: "text", required: true, placeholder: "نام و سمت (خواهان/خوانده/وکیل) و مشخصات" },
      { id: "argument", label: "موضوع و استدلال‌های دفاعی", type: "textarea", required: true, placeholder: "استدلال‌ها، ایرادها و دفاعیات را شماره‌وار بنویسید…" },
      { id: "docs", label: "مدارک دفاعی (اختیاری)", type: "textarea", placeholder: "لایحه‌ها، اسناد و مدارک تأییدکنندهٔ دفاع…" },
    ],
  },
  {
    slug: "darkhast",
    docKind: "درخواست",
    title: "درخواست",
    fields: [
      { id: "kind", label: "نوع درخواست", type: "text", required: true, placeholder: "مثلاً: توقیف احتیاطی، اعسار، تجدیدنظرخواهی" },
      { id: "applicant", label: "مشخصات درخواست‌کننده", type: "text", required: true, placeholder: "نام، نام خانوادگی، کد ملی و نشانی" },
      { id: "authority", label: "مرجع درخواست", type: "text", required: true, placeholder: "مثلاً: دادگاه عمومی حقوقی …، ادارهٔ ثبت …" },
      { id: "body", label: "شرح درخواست", type: "textarea", required: true, placeholder: "شرح درخواست و جهات آن…" },
      { id: "docs", label: "مدارک پیوست (اختیاری)", type: "text", placeholder: "مثلاً مدارک هویتی، سند، رسید" },
    ],
  },
  {
    slug: "tavafoghname",
    docKind: "توافق‌نامه",
    title: "توافق‌نامه",
    fields: [
      { id: "subject", label: "موضوع توافق‌نامه", type: "text", required: true, placeholder: "مثلاً: توافق تسویه، ترک مخاصمه، فروش سهام" },
      { id: "party1", label: "مشخصات طرف اول", type: "text", required: true, placeholder: "نام، نام خانوادگی/نام شرکت، کد ملی/شناسه و نشانی" },
      { id: "party2", label: "مشخصات طرف دوم", type: "text", required: true, placeholder: "نام، نام خانوادگی/نام شرکت، کد ملی/شناسه و نشانی" },
      { id: "terms", label: "شرح تعهدات و مفاد توافق", type: "textarea", required: true, placeholder: "تعهدات هر طرف را شماره‌وار بنویسید…" },
      { id: "duration", label: "مدت توافق (اختیاری)", type: "text", placeholder: "مثلاً: ۶ ماه از تاریخ امضا" },
      { id: "extras", label: "شروط خاص (اختیاری)", type: "textarea", placeholder: "فورس‌ماژور، حل اختلاف، وجه التزام…" },
    ],
  },

  /* —— slugهای دستهٔ خدمات (قرارداد تسک 6-b) —— */
  {
    slug: "family",
    docKind: "دادخواست",
    title: "دادخواست دعاوی خانواده",
    fields: [
      { id: "kind", label: "نوع دعوی", type: "select", required: true, options: ["طلاق توافقی", "مطالبهٔ مهریه", "مطالبهٔ نفقه", "حضانت فرزند"] },
      { id: "plaintiff", label: "مشخصات خواهان", type: "text", required: true, placeholder: "نام، نام خانوادگی، کد ملی و نشانی خواهان" },
      { id: "defendant", label: "مشخصات خوانده", type: "text", required: true, placeholder: "نام، نام خانوادگی، کد ملی و نشانی خوانده" },
      { id: "story", label: "شرح وقایع", type: "textarea", required: true, placeholder: "شرح زندگی مشترک، اختلافات یا استنکاف… " },
      { id: "demands", label: "خواسته‌ها", type: "textarea", required: true, placeholder: "خواسته‌های دعوی خانواده را بنویسید…" },
      { id: "docs", label: "مدارک (اختیاری)", type: "text", placeholder: "عقدنامه، شناسنامهٔ فرزندان، گواهی…" },
    ],
  },
  {
    slug: "property",
    docKind: "دادخواست",
    title: "دادخواست دعاوی ملکی",
    fields: [
      { id: "kind", label: "نوع دعوی", type: "select", required: true, options: ["مطالبهٔ وجه", "ابطال معامله", "خلع ید", "مطالبهٔ اجاره‌بها"] },
      { id: "parties", label: "مشخصات طرفین", type: "textarea", required: true, placeholder: "مشخصات خواهان و خوانده (نام، کد ملی، نشانی)…" },
      { id: "story", label: "شرح ماجرا", type: "textarea", required: true, placeholder: "شرح تصرف، معامله یا تخلف مربوط به ملک…" },
      { id: "amount", label: "مبلغ یا خواستهٔ مالی", type: "text", required: true, placeholder: "مبلغ به ریال/تومان یا شرح خواستهٔ مالی" },
      { id: "docs", label: "مدارک (اختیاری)", type: "text", placeholder: "سند مالکیت، قرارداد اجاره، استشهادیه…" },
    ],
  },
  {
    slug: "criminal",
    docKind: "شکواییه",
    title: "شکواییه کیفری",
    fields: [
      { id: "kind", label: "نوع شکواییه", type: "select", required: true, options: ["کلاهبرداری", "خیانت در امانت", "تهدید", "ضرب‌وجرح"] },
      { id: "complainant", label: "مشخصات شاکی", type: "text", required: true, placeholder: "نام، نام خانوادگی، کد ملی و نشانی شاکی" },
      { id: "accused", label: "مشخصات مشتکی‌عنه", type: "text", required: true, placeholder: "نام و هرگونه مشخصات شناخته‌شده از مشتکی‌عنه" },
      { id: "story", label: "شرح جرم", type: "textarea", required: true, placeholder: "شرح وقایع و رکن جرم به‌ترتیب زمانی…" },
      { id: "whenwhere", label: "تاریخ و مکان وقوع", type: "text", required: true, placeholder: "مثلاً: ۱۴۰۳/۰۵/۱۲ — کرج، میدان …" },
      { id: "witnesses", label: "شهود (اختیاری)", type: "textarea", placeholder: "نام و نشانی شهود…" },
    ],
  },
  {
    slug: "commercial",
    docKind: "دادخواست",
    title: "دادخواست دعاوی تجاری",
    fields: [
      { id: "kind", label: "نوع سند یا دعوا", type: "select", required: true, options: ["چک برگشتی", "سفته", "برات", "دعوای قرارداد تجاری"] },
      { id: "amount", label: "مبلغ", type: "text", required: true, placeholder: "مبلغ به ریال/تومان" },
      { id: "plaintiff", label: "مشخصات خواهان", type: "text", required: true, placeholder: "نام/نام شرکت و نشانی خواهان" },
      { id: "defendant", label: "مشخصات خوانده", type: "text", required: true, placeholder: "نام/نام شرکت و نشانی خوانده" },
      { id: "story", label: "شرح موضوع", type: "textarea", required: true, placeholder: "شرح صدور سند، سررسید، گواهی عدم پرداخت…" },
      { id: "docs", label: "مدارک (اختیاری)", type: "text", placeholder: "اصل سند، گواهی عدم پرداخت، مکاتبات…" },
    ],
  },
  {
    slug: "administrative",
    docKind: "دادخواست",
    title: "دادخواست دیوان عدالت اداری",
    fields: [
      { id: "authority", label: "مرجع رسیدگی", type: "select", required: true, options: ["هیأت تشخیص", "دادگاه عدالت اداری"] },
      { id: "subject", label: "موضوع", type: "select", required: true, options: ["ابطال آرای کمیسیون", "ابطال مقررات اداری", "شکایت از تصمیم مرجع اداری"] },
      { id: "complainant", label: "مشخصات خواهان", type: "text", required: true, placeholder: "نام، نام خانوادگی/نام سازمان و نشانی" },
      { id: "story", label: "شرح موضوع", type: "textarea", required: true, placeholder: "شرح تصمیم اداری، جهات اعتراض و خسارات…" },
      { id: "docs", label: "مدارک (اختیاری)", type: "text", placeholder: "رأی کمیسیون، مکاتبات اداری، ابلاغیه…" },
    ],
  },
];

const DRAFT_MAP: Record<string, DraftDef> = Object.fromEntries(DRAFT_DEFS.map((d) => [d.slug, d]));

export function getDraftDef(slug: string): DraftDef | undefined {
  return DRAFT_MAP[slug];
}

/** برچسب فیلدهای الزامیِ خالی — هم برای اعتبارسنجی سرور و هم قفل دکمهٔ کلاینت */
export function missingRequired(def: DraftDef, answers: Record<string, string>): string[] {
  return def.fields
    .filter((f) => f.required && !(answers[f.id] ?? "").trim())
    .map((f) => f.label);
}

const MAX_FIELD_LEN = 2000;

/* ----------------- ساخت پرامپت ----------------- */

/** پرامپت سیستمی سخت‌گیرانه: فقط متن سند، بدون هیچ توضیح اضافه، بدون تضمین نتیجه */
export function buildSystemPrompt(def: DraftDef): string {
  const parties =
    def.docKind === "شکواییه"
      ? "شاکی و مشتکی‌عنه"
      : def.docKind === "اظهارنامه"
        ? "اظهارکننده و گیرندهٔ اظهارنامه"
        : def.docKind === "توافق‌نامه"
          ? "طرف اول و طرف دوم"
          : def.docKind === "لایحه"
            ? "ارائه‌دهندهٔ لایحه و طرف مقابل"
            : "خواهان و خوانده";

  return [
    `تو کارشناس حقوقی دادورزان هستی و اسناد حقوقی رسمی را به زبان فارسیِ رسمیِ حقوقی تنظیم می‌کنی.`,
    `یک «${def.docKind}» کامل، رسمی و آمادهٔ تکمیل مطابق قواعد دادرسی ایران تولید کن؛ این سند باید «${def.title}» را پوشش دهد.`,
    `ساختار الزامی سند:`,
    `۱) سربرگ: شهر و تاریخ (خالی با نقطه‌چین) و «مرجع رسیدگی‌کننده» با جای خالی برای شمارهٔ پرونده.`,
    `۲) مشخصات کامل طرفین (${parties}) شامل نام، کد ملی و نشانی.`,
    `۳) موضوع سند در یک سطر.`,
    `۴) شرح دلایل و مستندات به‌صورت شماره‌دار (۱. ۲. ۳. …).`,
    `۵) خواسته‌ها به‌صورت شماره‌دار.`,
    `۶) بند «منضمات» با شمارش لوایح و مدارک پیوست.`,
    `۷) بند «تکمیل توسط خواهان» شامل جای امضا، تاریخ و مشخصات تکمیل‌کننده.`,
    `قواعد الزامی:`,
    `- هر جا اطلاعات جاافتاده است عبارت [تکمیل شود] را بنویس؛ هیچ داده‌ای از خودت نساز.`,
    `- فقط متن سند را بنویس؛ هیچ توضیح، مقدمه، جمع‌بندی یا جمله‌ای خارج از متن سند ننویس.`,
    `- هیچ تضمینی برای نتیجهٔ دادرسی نده؛ هیچ جمله‌ای مبنی بر قطعی یا حتمی بودن رأی در سند ننویس (فاقد تضمین نتیجه).`,
    `- فقط به مواد قانونی که از شماره و وجودشان مطمئن هستی استناد کن؛ هرگز مادهٔ ناموجود نساز.`,
    `- سند را با قالب متنی ساده بنویس (بدون مارک‌داون، بدون جدول، بدون کاراکترهای خاص ترسیمی).`,
  ].join("\n");
}

/** پرامپت کاربر: عنوان سند + فیلدهای پرشدهٔ فرم */
export function buildUserPrompt(def: DraftDef, answers: Record<string, string>): string {
  const lines: string[] = [`سند درخواستی: ${def.title} (نوع سند: ${def.docKind})`, "اطلاعات ارائه‌شده توسط کاربر:"];
  for (const f of def.fields) {
    const v = (answers[f.id] ?? "").trim().slice(0, MAX_FIELD_LEN);
    if (v) lines.push(`- ${f.label}: ${v}`);
  }
  lines.push(
    "هر موردی که در فهرست بالا نیامده، در سند با عبارت [تکمیل شود] مشخص شود.",
    "سند را از سربرگ آغاز کن و تا بند «تکمیل توسط خواهان» کامل بنویس.",
  );
  return lines.join("\n");
}

export function buildPrompt(slug: string, answers: Record<string, string>): { system: string; user: string } | null {
  const def = getDraftDef(slug);
  if (!def) return null;
  return { system: buildSystemPrompt(def), user: buildUserPrompt(def, answers) };
}
