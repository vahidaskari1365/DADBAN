// Single source of truth for seed data + automatic DB provisioning.
// Used by /api/seed (manual) and instrumentation (automatic on startup).

import { db } from "@/db";
import { articleData } from "@/data/articles-seed";
import {
  lawyers,
  reviews,
  contracts,
  articles,
  qaQuestions,
  lawyerAvailability,
  serviceCategories,
  managedServices,
  users,
  glossaryTerms,
  laws,
  judgments,
  legalForms,
  membershipPlans,
} from "@/db/schema";
import { GLOSSARY, LAWS, JUDGMENTS, LEGAL_FORMS } from "@/lib/content";
import { PLANS_CATALOG } from "@/lib/plans-catalog";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/user-auth";
import { CATALOG_CATEGORIES, CATALOG_SERVICES } from "@/lib/managed-catalog";

const DAY = 86400000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

/* ----------------------------- Seed data ----------------------------- */
export const lawyerData: Array<{
  slug: string;
  name: string;
  avatarColor: string;
  title?: string;
  licenseNo: string;
  city: string;
  province: string;
  gender: string;
  experienceYears: number;
  specialties: string[];
  rating: number;
  reviewCount: number;
  caseCount: number;
  priceChat: number;
  priceVoice: number;
  priceVideo: number;
  topRated: boolean;
  fastResponder: boolean;
  contractExpert: boolean;
  responseTime: string;
  bio: string;
  about: string;
  services: string[];
  views: number;
  featured: boolean;
}> = [
  /* وکلای نمونه حذف شدند — وکیل فقط از مسیر ثبت‌نام واقعی + احراز هویت مدیر ساخته می‌شود.
     نوع آرایه برای سازگاری تایپ‌ها حفظ شده و عمداً خالی است. */
];

const reviewData: Array<{
  lawyerId: number;
  clientName: string;
  rating: number;
  comment: string;
  service?: string;
  createdAt: Date;
}> = [];

const contractData = [
  { slug: "aghrarname-ejare-melk", title: "قرارداد اجاره ملک (مسکونی/تجاری)", category: "اجاره", icon: "home", description: "قرارداد اجاره استاندارد و مطمئن با رعایت قانون روابط موجر و مستأجر.", useCase: "برای اجاره ملک مسکونی یا تجاری بین موجر و مستأجر؛ تعیین ودیعه، اجاره‌بها و مدت.", risks: ["نبود شرط تخلیه مشخص", "عدم تعیین دقیق هزینه‌های شارژ و آب/برق", "تاریخ وصول اجاره‌بها نامشخص"], keyClauses: ["مشخصات موجر و مستأجر", "ودیعه و اجاره‌بها و نحوه پرداخت", "مدت اجاره و شرط تمدید", "تعهدات موجر و مستأجر", "شرط تخلیه و خلع ید"], samplePrice: 250000, customPrice: 850000, popular: true, steps: ["مشخصات موجر", "مشخصات مستأجر", "مشخصات ملک", "مبلغ ودیعه و اجاره", "مدت اجاره", "شروط خاص", "تعهدات طرفین", "خروجی قرارداد"] },
  { slug: "aghrarname-kharid-forush-melk", title: "قرارداد خرید و فروش ملک", category: "خرید و فروش", icon: "home", description: "مبایعه‌نامه دقیق با تعیین محلس‌الوصول، زمان تحویل و ضمانت اجرا.", useCase: "برای انتقال قطعی مالکیت ملک با رعایت شرایط قانونی و مالیاتی.", risks: ["نبود ضمانت اجرای پرداخت", "مبهم بودن زمان تحویل", "مسئولیت مالیاتی نامشخص"], keyClauses: ["مشخصات طرفین و ملک", "ثمن و نحوه پرداخت", "زمان تحویل و تحویل سند", "ضمانت اجرای تخلف", "مسئولیت هزینه‌های انتقال"], samplePrice: 300000, customPrice: 950000, popular: true, steps: ["مشخصات خریدار و فروشنده", "مشخصات ملک", "مبلغ معامله", "نحوه پرداخت", "زمان تحویل", "شروط فسخ", "خروجی قرارداد"] },
  { slug: "aghrarname-mosharekat-madani", title: "قرارداد مشارکت مدنی", category: "مشارکت", icon: "briefcase", description: "تعیین دقیق سهم سود و زیان، مدیریت و خروج در مشارکت‌ها.", useCase: "برای مشارکت دو یا چند نفر در یک فعالیت اقتصادی با تقسیم سود و زیان.", risks: ["نامشخص بودن سهم سود و زیان", "نبود شرط خروج", "ابهام در مدیریت"], keyClauses: ["سهم هر طرف", "مدت مشارکت", "نحوه مدیریت", "تقسیم سود و زیان", "شرط خروج و فسخ"], samplePrice: 350000, customPrice: 1100000, popular: false, steps: ["مشخصات شرکا", "موضوع مشارکت", "سهم هر طرف", "مدت", "تقسیم سود", "شرط خروج", "خروجی قرارداد"] },
  { slug: "aghrarname-peymanchari-sakhteman", title: "قرارداد پیمانکاری ساختمان", category: "پیمانکاری", icon: "building", description: "تعهدات مقاطعه‌کار و پیمانکار با جریمه تأخیر و ضمانت حسن انجام کار.", useCase: "برای ساخت‌وساز و پروژه‌های عمرانی میان کارفرما و پیمانکار.", risks: ["نبود جریمه تأخیر", "ضمانت حسن انجام ناکافی", "تغییرات دامنه پروژه نامشخص"], keyClauses: ["دامنه کار", "مبلغ و زمان‌بندی پرداخت", "مدت اجرا و جریمه تأخیر", "ضمانت حسن انجام", "تسویه و تحویل"], samplePrice: 400000, customPrice: 1300000, popular: false, steps: ["مشخصات کارفرما و پیمانکار", "دامنه پروژه", "مبلغ و پرداخت", "مدت و جریمه", "ضمانت", "خروجی قرارداد"] },
  { slug: "aghrarname-estekhdam", title: "قرارداد استخدام", category: "استخدام", icon: "briefcase", description: "تعیین حقوق، ساعات کار، مرخصی و تعهدات طرفین مطابق قانون کار.", useCase: "برای رابطه کارگری-کارفرمایی با تعیین دستمزد و شرایط کار.", risks: ["دست‌مزد کمتر از حداقل قانونی", "نبود تعیین ساعات کار", "تعهد اضافه‌کاری نامشخص"], keyClauses: ["نوع کار و ساعت کاری", "دست‌مزد و مزایا", "مرخصی و بیمه", "مدت قرارداد", "شرایط اخراج"], samplePrice: 200000, customPrice: 700000, popular: true, steps: ["مشخصات کارگر و کارفرما", "نوع کار", "دست‌مزد", "ساعت کار", "بیمه و مرخصی", "خروجی قرارداد"] },
  { slug: "aghrarname-mahramiyat-nda", title: "قرارداد محرمانگی (NDA)", category: "قرارداد محرمانگی (NDA)", icon: "lock", description: "حفاظت از اطلاعات تجاری و اسرار با جریمه افشا.", useCase: "برای مذاکرات تجاری، استارتاپ‌ها و همکاری‌هایی که نیاز به رازداری دارند.", risks: ["تعریف مبهم از اطلاعات محرمانه", "نبود جریمه افشا", "مدت تعهد طولانی‌تر از ضرورت"], keyClauses: ["تعریف اطلاعات محرمانه", "تعهدات طرفین", "استثنائات", "مدت تعهد", "جریمه افشا"], samplePrice: 180000, customPrice: 600000, popular: false, steps: ["مشخصات طرفین", "تعریف اطلاعات محرمانه", "تعهدات", "مدت", "جریمه", "خروجی قرارداد"] },
  { slug: "aghrarname-sarmaye-gozari", title: "قرارداد سرمایه‌گذاری", category: "سرمایه‌گذاری", icon: "money", description: "تعیین سهم سرمایه‌گذار، حقوق مالکانه و خروج سرمایه‌گذار.", useCase: "برای جذب سرمایه در استارتاپ‌ها و کسب‌وکارها.", risks: ["سهم مالکانه ناعادلانه", "نبود شرط خروج سرمایه‌گذار", "حقوق رای نامشخص"], keyClauses: ["مبلغ سرمایه‌گذاری", "سهم مالکانه", "حقوق و تعهدات", "شرط خروج", "حل‌وفصل اختلاف"], samplePrice: 500000, customPrice: 1800000, popular: true, steps: ["مشخصات طرفین", "مبلغ سرمایه‌گذاری", "سهم مالکانه", "حقوق رای", "خروج", "خروجی قرارداد"] },
  { slug: "aghrarname-sherkat", title: "قرارداد شراکت (تأسیس)", category: "شراکت", icon: "building", description: "تأسیس شراکت با تعیین سهم، مدیریت و تقسیم سود.", useCase: "برای راه‌اندازی شرکتی با چند شریک.", risks: ["سهم ناعادلانه", "مدیریت نامشخص", "نبود شرط خروج شریک"], keyClauses: ["سهم هر شریک", "نحوه مدیریت", "تقسیم سود", "ورود و خروج شریک", "حل اختلاف"], samplePrice: 380000, customPrice: 1200000, popular: false, steps: ["مشخصات شرکا", "سهم‌ها", "مدیریت", "تقسیم سود", "خروج", "خروجی قرارداد"] },
  { slug: "dadkhasat-talaq-tavafoghi", title: "دادخواست طلاق توافقی", category: "دادخواست", icon: "gavel", description: "دادخواست استاندارد طلاق توافقی با تعیین شرایط توافق‌شده.", useCase: "برای ثبت درخواست طلاق توافقی در دادگاه خانواده.", risks: ["نقص مدارک توافق", "اشتباه در تعیین دادگاه صالح"], keyClauses: ["مشخصات زوجین", "نوع طلاق", "توافق مالی", "حضانت فرزندان", "خواسته"], samplePrice: 220000, customPrice: 750000, popular: true, steps: ["مشخصات زوجین", "نوع طلاق", "توافق مالی", "حضانت", "خواسته", "خروجی دادخواست"] },
  { slug: "shokavye-kolahbardari", title: "شکواییه کلاهبرداری", category: "شکواییه", icon: "gavel", description: "شکواییه کیفری برای طرح شکایت کلاهبرداری با ذکر وقایع و ادله.", useCase: "برای ثبت شکایت کیفری در دادسرا.", risks: ["نبود ادله کافی", "اشتباه در تعیین مرجع"], keyClauses: ["مشخصات شاکی و مشتکی‌عنه", "شرح وقایع", "ادله", "مستندات", "خواسته"], samplePrice: 200000, customPrice: 680000, popular: false, steps: ["مشخصات طرفین", "شرح وقایع", "ادله", "خواسته", "خروجی شکواییه"] },
  { slug: "ozharname-motalebe-vej", title: "اظهارنامه مطالبه وجه", category: "اظهارنامه", icon: "mail", description: "اظهارنامه رسمی برای مطالبه وجه چک یا طلب پیش از اقامه دعوا.", useCase: "برای اخطار رسمی مطالبه طلب از بدهکار.", risks: ["نبود مهلت منطقی", "اشتباه در مشخصات گیرنده"], keyClauses: ["مشخصات اظهارکننده و گیرنده", "موضوع طلب", "مبلغ", "مهلت پرداخت", "اخطار اقدام قانونی"], samplePrice: 150000, customPrice: 500000, popular: false, steps: ["مشخصات طرفین", "موضوع طلب", "مبلغ", "مهلت", "اخطار", "خروجی اظهارنامه"] },
  { slug: "aghrarname-namayandegi", title: "قرارداد نمایندگی فروش", category: "نمایندگی", icon: "truck", description: "اعطای نمایندگی فروش با تعیین منطقه، پورسانت و تعهدات.", useCase: "برای اعطای حق فروش محصولات در منطقه‌ای مشخص.", risks: ["منطقه نمایندگی نامشخص", "پورسانت مبهم", "نبود شرط انحصاری روشن"], keyClauses: ["منطقه نمایندگی", "پورسانت", "تعهدات نماینده", "مدت", "فسخ"], samplePrice: 280000, customPrice: 900000, popular: false, steps: ["مشخصات طرفین", "منطقه", "پورسانت", "تعهدات", "مدت", "خروجی قرارداد"] },
];

