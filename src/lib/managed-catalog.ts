/**
 * Static catalog for «خدمات پیگیری و انجام امور».
 * Used as seed source AND as a fallback so the public /services pages
 * still render when the managed-services tables are missing/empty.
 */

export type CatalogCategory = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
};

export type CatalogService = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  classification: string;
  category: string;
  icon: string;
  estimatedTime: string;
  priceType: string;
  basePrice: number;
  requiresCaseInfo: boolean;
  requiresDocuments: boolean;
  requiresLawyer: boolean;
  requiresSupervision: boolean;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  requiredDocs?: string[];
};

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { slug: "CASE_FOLLOW_UP", name: "پیگیری پرونده و درخواست", description: "پیگیری وضعیت پرونده و درخواست‌های ثبت‌شده در مراجع قضایی.", icon: "folder", sortOrder: 1 },
  { slug: "JUDICIAL_OPERATIONS", name: "امور قضایی و اجرای احکام", description: "پیگیری امور اجرای احکام، ابلاغ‌ها و اقدامات قضایی.", icon: "gavel", sortOrder: 2 },
  { slug: "ENFORCEMENT", name: "اجرای احکام و توقیف", description: "پیگیری برگه‌های اجرایی، توقیف اموال و اقدامات اجرایی.", icon: "balance", sortOrder: 3 },
  { slug: "REGISTRATION", name: "امور ثبتی", description: "پیگیری استعلام‌ها و امور اداره ثبت.", icon: "stamp", sortOrder: 4 },
  { slug: "TAX", name: "امور مالیاتی", description: "پیگیری برگه‌های تشخیص، اعتراض و پرداخت مالیاتی.", icon: "calculator", sortOrder: 5 },
  { slug: "ADMINISTRATIVE", name: "امور اداری و سازمانی", description: "انجام درخواست‌های اداری قابل واگذاری.", icon: "building", sortOrder: 6 },
  { slug: "DOCUMENTS", name: "مدارک و اسناد", description: "تهیه، دریافت و بررسی مدارک و اسناد.", icon: "document", sortOrder: 7 },
  { slug: "ORGANIZATIONS", name: "پیگیری از سازمان‌ها و مراجع", description: "پیگیری درخواست از سازمان یا مرجع مشخص.", icon: "landmark", sortOrder: 8 },
  { slug: "OTHER", name: "سایر خدمات", description: "سایر خدماتی که پیش از انتشار تأیید شده‌اند.", icon: "briefcase", sortOrder: 9 },
];