// articleData به src/data/articles-seed.ts منتقل شد (نسخه SEO/GEO/AEO با ۱۵۰۰+ واژه)

const qaData = [
  /* انتساب پاسخ‌ها فقط به تحریریهٔ حقوقی — هیچ وکیل جعلی در محتوا نمایش داده نمی‌شود؛
     پاسخ وکیل واقعی فقط با پروفایل تأییدشدهٔ ثبت‌نام‌شده در پلتفرم ظاهر می‌شود. */
  { slug: "check-bargasht-chi-konam", question: "اگر چک برگشت بخورد چه کنم؟", body: "چک ۵۰ میلیونی که از کارفرمام گرفته بودم برگشت خورده. مسیر قانونی چیست؟", answer: "نخست به بانک مراجعه و «گواهی عدم پرداخت» و نسخه اجرائیه را دریافت کنید. سپس می‌توانید از مسیر اجرائیه (سریع‌ترین روش وصول) یا شکایت کیفری/حقوقی اقدام کنید. برای طرح شکایت کیفری مهلت قانونی وجود دارد، بنابراین بدون تأخیر اقدام کنید. داشتن نشانی دقیق صادرکننده برای احضار ضروری است.", category: "چک و اسناد", lawyerName: "تحریریهٔ حقوقی دادورزان", lawyerTitle: "پاسخ بررسی‌شدهٔ حقوقی — حوزهٔ چک و اسناد", verified: true, helpful: 48, views: 8200, createdAt: daysAgo(3) },
  { slug: "mostager-che-konam", question: "مستأجر من سه ماه اجاره نداده، چه کار کنم؟", body: "مستأجر سه ماه اجاره‌بها نپرداخته و قرارداد رسمی دارم.", answer: "اگر قرارداد رسمی و دارای شرط تخلیه دارید، می‌توانید از طریق شورای حل اختلاف محل ملک، دادخواست تخلیه و مطالبه اجاره‌بها ثبت کنید. پیش از آن، ارسال اظهارنامه و اخطار رسمی توصیه می‌شود. در صورت عدم رسیدگی، حکم تخلیه با حضور مأمور اجرا انجام می‌شود.", category: "ملک", lawyerName: "تحریریهٔ حقوقی دادورزان", lawyerTitle: "پاسخ بررسی‌شدهٔ حقوقی — حوزهٔ ملک و اجاره", verified: true, helpful: 36, views: 6100, createdAt: daysAgo(7) },
  { slug: "modat-talaq-tavafoghi", question: "برای طلاق توافقی چه مدت زمان لازم است؟", body: "زن و شردر همه امور توافق داریم. چقدر طول می‌کشد؟", answer: "در طلاق توافقی که توافق کامل وجود دارد، فرایند معمولاً بین ۱ تا ۳ ماه طول می‌کشد؛ شامل ثبت دادخواست، تعیین جلسه، حضور در مشاور الزامی، صدور گواهی عدم امکان سازش و ثبت در محضر. با تنظیم دقیق توافق‌نامه پیش از دادخواست، روند تسریع می‌شود.", category: "خانواده", lawyerName: "تحریریهٔ حقوقی دادورزان", lawyerTitle: "پاسخ بررسی‌شدهٔ حقوقی — حوزهٔ خانواده", verified: true, helpful: 41, views: 5400, createdAt: daysAgo(11) },
  { slug: "check-siyadi-chist", question: "چک صیادی چیست و چه تفاوتی با چک عادی دارد؟", body: "بانک گفت چک صیادی است. معنی‌اش چیست؟", answer: "چک صیادی چکی است که در سامانه صیاد ثبت می‌شود و اطلاعات صادرکننده و گیرنده در آن ثبت می‌گردد. این چک‌ها ردیابی آسان‌تری دارند و در صورت برگشت، امکان پیگیری قانونی قوی‌تری فراهم می‌شود. گواهی عدم پرداخت این چک‌ها هم از سامانه صیاد صادر می‌شود.", category: "چک و اسناد", lawyerName: "تحریریهٔ حقوقی دادورزان", lawyerTitle: "پاسخ بررسی‌شدهٔ حقوقی — حوزهٔ چک و اسناد", verified: true, helpful: 29, views: 4700, createdAt: daysAgo(14) },
  { slug: "elzam-be-tanzim-sand", question: "الزام به تنظیم سند چگونه است؟", body: "ملکی خریده‌ام اما فروشنده حاضر به تنظیم سند رسمی نیست.", answer: "اگر مبایعه‌نامه معتبر دارید، می‌توانید با دادخواست «الزام به تنظیم سند رسمی» در دادگاه محل وقوع ملک، فروشنده را ملزم کنید. در صورت امتناع وی، دادگاه حکم تنظیم سند را صادر می‌کند و انتقال بدون حضور او نیز ممکن می‌شود. داشتن مبایعه‌نامه و مدارک پرداخت ثمن ضروری است.", category: "ملک", lawyerName: "تحریریهٔ حقوقی دادورزان", lawyerTitle: "پاسخ بررسی‌شدهٔ حقوقی — حوزهٔ ملک و ثبت", verified: true, helpful: 24, views: 3900, createdAt: daysAgo(18) },
  { slug: "khiyanat-dar-amanat", question: "خیانت در امانت چه زمانی محقق می‌شود؟", body: "سندی به کسی دادم که پس نداده. آیا خیانت در امانت است؟", answer: "خیانت در امانت زمانی محقق می‌شود که شخصی مالی که به عنوان امانت یا برای انجام کاری به او سپرده شده را پس ندهد یا مصرف کند. اثبات رابطه امانی و امتناع از بازگرداندن، ارکان جرم هستند. شکایت در دادسرا ثبت و در صورت احراز، تعقیب کیفری انجام می‌شود.", category: "کیفری", lawyerName: "تحریریهٔ حقوقی دادورزان", lawyerTitle: "پاسخ بررسی‌شدهٔ حقوقی — حوزهٔ کیفری", verified: true, helpful: 19, views: 3300, createdAt: daysAgo(22) },
];

/* ----------------------------- Provisioning ----------------------------- */
// Idempotent schema creation (best-effort fallback for a fresh DB;
// drizzle-kit push is the primary source of truth).
const DDL = [
  `DO $$ BEGIN CREATE TYPE case_status AS ENUM ('new','reviewing','matched','active','closed'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE consultation_type AS ENUM ('chat','voice','video'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE consultation_status AS ENUM ('pending','confirmed','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS lawyers (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, avatar_color TEXT NOT NULL DEFAULT '#15365d', photo_url TEXT, title TEXT NOT NULL DEFAULT 'وکیل پایه یک دادگستری', license_no TEXT NOT NULL, city TEXT NOT NULL, province TEXT NOT NULL, gender TEXT NOT NULL DEFAULT 'male', experience_years INTEGER NOT NULL DEFAULT 0, specialties TEXT[] NOT NULL DEFAULT '{}', rating REAL NOT NULL DEFAULT 0, review_count INTEGER NOT NULL DEFAULT 0, case_count INTEGER NOT NULL DEFAULT 0, price_chat INTEGER NOT NULL DEFAULT 0, price_voice INTEGER NOT NULL DEFAULT 0, price_video INTEGER NOT NULL DEFAULT 0, verified BOOLEAN NOT NULL DEFAULT true, top_rated BOOLEAN NOT NULL DEFAULT false, fast_responder BOOLEAN NOT NULL DEFAULT false, contract_expert BOOLEAN NOT NULL DEFAULT false, response_time TEXT NOT NULL DEFAULT 'کمتر از یک ساعت', bio TEXT NOT NULL DEFAULT '', about TEXT NOT NULL DEFAULT '', services TEXT[] NOT NULL DEFAULT '{}', views INTEGER NOT NULL DEFAULT 0, featured BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS photo_url TEXT`,
  `ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS lawyer_type TEXT NOT NULL DEFAULT 'wakil'`,
  `CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, client_name TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT NOT NULL, service TEXT, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS contracts (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'file', description TEXT NOT NULL, use_case TEXT NOT NULL, risks TEXT[] NOT NULL DEFAULT '{}', key_clauses TEXT[] NOT NULL DEFAULT '{}', sample_price INTEGER NOT NULL DEFAULT 0, custom_price INTEGER NOT NULL DEFAULT 0, popular BOOLEAN NOT NULL DEFAULT false, steps TEXT[] NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL, excerpt TEXT NOT NULL, content TEXT NOT NULL, quick_answer TEXT NOT NULL DEFAULT '', faq TEXT NOT NULL DEFAULT '[]', image_url TEXT, image_alt TEXT, read_time INTEGER NOT NULL DEFAULT 5, author TEXT NOT NULL DEFAULT 'تیم تحریریه دادورزان', author_role TEXT NOT NULL DEFAULT 'پژوهشگر حقوق', views INTEGER NOT NULL DEFAULT 0, published_at TIMESTAMP NOT NULL DEFAULT now())`,
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS quick_answer TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS faq TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT`,
  `ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_alt TEXT`,
  `CREATE TABLE IF NOT EXISTS qa_questions (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, question TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', answer TEXT NOT NULL, category TEXT NOT NULL, lawyer_name TEXT NOT NULL, lawyer_title TEXT NOT NULL DEFAULT 'وکیل پایه یک', verified BOOLEAN NOT NULL DEFAULT true, helpful INTEGER NOT NULL DEFAULT 0, views INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS cases (id SERIAL PRIMARY KEY, case_number TEXT NOT NULL, subject TEXT NOT NULL, description TEXT NOT NULL, city TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'ثبت اولیه', budget TEXT, contact_name TEXT NOT NULL, contact_phone TEXT NOT NULL, status case_status NOT NULL DEFAULT 'new', created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS consultations (id SERIAL PRIMARY KEY, lawyer_name TEXT, lawyer_id INTEGER, type consultation_type NOT NULL DEFAULT 'chat', duration INTEGER NOT NULL DEFAULT 30, client_name TEXT NOT NULL, client_phone TEXT NOT NULL, subject TEXT NOT NULL, scheduled_at TEXT, price NUMERIC(12,0) NOT NULL DEFAULT '0', status consultation_status NOT NULL DEFAULT 'pending', created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS tickets (id SERIAL PRIMARY KEY, ticket_number TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, category TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS page_views (id SERIAL PRIMARY KEY, path TEXT NOT NULL UNIQUE, views INTEGER NOT NULL DEFAULT 0, last_seen TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS app_users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, email TEXT UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'client', created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS app_documents (id SERIAL PRIMARY KEY, user_phone TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'مدرک', size INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  /* --- Additive, idempotent hardening (safe on both fresh and existing DBs) --- */
  `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP`,
  `ALTER TABLE consultations ADD COLUMN IF NOT EXISTS payment_ref TEXT`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS tracking_token TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cases_case_number_uniq ON cases (case_number)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS cases_tracking_token_uniq ON cases (tracking_token) WHERE tracking_token IS NOT NULL`,
  `DO $$ BEGIN ALTER TYPE consultation_status ADD VALUE IF NOT EXISTS 'payment_pending'; EXCEPTION WHEN undefined_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TYPE consultation_status ADD VALUE IF NOT EXISTS 'paid'; EXCEPTION WHEN undefined_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TYPE consultation_status ADD VALUE IF NOT EXISTS 'scheduled'; EXCEPTION WHEN undefined_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TYPE consultation_status ADD VALUE IF NOT EXISTS 'in_progress'; EXCEPTION WHEN undefined_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TYPE consultation_status ADD VALUE IF NOT EXISTS 'expired'; EXCEPTION WHEN undefined_object THEN null; END $$`,
  `DO $$ BEGIN ALTER TYPE consultation_status ADD VALUE IF NOT EXISTS 'refunded'; EXCEPTION WHEN undefined_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS lawyer_availability (id SERIAL PRIMARY KEY, lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, weekday INTEGER NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS lawyer_availability_rule_uniq ON lawyer_availability (lawyer_id, weekday, start_min)`,
  `CREATE TABLE IF NOT EXISTS payments (id SERIAL PRIMARY KEY, reference TEXT NOT NULL UNIQUE, order_type TEXT NOT NULL DEFAULT 'consultation', consultation_id INTEGER REFERENCES consultations(id) ON DELETE SET NULL, amount INTEGER NOT NULL, provider TEXT NOT NULL DEFAULT 'manual', status TEXT NOT NULL DEFAULT 'initiated', created_at TIMESTAMP NOT NULL DEFAULT now(), verified_at TIMESTAMP)`,
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS meta JSONB`,
  `CREATE TABLE IF NOT EXISTS qa_submissions (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT, question TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending_review', created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS events (id SERIAL PRIMARY KEY, event TEXT NOT NULL, path TEXT NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT now())`,
  /* --- ترجمهٔ محتوای پویا (مقالات/وکلا) برای زبان‌های غیر فارسی --- */
  `CREATE TABLE IF NOT EXISTS content_translations (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT now())`,
  /* Race-condition guard: one (lawyer, slot) pairing can never be booked twice. */
  `CREATE UNIQUE INDEX IF NOT EXISTS consultations_timeslot_uniq ON consultations (lawyer_id, starts_at) WHERE starts_at IS NOT NULL AND lawyer_id IS NOT NULL`,
  /* --- Managed Services (خدمات پیگیری و انجام امور) --- */
  `DO $$ BEGIN CREATE TYPE svc_classification AS ENUM ('ADMINISTRATIVE','INFORMATIONAL','DOCUMENT_SERVICE','PROFESSIONAL_LEGAL','REPRESENTATION','REQUIRES_REVIEW'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE svc_category AS ENUM ('CASE_FOLLOW_UP','JUDICIAL_OPERATIONS','ENFORCEMENT','REGISTRATION','TAX','ADMINISTRATIVE','DOCUMENTS','ORGANIZATIONS','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE svc_price_type AS ENUM ('FIXED','FROM','QUOTE','REQUIRES_REVIEW'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE svc_request_status AS ENUM ('DRAFT','SUBMITTED','REVIEWING','AWAITING_DOCUMENTS','QUOTED','AWAITING_PAYMENT','ASSIGNED','IN_PROGRESS','WAITING_EXTERNAL','COMPLETED','DELIVERED','CANCELLED','REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE svc_urgency AS ENUM ('LOW','NORMAL','HIGH','URGENT'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE svc_contact_preference AS ENUM ('PHONE','SMS','WHATSAPP','EMAIL','PORTAL'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE svc_contract_status AS ENUM ('NOT_REQUIRED','DRAFT','SENT','ACCEPTED','SIGNED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE svc_quote_status AS ENUM ('DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN CREATE TYPE svc_event_type AS ENUM ('created','review_started','documents_received','assigned','progress','waiting_external','result_received','completed','status_changed','note','payment_required','quote_ready','contract_required','cancelled','rejected','other'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE SEQUENCE IF NOT EXISTS service_request_seq START WITH 1000`,
  `CREATE TABLE IF NOT EXISTS service_categories (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT 'folder', sort_order INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS managed_services (id SERIAL PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, short_description TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', classification svc_classification NOT NULL DEFAULT 'ADMINISTRATIVE', category svc_category NOT NULL DEFAULT 'OTHER', icon TEXT NOT NULL DEFAULT 'folder', estimated_time TEXT NOT NULL DEFAULT '', price_type svc_price_type NOT NULL DEFAULT 'QUOTE', base_price INTEGER NOT NULL DEFAULT 0, requires_case_info BOOLEAN NOT NULL DEFAULT false, requires_documents BOOLEAN NOT NULL DEFAULT false, requires_lawyer BOOLEAN NOT NULL DEFAULT false, requires_supervision BOOLEAN NOT NULL DEFAULT false, active BOOLEAN NOT NULL DEFAULT false, featured BOOLEAN NOT NULL DEFAULT false, sort_order INTEGER NOT NULL DEFAULT 0, form_fields JSONB, required_docs JSONB, created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS service_requests (id SERIAL PRIMARY KEY, request_number TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, service_id INTEGER NOT NULL REFERENCES managed_services(id) ON DELETE RESTRICT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', answers JSONB, urgency svc_urgency NOT NULL DEFAULT 'NORMAL', city TEXT, organization TEXT, reference_number TEXT, case_number TEXT, requested_deadline TEXT, contact_preference svc_contact_preference NOT NULL DEFAULT 'PORTAL', status svc_request_status NOT NULL DEFAULT 'DRAFT', assigned_staff_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL, supervising_lawyer_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL, price INTEGER, payment_status TEXT NOT NULL DEFAULT 'unpaid', contract_status svc_contract_status NOT NULL DEFAULT 'NOT_REQUIRED', final_report TEXT, result_file_label TEXT, started_at TIMESTAMP, completed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS service_request_events (id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE, type svc_event_type NOT NULL DEFAULT 'note', title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL, created_by_name TEXT, visible_to_user BOOLEAN NOT NULL DEFAULT true, metadata JSONB, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS service_request_docs (id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE, uploaded_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL, uploader_role TEXT NOT NULL DEFAULT 'client', name TEXT NOT NULL, doc_type TEXT NOT NULL DEFAULT 'سند', size INTEGER NOT NULL DEFAULT 0, storage_key TEXT NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS service_quotes (id SERIAL PRIMARY KEY, request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE, subtotal INTEGER NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'IRR', expires_at TIMESTAMP, status svc_quote_status NOT NULL DEFAULT 'DRAFT', created_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS service_notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS service_audit_logs (id SERIAL PRIMARY KEY, request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE, action TEXT NOT NULL, actor_role TEXT, actor_id INTEGER, metadata JSONB, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS managed_services_category_idx ON managed_services (category)`,
  `CREATE INDEX IF NOT EXISTS managed_services_active_featured_idx ON managed_services (active, featured)`,
  `CREATE INDEX IF NOT EXISTS service_requests_user_idx ON service_requests (user_id)`,
  `CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests (status)`,
  `CREATE INDEX IF NOT EXISTS service_requests_staff_idx ON service_requests (assigned_staff_id)`,
  `CREATE INDEX IF NOT EXISTS service_requests_supervisor_idx ON service_requests (supervising_lawyer_id)`,
  `CREATE INDEX IF NOT EXISTS service_request_events_request_idx ON service_request_events (request_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS service_request_docs_request_idx ON service_request_docs (request_id)`,
  `CREATE INDEX IF NOT EXISTS service_quotes_request_idx ON service_quotes (request_id)`,
  `CREATE INDEX IF NOT EXISTS service_notifications_user_idx ON service_notifications (user_id, read)`,
  `CREATE INDEX IF NOT EXISTS service_audit_logs_request_idx ON service_audit_logs (request_id)`,
  /* --- بخش‌های محتوایی وردپرس‌مانند (سینک با پنل ادمین) --- */
  `CREATE TABLE IF NOT EXISTS glossary_terms (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, term TEXT NOT NULL, simple TEXT NOT NULL DEFAULT '', pro TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', related TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS laws (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, year TEXT NOT NULL DEFAULT '', authority TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'معتبر', subjects TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS judgments (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, court TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS legal_forms (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', docs TEXT NOT NULL DEFAULT '', steps TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT 'file', sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS membership_plans (id SERIAL PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'user', price INTEGER NOT NULL DEFAULT 0, "desc" TEXT NOT NULL DEFAULT '', features TEXT NOT NULL DEFAULT '', cta TEXT NOT NULL DEFAULT 'فعال‌سازی', href TEXT NOT NULL DEFAULT '/contact', highlight BOOLEAN NOT NULL DEFAULT false, active BOOLEAN NOT NULL DEFAULT true, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
];

export interface SeedCounts {
  lawyers: number;
  reviews: number;
  contracts: number;
  articles: number;
  qa: number;
}

/**
 * بخش‌های محتوایی وردپرس‌مانند — واژه‌نامه/قوانین/آرا/فرم‌ها/پلن‌ها.
 * فقط یک‌بار (نخستین بوت) از محتوای تحریریه سید می‌شود؛ نشانگر در platform_settings
 * ثبت می‌شود تا حذفِ کامل رکوردها توسط ادمین (مثلاً پلن‌ها) در بوت بعدی بازنویسی نشود.
 */
const CONTENT_SEED_KEY = "content_sections_seeded";

async function contentSeedMarkerExists(): Promise<boolean> {
  try {
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS platform_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '', updated_at TIMESTAMP NOT NULL DEFAULT now())`,
    );
    const res = await db.execute(
      sql`SELECT key FROM platform_settings WHERE key = ${CONTENT_SEED_KEY} LIMIT 1`,
    );
    const rows = (res as { rows?: unknown[] }).rows ?? [];
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function markContentSeedDone(): Promise<void> {
  try {
    await db.execute(
      sql`INSERT INTO platform_settings (key, value) VALUES (${CONTENT_SEED_KEY}, '1') ON CONFLICT (key) DO NOTHING`,
    );
  } catch {
    /* non-fatal */
  }
}

export async function seedContentSections(force = false): Promise<void> {
  if (!force && (await contentSeedMarkerExists())) return;
  try {
    const g = await db.select({ id: glossaryTerms.id }).from(glossaryTerms).limit(1);
    if (!g.length) {
      await db
        .insert(glossaryTerms)
        .values(
          GLOSSARY.map((x, i) => ({
            slug: x.slug,
            term: x.term,
            simple: x.simple,
            pro: x.pro,
            example: x.example ?? "",
            related: (x.related ?? []).join("،"),
            sortOrder: i,
          })),
        )
        .onConflictDoNothing();
    }
  } catch {
    /* non-fatal */
  }
  try {
    const l = await db.select({ id: laws.id }).from(laws).limit(1);
    if (!l.length) {
      await db
        .insert(laws)
        .values(
          LAWS.map((x, i) => ({
            slug: x.slug,
            name: x.name,
            year: x.year,
            authority: x.authority,
            status: x.status,
            subjects: x.subjects.join("،"),
            summary: x.summary,
            sortOrder: i,
          })),
        )
        .onConflictDoNothing();
    }
  } catch {
    /* non-fatal */
  }
  try {
    const j = await db.select({ id: judgments.id }).from(judgments).limit(1);
    if (!j.length) {
      await db
        .insert(judgments)
        .values(
          JUDGMENTS.map((x, i) => ({
            slug: x.slug,
            title: x.title,
            court: x.court,
            date: x.date,
            subject: x.subject,
            summary: x.summary,
            sortOrder: i,
          })),
        )
        .onConflictDoNothing();
    }
  } catch {
    /* non-fatal */
  }
  try {
    const f = await db.select({ id: legalForms.id }).from(legalForms).limit(1);
    if (!f.length) {
      await db
        .insert(legalForms)
        .values(
          LEGAL_FORMS.map((x, i) => ({
            slug: x.slug,
            name: x.name,
            description: x.desc,
            docs: x.docs.join("،"),
            steps: x.steps.join("،"),
            icon: x.icon,
            sortOrder: i,
          })),
        )
        .onConflictDoNothing();
    }
  } catch {
    /* non-fatal */
  }
  try {
    const p = await db.select({ id: membershipPlans.id }).from(membershipPlans).limit(1);
    if (!p.length) {
      await db
        .insert(membershipPlans)
        .values(
          PLANS_CATALOG.map((x, i) => ({
            key: x.key,
            name: x.name,
            icon: x.icon,
            price: x.price,
            desc: x.desc,
            features: x.features.join("،"),
            cta: x.cta,
            href: x.href,
            highlight: !!x.highlight,
            active: true,
            sortOrder: i,
          })),
        )
        .onConflictDoNothing();
    }
  } catch {
    /* non-fatal */
  }
  await markContentSeedDone();
}

/** Seed categories + services once (idempotent). */
export async function seedManagedServices(): Promise<void> {
  try {
    // Categories: catalog is the editorial source of truth → refresh name/
    // description/icon on every boot (services are NOT touched so admin edits persist).
    for (const c of CATALOG_CATEGORIES) {
      await db
        .insert(serviceCategories)
        .values(c)
        .onConflictDoUpdate({
          target: serviceCategories.slug,
          set: { name: c.name, description: c.description, icon: c.icon },
        });
    }
    for (const s of CATALOG_SERVICES) {
      await db.insert(managedServices).values(s as any).onConflictDoNothing({ target: managedServices.slug });
    }
  } catch {
    /* non-fatal */
  }
}

/** Demo operations accounts so the staff/supervisor workflow is testable.
 *  Only created on non-production databases; never seeded to production. */
export async function seedDemoOperators(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const demo = [
    { phone: "09000000001", name: "کارشناس عملیات دادورزان", role: "staff" },
    { phone: "09000000002", name: "دکتر ناظر حقوقی", role: "lawyer" },
    { phone: "09000000003", name: "ناظر ارشد دادورزان", role: "supervisor" },
  ];
  for (const d of demo) {
    try {
      await db
        .insert(users)
        .values({
          name: d.name,
          phone: d.phone,
          email: `${d.role}@demo.dadban.local`,
          passwordHash: hashPassword("demo1234"),
          role: d.role,
        })
        .onConflictDoNothing({ target: users.phone });
    } catch {
      /* non-fatal */
    }
  }
  // اتصال حساب دموی وکیل به نخستین پروفایل وکیل تا فلو «پروفایل حرفه‌ای من» کامل تست شود.
  try {
    await db.execute(
      sql`UPDATE app_users SET lawyer_id = (SELECT id FROM lawyers ORDER BY id LIMIT 1) WHERE phone = '09000000002' AND lawyer_id IS NULL`,
    );
  } catch {
    /* non-fatal */
  }
}

/**
 * اکانت‌های رسمی پلتفرم برای تست و تحویل (به درخواست مالک) — در پروداکشن هم ساخته می‌شوند.
 * Idempotent: با onConflictDoNothing روی شماره موبایل؛ اجرای تکراری هیچ تغییری نمی‌دهد.
 *   وکیل ۱ → 09120000001 / Dadban1404!  (متصل به پروفایل «دکتر سهراب محمدی» — تهران)
 *   وکیل ۲ → 09120000003 / Dadban1404!  (متصل به پروفایل «دکتر مهسا ابراهیمی» — تهران؛
 *          برای نمایش دو-سویهٔ جریان همکاری/ارجاع وکیل↔وکیل)
 *   موکل  → 09120000002 / Dadban1404!
 */
export async function seedPlatformAccounts(): Promise<void> {
  const rows = [
    { phone: "09120000001", name: "وکیل آزمایشی دادورزان", email: "lawyer.demo@dadban.ir", role: "lawyer" },
    { phone: "09120000002", name: "موکل آزمایشی دادورزان", email: "client.demo@dadban.ir", role: "client" },
    { phone: "09120000003", name: "وکیل آزمایشی دوم دادورزان", email: "lawyer2.demo@dadban.ir", role: "lawyer" },
  ];
  for (const d of rows) {
    try {
      await db
        .insert(users)
        .values({
          name: d.name,
          phone: d.phone,
          email: d.email,
          passwordHash: hashPassword("Dadban1404!"),
          role: d.role,
        })
        .onConflictDoNothing({ target: users.phone });
    } catch {
      /* non-fatal */
    }
  }
  // اتصال حساب‌های وکیل به پروفایل‌های وکیل مشخص تا کارتابل مشاوره، پیشنهادهای استان،
  // کارتابل همکاری/ارجاع و پنل کامل برای هر دو سوی جریان کار کند.
  try {
    await db.execute(
      sql`UPDATE app_users SET lawyer_id = (SELECT id FROM lawyers WHERE slug = 'sohrab-mohammadi' LIMIT 1) WHERE phone = '09120000001' AND lawyer_id IS NULL`,
    );
    await db.execute(
      sql`UPDATE app_users SET lawyer_id = (SELECT id FROM lawyers WHERE slug = 'mahsa-ebrahimi' LIMIT 1) WHERE phone = '09120000003' AND lawyer_id IS NULL`,
    );
  } catch {
    /* non-fatal */
  }
}

/* ---------------- Profile features migration (idempotent, once per process) ---------------- */
let profileSchemaReady = false;

/**
 * Additive migration for user profiles + favorites. Runs the statements once
 * per process; safe on both fresh and existing databases (production Neon DB
 * included — drizzle-kit push is unavailable at runtime there).
 */
export async function ensureProfileSchema(): Promise<void> {
  if (profileSchemaReady) return;
  const stmts = [
    // نوع وکیل — پیش‌نیاز ثبت‌نام مستقیم کارآموز وکالت (الگوی photo_url)
    `ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS lawyer_type TEXT NOT NULL DEFAULT 'wakil'`,
    `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS province TEXT`,
    `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS city TEXT`,
    `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_color TEXT NOT NULL DEFAULT '#15365d'`,
    `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS lawyer_id INTEGER REFERENCES lawyers(id) ON DELETE SET NULL`,
    `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS parent_lawyer_id INTEGER REFERENCES lawyers(id) ON DELETE CASCADE`,
    `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS team_permissions TEXT NOT NULL DEFAULT ''`,
    `CREATE TABLE IF NOT EXISTS favorite_lawyers (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE UNIQUE INDEX IF NOT EXISTS favorite_lawyers_uniq ON favorite_lawyers (user_id, lawyer_id)`,
    // پیشنهاد وکلای استان روی پرونده‌ها + گفتگوی رایگان موکل↔وکیل
    `CREATE TABLE IF NOT EXISTS case_offers (id SERIAL PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE, lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, message TEXT NOT NULL, price INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'sent', created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE UNIQUE INDEX IF NOT EXISTS case_offers_case_lawyer_uniq ON case_offers (case_id, lawyer_id)`,
    `CREATE TABLE IF NOT EXISTS case_offer_replies (id SERIAL PRIMARY KEY, offer_id INTEGER NOT NULL REFERENCES case_offers(id) ON DELETE CASCADE, sender TEXT NOT NULL, body TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS case_offer_replies_offer_idx ON case_offer_replies (offer_id, id)`,
    // یادآورهای پنل وکیل
    `CREATE TABLE IF NOT EXISTS lawyer_reminders (id SERIAL PRIMARY KEY, lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, title TEXT NOT NULL, note TEXT, due_at TIMESTAMP NOT NULL, done BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    // تیم وکیل — پرونده‌های سپرده‌شده به هر عضو
    `CREATE TABLE IF NOT EXISTS team_case_assignments (id SERIAL PRIMARY KEY, member_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE UNIQUE INDEX IF NOT EXISTS team_case_assign_uniq ON team_case_assignments (member_user_id, case_id)`,
    // همکاری و ارجاع پروندهٔ وکیل↔وکیل (دایرکتوری همکاران)
    `CREATE TABLE IF NOT EXISTS lawyer_referrals (id SERIAL PRIMARY KEY, from_lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, to_lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, kind TEXT NOT NULL DEFAULT 'referral', subject TEXT NOT NULL, description TEXT NOT NULL, city TEXT, budget INTEGER, message TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', response_note TEXT, responded_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS lawyer_referrals_to_idx ON lawyer_referrals (to_lawyer_id, status)`,
    `CREATE INDEX IF NOT EXISTS lawyer_referrals_from_idx ON lawyer_referrals (from_lawyer_id, status)`,
    // ترجمهٔ محتوای پویا (مقالات/وکلا) — کش دائمی روی DB
    `CREATE TABLE IF NOT EXISTS content_translations (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT now())`,
    // اعلان‌های درون‌برنامه‌ای همهٔ کاربران (ثبت پرونده → وکیل، پیشنهاد → موکل، پذیرش → وکیل)
    `CREATE TABLE IF NOT EXISTS user_notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, type TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', link TEXT, meta JSONB, read BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS user_notifications_user_idx ON user_notifications (user_id, read)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      /* non-fatal — push is primary on dev */
    }
  }
  profileSchemaReady = true;
}


export function getCounts(): SeedCounts {
  return {
    lawyers: lawyerData.length,
    reviews: reviewData.length,
    contracts: contractData.length,
    articles: articleData.length,
    qa: qaData.length,
  };
}

async function insertAll() {
  // وکلای نمونه/نظرات نمونه دیگر درج نمی‌شوند — وکیل فقط از مسیر ثبت‌نام واقعی + احراز هویت مدیر ساخته می‌شود.
  if (lawyerData.length) await db.insert(lawyers).values(lawyerData.map((l) => ({ ...l, photoUrl: `/lawyers/${l.slug}.jpg` })));
  if (reviewData.length) await db.insert(reviews).values(reviewData);
  if (contractData.length) await db.insert(contracts).values(contractData);
  if (articleData.length) await db.insert(articles).values(articleData);
  if (qaData.length) await db.insert(qaQuestions).values(qaData);
}

/**
 * Backfill photo_url for lawyers created before photos existed (idempotent, cheap).
 * Photo files live at /lawyers/{slug}.jpg — see scripts/gen-lawyer-photos.ts.
 */
export async function ensureLawyerPhotos(): Promise<void> {
  try {
    if (!lawyerData.length) return; // وکلای نمونه حذف شده‌اند — کاری برای انجام دادن نیست
    await db.execute(sql.raw(`ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS photo_url TEXT`));
    const slugList = lawyerData.map((l) => `'${l.slug}'`).join(", ");
    await db.execute(
      sql.raw(`UPDATE lawyers SET photo_url = '/lawyers/' || slug || '.jpg' WHERE photo_url IS NULL AND slug IN (${slugList})`),
    );
  } catch {
    /* non-fatal */
  }
}

/**
 * آپگرید محتوای مقالات: اگر نسخه‌ی seed جدیدتر/بلندتر از دیتابیس باشد،
 * مقالات موجود با محتوای تحریریه‌ی جدید بازنویسی می‌شوند (بدون دست‌زدن به بازدید و تاریخ).
 */
async function upgradeArticles(): Promise<void> {
  if (!articleData.length) return;
  try {
    // مهاجرت ستون‌های جدید — idempotent و در هر دو مسیر (fast-path هم لازم است)
    await db.execute(sql.raw(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS quick_answer TEXT NOT NULL DEFAULT ''`));
    await db.execute(sql.raw(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS faq TEXT NOT NULL DEFAULT '[]'`));
    await db.execute(sql.raw(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_url TEXT`));
    await db.execute(sql.raw(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_alt TEXT`));
    const probe = await db.execute(
      sql`SELECT LENGTH(content) AS l FROM articles WHERE slug = ${articleData[0].slug} LIMIT 1`,
    );
    const rows = (probe as { rows?: { l?: number }[] }).rows ?? [];
    const dbLen = Number(rows[0]?.l ?? 0);
    const seedLen = articleData[0].content.length;
    if (dbLen >= seedLen) return; // قبلاً آپگرید شده
    for (const a of articleData) {
      await db
        .insert(articles)
        .values(a)
        .onConflictDoUpdate({
          target: articles.slug,
          set: {
            title: a.title,
            category: a.category,
            excerpt: a.excerpt,
            content: a.content,
            quickAnswer: a.quickAnswer ?? "",
            faq: a.faq ?? "[]",
            imageUrl: a.imageUrl ?? null,
            imageAlt: a.imageAlt ?? null,
            readTime: a.readTime,
          },
        });
    }
  } catch {
    /* non-fatal — push/seed بعداً انجام می‌شود */
  }
}

/** Manual re-seed: wipe and re-insert. */
export async function seedAll(): Promise<SeedCounts> {
  await db.execute(
    sql`TRUNCATE lawyers, reviews, contracts, articles, qa_questions RESTART IDENTITY CASCADE`,
  );
  await insertAll();
  return getCounts();
}

/**
 * Automatic provisioning: ensure tables exist and seed only if empty.
 * Safe to run on every server start.
 */
export async function ensureSeeded(): Promise<{ seeded: boolean; counts: SeedCounts }> {
  // Fast path: if core tables already exist, skip the 50+ DDL statements that
  // otherwise run on every serverless cold start and exhaust the connection pool.
  try {
    const existing = await db.execute(sql`SELECT COUNT(*)::int AS c FROM lawyers`);
    const existingRows = (existing as { rows?: unknown[] }).rows ?? [];
    const existingCount = Number((existingRows[0] as { c?: number })?.c ?? 0);
    if (existingCount > 0) {
      try {
        await ensureProfileSchema();
        await ensureExtendedSchema();
        await seedManagedServices();
        await seedContentSections();
        await seedDemoOperators();
        await seedPlatformAccounts(); // اکانت‌های وکیل/موکل تحویل — در پروداکشن هم
        await ensureLawyerPhotos();
        await upgradeArticles();
      } catch {
        /* non-fatal */
      }
      return { seeded: false, counts: getCounts() };
    }
  } catch {
    /* tables missing — fall through to full DDL */
  }

  for (const stmt of DDL) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      /* ignore — push is primary */
    }
  }
  try {
    await ensureProfileSchema();
    await ensureExtendedSchema();
  } catch {
    /* non-fatal */
  }
  // Managed Services catalog + (non-prod) demo operations accounts.
  try {
    await seedManagedServices();
    await seedContentSections();
    await seedDemoOperators();
    await seedPlatformAccounts(); // اکانت‌های وکیل/موکل تحویل — در پروداکشن هم
  } catch {
    /* non-fatal */
  }
  try {
    const res = await db.execute(sql`SELECT COUNT(*)::int AS c FROM lawyers`);
    const arr = (res as { rows?: unknown[] }).rows ?? [];
    const c = Number((arr[0] as { c?: number })?.c ?? 0);
    // Always add missing articles/QA (new content), never overwrite existing.
    try {
      await db.insert(articles).values(articleData).onConflictDoNothing({ target: articles.slug });
      await db.insert(qaQuestions).values(qaData).onConflictDoNothing({ target: qaQuestions.slug });
    } catch {
      /* non-fatal */
    }
    // Availability rules (شنبه تا پنجشنبه ۹ تا ۱۸ به وقت تهران) for lawyers
    // that have none yet — the real basis of the booking calendar.
    try {
      const rules = lawyerData.flatMap((_, i) =>
        [0, 1, 2, 3, 4].map((weekday) => ({
          lawyerId: i + 1,
          weekday,
          startMin: 9 * 60,
          endMin: 18 * 60,
        })),
      );
      for (const rule of rules) {
        await db
          .insert(lawyerAvailability)
          .values(rule)
          .onConflictDoNothing()
          .catch(() => {});
      }
    } catch {
      /* non-fatal */
    }
    if (c > 0) return { seeded: false, counts: getCounts() };
    // فهرست وکلا خالی است → هرگز وکیل نمونه ساخته نمی‌شود. وکیل واقعی فقط از
    // مسیر ثبت‌نام + تأیید ادمین (lawyers.verified) وارد فهرست عمومی می‌شود.
    // فقط محتوای تحریریه (قراردادها) ایدمپوتنت درج می‌شود تا بوت بعدی تکرار نشود.
    if (contractData.length) {
      await db.insert(contracts).values(contractData).onConflictDoNothing({ target: contracts.slug });
    }
    return { seeded: true, counts: getCounts() };
  } catch {
    return { seeded: false, counts: getCounts() };
  }
}

/** جدول سیگنالینگ مشاوره زنده — best-effort روی دیتابیس واقعی. */
let signalSchemaReady = false;
export async function ensureSignalSchema(): Promise<void> {
  if (signalSchemaReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS consultation_signals (id SERIAL PRIMARY KEY, room TEXT NOT NULL, client_id TEXT NOT NULL, sender TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS consultation_signals_room_idx ON consultation_signals (room, id)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      /* non-fatal */
    }
  }
  signalSchemaReady = true;
}

/**
 * جداول گفتگوی موکل-وکیل و حضور آنلاین وکلا — best-effort.
 * (consult_messages + lawyer_presence — بدون نیاز به مایگریشن دستی در پروداکشن)
 */
let consultSchemaReady = false;
export async function ensureConsultSchema(): Promise<void> {
  if (consultSchemaReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS consult_messages (id SERIAL PRIMARY KEY, room_id TEXT NOT NULL, lawyer_slug TEXT NOT NULL, sender TEXT NOT NULL, name TEXT NOT NULL, body TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS consult_messages_room_idx ON consult_messages (room_id, id)`,
    `CREATE INDEX IF NOT EXISTS consult_messages_lawyer_idx ON consult_messages (lawyer_slug, created_at)`,
    `CREATE TABLE IF NOT EXISTS lawyer_presence (slug TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'offline', last_ping_at TIMESTAMP NOT NULL DEFAULT now())`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      /* non-fatal */
    }
  }
  consultSchemaReady = true;
}

/**
 * جداول «اعتماد و عملیات» — احراز پیامکی (OTP)، صندوق ایمیل، خبرنامه،
 * خطایابی داخلی، مدارک پرونده، روی‌بوردینگ وکیل و بازبینی حقوقی.
 * همان الگوی ensure*های بالا: best-effort، بدون مایگریشن دستی در پروداکشن.
 */
let extendedSchemaReady = false;
export async function ensureExtendedSchema(): Promise<void> {
  if (extendedSchemaReady) return;
  const stmts = [
    `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false`,
    /* ── احراز هویت وکلا: آپلود مدارک در پنل وکیل + صف بررسی ادمین ── */
    `ALTER TABLE lawyers ADD COLUMN IF NOT EXISTS employee_lawyer BOOLEAN NOT NULL DEFAULT false`,
    `CREATE TABLE IF NOT EXISTS lawyer_verifications (id SERIAL PRIMARY KEY, lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'pending', license_name TEXT NOT NULL DEFAULT '', license_mime TEXT NOT NULL DEFAULT '', license_size INTEGER NOT NULL DEFAULT 0, license_data BYTEA, id_name TEXT NOT NULL DEFAULT '', id_mime TEXT NOT NULL DEFAULT '', id_size INTEGER NOT NULL DEFAULT 0, id_data BYTEA, degree_name TEXT NOT NULL DEFAULT '', degree_mime TEXT NOT NULL DEFAULT '', degree_size INTEGER NOT NULL DEFAULT 0, degree_data BYTEA, note TEXT NOT NULL DEFAULT '', admin_note TEXT, reviewed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS lawyer_verifications_status_idx ON lawyer_verifications (status, created_at)`,
    `CREATE INDEX IF NOT EXISTS lawyer_verifications_lawyer_idx ON lawyer_verifications (lawyer_id)`,
    /* --- بخش‌های محتوایی وردپرس‌مانند (در هر دو مسیر بوت ساخته می‌شوند) --- */
    `CREATE TABLE IF NOT EXISTS glossary_terms (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, term TEXT NOT NULL, simple TEXT NOT NULL DEFAULT '', pro TEXT NOT NULL DEFAULT '', example TEXT NOT NULL DEFAULT '', related TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS laws (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, year TEXT NOT NULL DEFAULT '', authority TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'معتبر', subjects TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS judgments (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, court TEXT NOT NULL DEFAULT '', date TEXT NOT NULL DEFAULT '', subject TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS legal_forms (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', docs TEXT NOT NULL DEFAULT '', steps TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT 'file', sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS membership_plans (id SERIAL PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'user', price INTEGER NOT NULL DEFAULT 0, "desc" TEXT NOT NULL DEFAULT '', features TEXT NOT NULL DEFAULT '', cta TEXT NOT NULL DEFAULT 'فعال‌سازی', href TEXT NOT NULL DEFAULT '/contact', highlight BOOLEAN NOT NULL DEFAULT false, active BOOLEAN NOT NULL DEFAULT true, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS otp_codes (id SERIAL PRIMARY KEY, phone TEXT NOT NULL, purpose TEXT NOT NULL, code_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, expires_at TIMESTAMP NOT NULL, consumed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS otp_codes_phone_purpose_idx ON otp_codes (phone, purpose, created_at)`,
    `CREATE TABLE IF NOT EXISTS email_outbox (id SERIAL PRIMARY KEY, to_email TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'broadcast', subject TEXT NOT NULL, body_html TEXT NOT NULL DEFAULT '', body_text TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'logged', provider TEXT NOT NULL DEFAULT 'log', error TEXT, sent_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS email_outbox_created_idx ON email_outbox (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS app_errors (id SERIAL PRIMARY KEY, level TEXT NOT NULL DEFAULT 'error', source TEXT NOT NULL DEFAULT 'server', message TEXT NOT NULL, stack TEXT, url TEXT, user_id INTEGER, user_agent TEXT, meta JSONB, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS app_errors_created_idx ON app_errors (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS case_documents (id SERIAL PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE, uploaded_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL, uploader_role TEXT NOT NULL DEFAULT 'client', name TEXT NOT NULL, mime TEXT NOT NULL DEFAULT 'application/octet-stream', size INTEGER NOT NULL DEFAULT 0, data BYTEA NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS case_documents_case_idx ON case_documents (case_id)`,
    `CREATE TABLE IF NOT EXISTS lawyer_onboarding (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, license_no TEXT NOT NULL, lawyer_type TEXT NOT NULL DEFAULT 'wakil', city TEXT NOT NULL, province TEXT NOT NULL, experience_years INTEGER NOT NULL DEFAULT 0, specialties TEXT[] NOT NULL DEFAULT '{}', bio TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', admin_note TEXT, agreement_version TEXT, agreement_signed_at TIMESTAMP, reviewed_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS lawyer_onboarding_status_idx ON lawyer_onboarding (status, created_at)`,
    `CREATE TABLE IF NOT EXISTS legal_reviews (id SERIAL PRIMARY KEY, page_slug TEXT NOT NULL UNIQUE, reviewer_name TEXT NOT NULL, reviewer_title TEXT NOT NULL DEFAULT 'وکیل دادگستری', summary TEXT NOT NULL DEFAULT '', reviewed_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS vault_documents (id SERIAL PRIMARY KEY, user_phone TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'سایر', mime TEXT NOT NULL DEFAULT 'application/octet-stream', size INTEGER NOT NULL DEFAULT 0, encrypted BOOLEAN NOT NULL DEFAULT false, kdf_salt TEXT, key_check TEXT, data BYTEA NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS vault_documents_user_idx ON vault_documents (user_phone, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS telegram_links (id SERIAL PRIMARY KEY, chat_id TEXT NOT NULL UNIQUE, phone TEXT, active BOOLEAN NOT NULL DEFAULT true, last_message_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS telegram_links_phone_idx ON telegram_links (phone)`,
    /* ── بستهٔ میز کار وکیل: سبک نگارش، کش متن اسناد، تحلیل پرونده، شبیه‌سازی دادگاه ── */
    `CREATE TABLE IF NOT EXISTS lawyer_style (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE, tone TEXT NOT NULL DEFAULT 'formal', fixed_opening TEXT NOT NULL DEFAULT '', fixed_closing TEXT NOT NULL DEFAULT '', samples TEXT NOT NULL DEFAULT '[]', traits TEXT NOT NULL DEFAULT '', updated_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS case_doc_texts (id SERIAL PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE, document_id INTEGER NOT NULL UNIQUE REFERENCES case_documents(id) ON DELETE CASCADE, text TEXT NOT NULL, chars INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS case_doc_texts_case_idx ON case_doc_texts (case_id)`,
    `CREATE TABLE IF NOT EXISTS case_analyses (id SERIAL PRIMARY KEY, case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE, created_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL, doc_count INTEGER NOT NULL DEFAULT 0, overview TEXT NOT NULL DEFAULT '', strengths TEXT NOT NULL DEFAULT '', weaknesses TEXT NOT NULL DEFAULT '', contradictions TEXT NOT NULL DEFAULT '', missing_docs TEXT NOT NULL DEFAULT '', next_steps TEXT NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS case_analyses_case_idx ON case_analyses (case_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS court_sessions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE, case_id INTEGER REFERENCES cases(id) ON DELETE SET NULL, scenario TEXT NOT NULL DEFAULT '', messages TEXT NOT NULL DEFAULT '[]', turns INTEGER NOT NULL DEFAULT 0, feedback TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'active', title TEXT NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT now(), updated_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS court_sessions_user_idx ON court_sessions (user_id, created_at DESC)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      /* non-fatal — هر مسیر مصرف‌کننده خودش در نبود جدول degraded می‌شود */
    }
  }
  extendedSchemaReady = true;
}

/**
 * جداول CMS و تالار گفتگو — «محتوای صفحات»، «رسانه (عکس‌های ادمین)» و «فروم».
 * همان الگوی ensure*های بالا: best-effort، بدون مایگریشن دستی در پروداکشن.
 * (site_content + media + forum_topics + forum_replies)
 */
let cmsSchemaReady = false;
export async function ensureCmsSchema(): Promise<void> {
  if (cmsSchemaReady) return;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS site_content (id SERIAL PRIMARY KEY, page TEXT NOT NULL, section TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT 'text', title TEXT NOT NULL DEFAULT '', subtitle TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', image_url TEXT, link TEXT, link_label TEXT, active BOOLEAN NOT NULL DEFAULT true, sort_order INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS site_content_page_idx ON site_content (page, sort_order)`,
    `CREATE TABLE IF NOT EXISTS media (id SERIAL PRIMARY KEY, filename TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL DEFAULT 'image/png', size INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, uploaded_by TEXT NOT NULL DEFAULT 'admin', created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE TABLE IF NOT EXISTS forum_topics (id SERIAL PRIMARY KEY, user_id INTEGER, author_name TEXT NOT NULL DEFAULT 'مهمان', author_role TEXT NOT NULL DEFAULT 'guest', title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'گفتگوی آزاد', views INTEGER NOT NULL DEFAULT 0, pinned BOOLEAN NOT NULL DEFAULT false, status TEXT NOT NULL DEFAULT 'visible', created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS forum_topics_list_idx ON forum_topics (status, pinned, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS forum_replies (id SERIAL PRIMARY KEY, topic_id INTEGER NOT NULL, user_id INTEGER, author_name TEXT NOT NULL DEFAULT 'مهمان', author_role TEXT NOT NULL DEFAULT 'guest', body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'visible', created_at TIMESTAMP NOT NULL DEFAULT now())`,
    `CREATE INDEX IF NOT EXISTS forum_replies_topic_idx ON forum_replies (topic_id, created_at)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      /* non-fatal */
    }
  }
  cmsSchemaReady = true;
}