export const CATALOG_SERVICES: CatalogService[] = [
  {
    title: "پیگیری وضعیت پرونده",
    slug: "case-followup",
    shortDescription: "وضعیت پرونده خود را در جریان رسیدگی پیگیری کنید.",
    description: "کارشناسان دادبان شماره پرونده و مرجع را دریافت کرده و وضعیت جاری، ابلاغ‌ها و گام بعدی را پیگیری و گزارش می‌دهند.",
    classification: "INFORMATIONAL",
    category: "CASE_FOLLOW_UP",
    icon: "folder",
    estimatedTime: "۲ تا ۵ روز کاری",
    priceType: "FROM",
    basePrice: 350000,
    requiresCaseInfo: true,
    requiresDocuments: false,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: true,
    sortOrder: 1,
  },
  {
    title: "پیگیری امور اجرای احکام",
    slug: "enforcement-followup",
    shortDescription: "وضعیت اجرای حکم و ابلاغ‌ها را پیگیری کنید.",
    description: "درخواست پیگیری برگه اجرایی، وضعیت ابلاغ و اقدامات اجرایی ثبت شود تا توسط کارشناسان دنبال شود.",
    classification: "ADMINISTRATIVE",
    category: "JUDICIAL_OPERATIONS",
    icon: "gavel",
    estimatedTime: "۳ تا ۷ روز کاری",
    priceType: "FROM",
    basePrice: 450000,
    requiresCaseInfo: true,
    requiresDocuments: false,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: true,
    sortOrder: 2,
  },
  {
    title: "پیگیری توقیف و اجراییه",
    slug: "enforcement-tracking",
    shortDescription: "برگه‌های اجرایی و توقیف اموال را پیگیری کنید.",
    description: "پیگیری وضعیت برگه اجرایی، توقیف اموال و اقدامات مرتبط با اجرای احکام در واحدهای اجرایی.",
    classification: "ADMINISTRATIVE",
    category: "ENFORCEMENT",
    icon: "balance",
    estimatedTime: "۳ تا ۷ روز کاری",
    priceType: "FROM",
    basePrice: 450000,
    requiresCaseInfo: true,
    requiresDocuments: false,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: false,
    sortOrder: 3,
  },
  {
    title: "پیگیری امور ثبتی",
    slug: "registration-followup",
    shortDescription: "استعلام‌ها و امور اداره ثبت را پیگیری کنید.",
    description: "پیگیری درخواست‌های ثبتی، استعلام‌ها و مراحل انتقال در اداره ثبت اسناد و املاک.",
    classification: "ADMINISTRATIVE",
    category: "REGISTRATION",
    icon: "stamp",
    estimatedTime: "۳ تا ۱۰ روز کاری",
    priceType: "FROM",
    basePrice: 300000,
    requiresCaseInfo: true,
    requiresDocuments: false,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: false,
    sortOrder: 4,
  },
  {
    title: "پیگیری امور مالیاتی",
    slug: "tax-followup",
    shortDescription: "برگه تشخیص و اعتراض مالیاتی را پیگیری کنید.",
    description: "پیگیری برگه‌های تشخیص، اعتراض به کمیسیون‌های مالیاتی و پیگیری پرونده‌های مالیاتی با نظارت حرفه‌ای.",
    classification: "PROFESSIONAL_LEGAL",
    category: "TAX",
    icon: "calculator",
    estimatedTime: "۵ تا ۱۲ روز کاری",
    priceType: "FROM",
    basePrice: 500000,
    requiresCaseInfo: true,
    requiresDocuments: true,
    requiresLawyer: true,
    requiresSupervision: true,
    active: true,
    featured: false,
    sortOrder: 5,
    requiredDocs: ["برگه تشخیص مالیاتی", "اظهارنامه", "مدارک هویتی"],
  },
  {
    title: "پیگیری درخواست اداری مشخص",
    slug: "administrative-request",
    shortDescription: "یک درخواست اداری مشخص را واگذار کنید.",
    description: "درخواست‌های اداری تعریف‌شده (مانند استعلام، دریافت گواهی، پیگیری نامه) که نیازمند حضور شما نیست واگذار شود.",
    classification: "ADMINISTRATIVE",
    category: "ADMINISTRATIVE",
    icon: "building",
    estimatedTime: "۲ تا ۶ روز کاری",
    priceType: "FROM",
    basePrice: 250000,
    requiresCaseInfo: false,
    requiresDocuments: true,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: false,
    sortOrder: 6,
  },
  {
    title: "پیگیری از سازمان یا مرجع مشخص",
    slug: "org-followup",
    shortDescription: "درخواست خود را از یک سازمان پیگیری کنید.",
    description: "پیگیری یک درخواست یا نامه از سازمان یا مرجع مشخص (با ذکر نام سازمان، واحد و شماره پیگیری).",
    classification: "INFORMATIONAL",
    category: "ORGANIZATIONS",
    icon: "landmark",
    estimatedTime: "۲ تا ۶ روز کاری",
    priceType: "FROM",
    basePrice: 250000,
    requiresCaseInfo: false,
    requiresDocuments: true,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: false,
    sortOrder: 7,
  },
  {
    title: "تهیه و دریافت مدارک",
    slug: "doc-prep",
    shortDescription: "دریافت یا تهیه مدرک موردنیاز را واگذار کنید.",
    description: "دریافت گواهی‌ها، استعلام‌ها یا تهیه نسخه‌های رسمی مدارک از مراجع ذی‌ربط.",
    classification: "DOCUMENT_SERVICE",
    category: "DOCUMENTS",
    icon: "document",
    estimatedTime: "۱ تا ۴ روز کاری",
    priceType: "FIXED",
    basePrice: 200000,
    requiresCaseInfo: false,
    requiresDocuments: false,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: false,
    sortOrder: 8,
  },
  {
    title: "بررسی و تکمیل مدارک",
    slug: "doc-review",
    shortDescription: "مدارک خود را بررسی و تکمیل کنید.",
    description: "بررسی کامل بودن مدارک، رفع نقص و آماده‌سازی پوشه مدارک برای ارائه به مرجع.",
    classification: "DOCUMENT_SERVICE",
    category: "DOCUMENTS",
    icon: "file",
    estimatedTime: "۱ تا ۳ روز کاری",
    priceType: "FIXED",
    basePrice: 150000,
    requiresCaseInfo: false,
    requiresDocuments: true,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: false,
    sortOrder: 9,
  },
  {
    title: "ارجاع به وکیل واجد صلاحیت",
    slug: "lawyer-referral",
    shortDescription: "درخواستی که نیازمند اقدام حرفه‌ای است به وکیل ارجاع می‌شود.",
    description: "اگر بررسی نشان دهد موضوع نیازمند وکیل یا اقدام حرفه‌ای حقوقی است، دادبان آن را به وکیل دارای صلاحیت یا مجموعه حقوقی مربوط ارجاع می‌دهد. هزینه پس از بررسی اعلام می‌شود.",
    classification: "PROFESSIONAL_LEGAL",
    category: "OTHER",
    icon: "user",
    estimatedTime: "بر اساس نظر وکیل",
    priceType: "REQUIRES_REVIEW",
    basePrice: 0,
    requiresCaseInfo: true,
    requiresDocuments: true,
    requiresLawyer: true,
    requiresSupervision: true,
    active: true,
    featured: true,
    sortOrder: 10,
  },
  {
    title: "انجام امور اداری قابل واگذاری",
    slug: "general-managed-task",
    shortDescription: "کارهای زمان‌بر اداری را به ما بسپارید.",
    description: "امور اداری مشخصی که قابل واگذاری است و پیش از انتشار توسط مدیریت تأیید شده‌اند. جزئیات بررسی و هزینه نهایی اعلام می‌شود.",
    classification: "REQUIRES_REVIEW",
    category: "OTHER",
    icon: "briefcase",
    estimatedTime: "بر اساس نوع کار",
    priceType: "REQUIRES_REVIEW",
    basePrice: 0,
    requiresCaseInfo: false,
    requiresDocuments: false,
    requiresLawyer: false,
    requiresSupervision: false,
    active: true,
    featured: true,
    sortOrder: 11,
  },
];

export function catalogServiceBySlug(slug: string): CatalogService | undefined {
  return CATALOG_SERVICES.find((s) => s.slug === slug && s.active);
}
