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
} from "@/db/schema";
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
  { slug: "sohrab-mohammadi", name: "دکتر سهراب محمدی", avatarColor: "#15365d", title: "وکیل پایه یک دادگستری", licenseNo: "۱۲۳۴۵/تهران", city: "تهران", province: "تهران", gender: "male", experienceYears: 16, specialties: ["خانواده", "طلاق", "ارث"], rating: 4.9, reviewCount: 312, caseCount: 540, priceChat: 120000, priceVoice: 350000, priceVideo: 600000, topRated: true, fastResponder: true, contractExpert: false, responseTime: "کمتر از ۳۰ دقیقه", bio: "متخصص دعاوی خانواده با ۱۶ سال سابقه؛ تمرکز بر طلاق توافقی و یک‌طرفه، مهریه و حضانت.", about: "دکتر سهراب محمدی دانش‌آموخته حقوق خصوصی و عضو کانون وکلای دادگستری مرکز است. ایشان با رویکرد میانجی‌گری، تلاش می‌کند دعاوی خانواده با کمترین تنش و در کوتاه‌ترین زمان به نتیجه برسد. تجربه گسترده در پرونده‌های مهریه، نفقه، اجرت‌المثل و حضانت را داراست.", services: ["مشاوره طلاق توافقی", "مطالبه مهریه", "حضانت فرزندان", "تنظیم دادخواست خانواده"], views: 8420, featured: true },
  { slug: "neda-karimi", name: "ندا کریمی", avatarColor: "#946809", title: "وکیل پایه یک دادگستری", licenseNo: "۸۷۶۵۴/اصفهان", city: "اصفهان", province: "اصفهان", gender: "female", experienceYears: 12, specialties: ["ملک", "قراردادها"], rating: 4.8, reviewCount: 198, caseCount: 360, priceChat: 100000, priceVoice: 300000, priceVideo: 500000, topRated: true, fastResponder: false, contractExpert: true, responseTime: "کمتر از ۲ ساعت", bio: "وکیل تخصصی املاک؛ تخلیه، الزام به تنظیم سند، تصرف عدوانی و تنظیم قرارداد اجاره.", about: "خانم ندا کریمی عضو کانون وکلای استان اصفهان و متخصص حقوق ملک است. ایشان در زمینه دعاوی تخلیه، مطالبه اجاره‌بها، الزام به تنظیم سند رسمی و تصرف عدوانی تجربه گسترده‌ای دارد و قراردادهای اجاره امن تهیه می‌کند.", services: ["تخلیه ملک", "الزام به تنظیم سند", "تصرف عدوانی", "تنظیم قرارداد اجاره"], views: 5310, featured: true },
  { slug: "amirhossein-rostami", name: "امیرحسین رستمی", avatarColor: "#1d6a3f", title: "وکیل پایه یک دادگستری", licenseNo: "۴۵۳۲۱/خراسان رضوی", city: "مشهد", province: "خراسان رضوی", gender: "male", experienceYears: 9, specialties: ["کیفری", "قراردادها"], rating: 4.7, reviewCount: 142, caseCount: 210, priceChat: 110000, priceVoice: 320000, priceVideo: 520000, topRated: false, fastResponder: true, contractExpert: false, responseTime: "کمتر از یک ساعت", bio: "دفاع کیفری در جرایم کلاهبرداری، خیانت در امانت، جعل و سرقت؛ پاسخ‌گویی سریع.", about: "آقای امیرحسین رستمی وکیل پایه یک و عضو کانون وکلای خراسان رضوی است. تخصص ایشان دعاوی کیفری به‌ویژه کلاهبرداری، خیانت در امانت، جعل و سرقت است و در مرحله دادسرا و دادگاه دفاع می‌کند.", services: ["شکایت کلاهبرداری", "دفاع کیفری", "تنظیم شکواییه", "اعاده اعتبار"], views: 4120, featured: true },
  { slug: "mahsa-ebrahimi", name: "دکتر مهسا ابراهیمی", avatarColor: "#7a2e7d", title: "وکیل پایه یک دادگستری", licenseNo: "۹۹۱۱۲/تهران", city: "تهران", province: "تهران", gender: "female", experienceYears: 14, specialties: ["قراردادها", "تجارت", "شرکت‌ها"], rating: 5.0, reviewCount: 267, caseCount: 430, priceChat: 150000, priceVoice: 400000, priceVideo: 700000, topRated: true, fastResponder: true, contractExpert: true, responseTime: "کمتر از یک ساعت", bio: "متخصص حقوق قراردادها و شرکت‌ها؛ تنظیم و بررسی قراردادهای تجاری و بین‌المللی.", about: "دکتر مهسا ابراهیمی دکترای حقوق تجاری و مشاور حقوقی چند شرکت بزرگ است. تخصص ایشان تنظیم و بازبینی قراردادهای تجاری، مشارکت، تأمین و قراردادهای استارتاپی است و به کسب‌وکارها مشاوره ثابت می‌دهد.", services: ["تنظیم قرارداد تجاری", "بررسی قرارداد", "مشاوره شرکت‌ها", "قرارداد سرمایه‌گذاری"], views: 7240, featured: true },
  { slug: "reza-najafi", name: "رضا نجفی", avatarColor: "#2a5d8f", title: "وکیل پایه یک دادگستری", licenseNo: "۳۳۰۹۸/آذربایجان شرقی", city: "تبریز", province: "آذربایجان شرقی", gender: "male", experienceYears: 18, specialties: ["تجارت", "شرکت‌ها", "مالیاتی"], rating: 4.6, reviewCount: 121, caseCount: 280, priceChat: 130000, priceVoice: 360000, priceVideo: 580000, topRated: false, fastResponder: false, contractExpert: true, responseTime: "کمتر از ۳ ساعت", bio: "حقوق تجارت و شرکت‌ها با ۱۸ سال سابقه؛ ثبت، تغییرات و دعاوی تجاری.", about: "آقای رضا نجفی از وکلای باتجربه استان آذربایجان شرقی در حوزه تجارت و شرکت‌هاست. ایشان در ثبت شرکت، تنظیم صورتجلسات و دعاوی تجاری فعالیت دارد.", services: ["ثبت شرکت", "دعاوی تجاری", "مشاوره مالیاتی", "تغییرات شرکت"], views: 2980, featured: false },
  { slug: "sara-mousavi", name: "سارا موسوی", avatarColor: "#b07d12", title: "وکیل پایه یک دادگستری", licenseNo: "۲۲۳۱۱/فارس", city: "شیراز", province: "فارس", gender: "female", experienceYears: 11, specialties: ["ارث", "خانواده"], rating: 4.8, reviewCount: 156, caseCount: 240, priceChat: 95000, priceVoice: 280000, priceVideo: 480000, topRated: true, fastResponder: false, contractExpert: false, responseTime: "کمتر از ۲ ساعت", bio: "متخصص امور حسبی؛ انحصار وراثت، تقسیم ترکه و وصیت‌نامه.", about: "خانم سارا موسوی عضو کانون وکلای فارس و متخصص امور ارث و انحصار وراثت است. ایشان در اخذ گواهی انحصار وراثت، تقسیم ترکه و حل‌وفصل اختلافات وراث تجربه دارد.", services: ["انحصار وراثت", "تقسیم ترکه", "وصیت‌نامه", "دعاوی ارث"], views: 3650, featured: false },
  { slug: "kaveh-ahmadi", name: "کاوه احمدی", avatarColor: "#8f2a2a", title: "وکیل پایه یک دادگستری", licenseNo: "۷۷۰۱۲/البرز", city: "کرج", province: "البرز", gender: "male", experienceYears: 8, specialties: ["چک و اسناد", "قراردادها"], rating: 4.7, reviewCount: 178, caseCount: 320, priceChat: 90000, priceVoice: 260000, priceVideo: 440000, topRated: false, fastResponder: true, contractExpert: false, responseTime: "کمتر از یک ساعت", bio: "متخصص چک برگشتی، سفته و مطالبات؛ پیگیری سریع از طریق اجرائیه.", about: "آقای کاوه احمدی وکیل پایه یک و متخصص اسناد تجاری است. ایشان در مطالبه وجه چک برگشتی، سفته و وصول مطالبات از مسیر اجرائیه و دعاوی حقوقی تخصص دارد و پاسخ‌گویی سریعی ارائه می‌دهد.", services: ["مطالبه چک برگشتی", "اجرائیه", "تنظیم اظهارنامه", "وصول مطالبات"], views: 4870, featured: false },
  { slug: "leila-sadeghi", name: "دکتر لیلا صادقی", avatarColor: "#0e7c7b", title: "وکیل پایه یک دادگستری", licenseNo: "۶۶۵۴۳/گیلان", city: "رشت", province: "گیلان", gender: "female", experienceYears: 13, specialties: ["خانواده", "طلاق"], rating: 4.9, reviewCount: 203, caseCount: 380, priceChat: 105000, priceVoice: 300000, priceVideo: 520000, topRated: true, fastResponder: true, contractExpert: false, responseTime: "کمتر از یک ساعت", bio: "وکیل خانواده؛ متخصص مهریه، نفقه و اجرت‌المثل با رویکرد حل مسالمت‌آمیز.", about: "دکتر لیلا صادقی عضو کانون وکلای گیلان و متخصص دعاوی خانواده است. ایشان با تمرکز بر حقوق زنان، در پرونده‌های مهریه، نفقه، اجرت‌المثل و طلاق فعالیت دارد.", services: ["مطالبه مهریه", "نفقه و اجرت‌المثل", "طلاق توافقی", "حضانت"], views: 5920, featured: false },
  { slug: "mohammadreza-ghasemi", name: "محمدرضا قاسمی", avatarColor: "#444b8f", title: "وکیل پایه یک دادگستری", licenseNo: "۵۵۰۲۳/خوزستان", city: "اهواز", province: "خوزستان", gender: "male", experienceYears: 15, specialties: ["مالیاتی", "شرکت‌ها"], rating: 4.5, reviewCount: 98, caseCount: 170, priceChat: 140000, priceVoice: 380000, priceVideo: 620000, topRated: false, fastResponder: false, contractExpert: true, responseTime: "کمتر از ۴ ساعت", bio: "متخصص دعاوی مالیاتی و گمرکی؛ دفاع در کمیسیون‌های مالیاتی.", about: "آقای محمدرضا قاسمی وکیل پایه یک و متخصص حقوق مالیاتی است. ایشان در دعاوی مالیاتی، اعتراض به آرای کمیسیون و امور گمرکی تخصص دارد.", services: ["اعتراض مالیاتی", "دفاع کمیسیون", "مشاوره مالیاتی شرکت", "امور گمرکی"], views: 2140, featured: false },
  { slug: "fateme-nouri", name: "فاطمه نوری", avatarColor: "#9c27b0", title: "وکیل پایه یک دادگستری", licenseNo: "۸۸۹۹۰/مازندران", city: "ساری", province: "مازندران", gender: "female", experienceYears: 10, specialties: ["کار", "خانواده"], rating: 4.7, reviewCount: 134, caseCount: 220, priceChat: 95000, priceVoice: 270000, priceVideo: 450000, topRated: false, fastResponder: true, contractExpert: false, responseTime: "کمتر از ۲ ساعت", bio: "وکیل دعاوی کارگری و کارفرمایی؛ دفاع در اداره کار.", about: "خانم فاطمه نوری وکیل پایه یک و متخصص حقوق کار است. ایشان در دعاوی اخراج، مطالبه حقوق و سنوات و تأخیر تأدیه در هیأت‌های اداره کار فعالیت دارد.", services: ["شکایت اخراج", "مطالبه سنوات", "قرارداد کار", "دفاع اداره کار"], views: 2760, featured: false },
  { slug: "alireza-bahrami", name: "علیرضا بهرامی", avatarColor: "#3a5c3a", title: "وکیل پایه یک دادگستری", licenseNo: "۱۱۲۲۳/قم", city: "قم", province: "قم", gender: "male", experienceYears: 17, specialties: ["ملک", "کیفری"], rating: 4.6, reviewCount: 145, caseCount: 300, priceChat: 100000, priceVoice: 290000, priceVideo: 500000, topRated: false, fastResponder: false, contractExpert: false, responseTime: "کمتر از ۳ ساعت", bio: "متخصص تصرف عدوانی، خلع ید و دعاوی ملکی.", about: "آقای علیرضا بهرامی وکیل پایه یک و متخصص حقوق ملک و کیفری است. ایشان در دعاوی تصرف عدوانی، خلع ید و تخلیه ملک تجربه گسترده‌ای دارد.", services: ["تصرف عدوانی", "خلع ید", "تخلیه ملک", "افراز"], views: 3180, featured: false },
  { slug: "zahra-farahmand", name: "دکتر زهرا فرهمند", avatarColor: "#6a1b9a", title: "وکیل پایه یک دادگستری", licenseNo: "۹۹۰۰۱/تهران", city: "تهران", province: "تهران", gender: "female", experienceYears: 19, specialties: ["مهاجرت", "تجارت"], rating: 4.8, reviewCount: 187, caseCount: 290, priceChat: 160000, priceVoice: 420000, priceVideo: 720000, topRated: true, fastResponder: false, contractExpert: true, responseTime: "کمتر از ۴ ساعت", bio: "متخصص امور مهاجرتی و تجارت بین‌الملل؛ وکالت‌های خارجی و قراردادهای مرزی.", about: "دکتر زهرا فرهمند دکترای حقوق بین‌الملل و متخصص امور مهاجرت و تجارت بین‌الملل است. ایشان در تنظیم قراردادهای بین‌المللی، احراز هویت و وکالت‌های خارجی فعالیت دارد.", services: ["امور مهاجرت", "قرارداد بین‌المللی", "وکالت خارجی", "تجارت مرزی"], views: 3940, featured: false },
  { slug: "hossein-alamdari", name: "حسین علمداری", avatarColor: "#7f3911", title: "وکیل پایه یک دادگستری", licenseNo: "۳۳۴۴۵/خراسان رضوی", city: "مشهد", province: "خراسان رضوی", gender: "male", experienceYears: 12, specialties: ["کیفری"], rating: 4.7, reviewCount: 161, caseCount: 250, priceChat: 115000, priceVoice: 330000, priceVideo: 540000, topRated: false, fastResponder: true, contractExpert: false, responseTime: "کمتر از یک ساعت", bio: "دفاع کیفری تخصصی؛ کلاهبرداری، خیانت در امانت و جرایم اقتصادی.", about: "آقای حسین علمداری وکیل پایه یک و متخصص دفاع کیفری در جرایم اقتصادی است. ایشان در پرونده‌های کلاهبرداری، خیانت در امانت و جرایم رایانه‌ای دفاع می‌کند.", services: ["دفاع کلاهبرداری", "خیانت در امانت", "جرایم رایانه‌ای", "تنظیم شکواییه"], views: 3520, featured: false },
  { slug: "negar-soleimani", name: "نگار سلیمانی", avatarColor: "#1565c0", title: "وکیل پایه یک دادگستری", licenseNo: "۴۴۵۵۶/البرز", city: "کرج", province: "البرز", gender: "female", experienceYears: 9, specialties: ["ثبت برند", "شرکت‌ها", "قراردادها"], rating: 4.8, reviewCount: 129, caseCount: 200, priceChat: 110000, priceVoice: 310000, priceVideo: 510000, topRated: false, fastResponder: true, contractExpert: true, responseTime: "کمتر از ۲ ساعت", bio: "متخصص مالکیت فکری؛ ثبت برند، علامت تجاری و اختراع.", about: "خانم نگار سلیمانی وکیل پایه یک و متخصص مالکیت فکری و امور ثبتی است. ایشان در ثبت برند، علامت تجاری و اختراع و دعاوی نقض حقوق مالکیت فکری تخصص دارد.", services: ["ثبت برند", "ثبت علامت تجاری", "ثبت اختراع", "دعوای نقض"], views: 4010, featured: false },
];

const reviewData = [
  { lawyerId: 1, clientName: "محمد ر.", rating: 5, comment: "بسیار حرفه‌ای و صبور، پرونده طلاق توافقی در کمترین زمان انجام شد.", service: "مشاوره طلاق", createdAt: daysAgo(8) },
  { lawyerId: 1, clientName: "سارا ک.", rating: 5, comment: "مهریه‌ام را بدون دردسر وصول کردم. ممنونم.", service: "مطالبه مهریه", createdAt: daysAgo(21) },
  { lawyerId: 2, clientName: "رضا م.", rating: 5, comment: "قرارداد اجاره‌ای عالی تنظیم کرد و مشکل تخلیه را حل کرد.", service: "تنظیم قرارداد", createdAt: daysAgo(5) },
  { lawyerId: 4, clientName: "شرکت آرمان", rating: 5, comment: "بررسی قرارداد سرمایه‌گذاری دقیق و کامل بود. توصیه می‌کنم.", service: "بررسی قرارداد", createdAt: daysAgo(12) },
  { lawyerId: 4, clientName: "الهام ت.", rating: 4, comment: "تخصص بالا در قراردادهای تجاری، فقط زمان پاسخ‌گویی کمی طولانی بود.", service: "تنظیم قرارداد", createdAt: daysAgo(30) },
  { lawyerId: 8, clientName: "زهرا ع.", rating: 5, comment: "وکیل دلسوز و متخصص؛ نفقه‌ام را تأمین کردم.", service: "مشاوره نفقه", createdAt: daysAgo(3) },
  { lawyerId: 7, clientName: "حسن ب.", rating: 5, comment: "چک برگشتی را خیلی سریع پیگیری کرد و وجه را وصول کردم.", service: "مطالبه چک", createdAt: daysAgo(6) },
  { lawyerId: 3, clientName: "کریم ن.", rating: 5, comment: "دفاع کیفری قوی، برائت گرفتم. سپاسگزارم.", service: "دفاع کیفری", createdAt: daysAgo(15) },
];

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
  { slug: "check-bargasht-chi-konam", question: "اگر چک برگشت بخورد چه کنم؟", body: "چک ۵۰ میلیونی که از کارفرمام گرفته بودم برگشت خورده. مسیر قانونی چیست؟", answer: "نخست به بانک مراجعه و «گواهی عدم پرداخت» و نسخه اجرائیه را دریافت کنید. سپس می‌توانید از مسیر اجرائیه (سریع‌ترین روش وصول) یا شکایت کیفری/حقوقی اقدام کنید. برای طرح شکایت کیفری مهلت قانونی وجود دارد، بنابراین بدون تأخیر اقدام کنید. داشتن نشانی دقیق صادرکننده برای احضار ضروری است.", category: "چک و اسناد", lawyerName: "کاوه احمدی", lawyerTitle: "وکیل پایه یک — متخصص اسناد تجاری", verified: true, helpful: 48, views: 8200, createdAt: daysAgo(3) },
  { slug: "mostager-che-konam", question: "مستأجر من سه ماه اجاره نداده، چه کار کنم؟", body: "مستأجر سه ماه اجاره‌بها نپرداخته و قرارداد رسمی دارم.", answer: "اگر قرارداد رسمی و دارای شرط تخلیه دارید، می‌توانید از طریق شورای حل اختلاف محل ملک، دادخواست تخلیه و مطالبه اجاره‌بها ثبت کنید. پیش از آن، ارسال اظهارنامه و اخطار رسمی توصیه می‌شود. در صورت عدم رسیدگی، حکم تخلیه با حضور مأمور اجرا انجام می‌شود.", category: "ملک", lawyerName: "ندا کریمی", lawyerTitle: "وکیل پایه یک — متخصص حقوق ملک", verified: true, helpful: 36, views: 6100, createdAt: daysAgo(7) },
  { slug: "modat-talaq-tavafoghi", question: "برای طلاق توافقی چه مدت زمان لازم است؟", body: "زن و شردر همه امور توافق داریم. چقدر طول می‌کشد؟", answer: "در طلاق توافقی که توافق کامل وجود دارد، فرایند معمولاً بین ۱ تا ۳ ماه طول می‌کشد؛ شامل ثبت دادخواست، تعیین جلسه، حضور در مشاور الزامی، صدور گواهی عدم امکان سازش و ثبت در محضر. با تنظیم دقیق توافق‌نامه پیش از دادخواست، روند تسریع می‌شود.", category: "خانواده", lawyerName: "دکتر لیلا صادقی", lawyerTitle: "وکیل پایه یک — متخصص خانواده", verified: true, helpful: 41, views: 5400, createdAt: daysAgo(11) },
  { slug: "check-siyadi-chist", question: "چک صیادی چیست و چه تفاوتی با چک عادی دارد؟", body: "بانک گفت چک صیادی است. معنی‌اش چیست؟", answer: "چک صیادی چکی است که در سامانه صیاد ثبت می‌شود و اطلاعات صادرکننده و گیرنده در آن ثبت می‌گردد. این چک‌ها ردیابی آسان‌تری دارند و در صورت برگشت، امکان پیگیری قانونی قوی‌تری فراهم می‌شود. گواهی عدم پرداخت این چک‌ها هم از سامانه صیاد صادر می‌شود.", category: "چک و اسناد", lawyerName: "کاوه احمدی", lawyerTitle: "وکیل پایه یک", verified: true, helpful: 29, views: 4700, createdAt: daysAgo(14) },
  { slug: "elzam-be-tanzim-sand", question: "الزام به تنظیم سند چگونه است؟", body: "ملکی خریده‌ام اما فروشنده حاضر به تنظیم سند رسمی نیست.", answer: "اگر مبایعه‌نامه معتبر دارید، می‌توانید با دادخواست «الزام به تنظیم سند رسمی» در دادگاه محل وقوع ملک، فروشنده را ملزم کنید. در صورت امتناع وی، دادگاه حکم تنظیم سند را صادر می‌کند و انتقال بدون حضور او نیز ممکن می‌شود. داشتن مبایعه‌نامه و مدارک پرداخت ثمن ضروری است.", category: "ملک", lawyerName: "علیرضا بهرامی", lawyerTitle: "وکیل پایه یک — متخصص حقوق ملک", verified: true, helpful: 24, views: 3900, createdAt: daysAgo(18) },
  { slug: "khiyanat-dar-amanat", question: "خیانت در امانت چه زمانی محقق می‌شود؟", body: "سندی به کسی دادم که پس نداده. آیا خیانت در امانت است؟", answer: "خیانت در امانت زمانی محقق می‌شود که شخصی مالی که به عنوان امانت یا برای انجام کاری به او سپرده شده را پس ندهد یا مصرف کند. اثبات رابطه امانی و امتناع از بازگرداندن، ارکان جرم هستند. شکایت در دادسرا ثبت و در صورت احراز، تعقیب کیفری انجام می‌شود.", category: "کیفری", lawyerName: "حسین علمداری", lawyerTitle: "وکیل پایه یک — متخصص کیفری", verified: true, helpful: 19, views: 3300, createdAt: daysAgo(22) },
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
  `CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, lawyer_id INTEGER NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE, client_name TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT NOT NULL, service TEXT, created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS contracts (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'file', description TEXT NOT NULL, use_case TEXT NOT NULL, risks TEXT[] NOT NULL DEFAULT '{}', key_clauses TEXT[] NOT NULL DEFAULT '{}', sample_price INTEGER NOT NULL DEFAULT 0, custom_price INTEGER NOT NULL DEFAULT 0, popular BOOLEAN NOT NULL DEFAULT false, steps TEXT[] NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS articles (id SERIAL PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, category TEXT NOT NULL, excerpt TEXT NOT NULL, content TEXT NOT NULL, quick_answer TEXT NOT NULL DEFAULT '', faq TEXT NOT NULL DEFAULT '[]', image_url TEXT, image_alt TEXT, read_time INTEGER NOT NULL DEFAULT 5, author TEXT NOT NULL DEFAULT 'تیم تحریریه دادبان', author_role TEXT NOT NULL DEFAULT 'پژوهشگر حقوق', views INTEGER NOT NULL DEFAULT 0, published_at TIMESTAMP NOT NULL DEFAULT now())`,
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
  `CREATE TABLE IF NOT EXISTS qa_submissions (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT, question TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending_review', created_at TIMESTAMP NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS events (id SERIAL PRIMARY KEY, event TEXT NOT NULL, path TEXT NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT now())`,
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
];

export interface SeedCounts {
  lawyers: number;
  reviews: number;
  contracts: number;
  articles: number;
  qa: number;
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
    { phone: "09000000001", name: "کارشناس عملیات دادبان", role: "staff" },
    { phone: "09000000002", name: "دکتر ناظر حقوقی", role: "lawyer" },
    { phone: "09000000003", name: "ناظر ارشد دادبان", role: "supervisor" },
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
 *   وکیل  → 09120000001 / Dadban1404!  (متصل به پروفایل «دکتر سهراب محمدی» — تهران)
 *   موکل  → 09120000002 / Dadban1404!
 */
export async function seedPlatformAccounts(): Promise<void> {
  const rows = [
    { phone: "09120000001", name: "وکیل آزمایشی دادبان", email: "lawyer.demo@dadban.ir", role: "lawyer" },
    { phone: "09120000002", name: "موکل آزمایشی دادبان", email: "client.demo@dadban.ir", role: "client" },
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
  // اتصال حساب وکیل به پروفایل وکیل مشخص تا کارتابل مشاوره، پیشنهادهای استان و پنل کامل کار کند.
  try {
    await db.execute(
      sql`UPDATE app_users SET lawyer_id = (SELECT id FROM lawyers WHERE slug = 'sohrab-mohammadi' LIMIT 1) WHERE phone = '09120000001' AND lawyer_id IS NULL`,
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
  await db.insert(lawyers).values(lawyerData.map((l) => ({ ...l, photoUrl: `/lawyers/${l.slug}.jpg` })));
  await db.insert(reviews).values(reviewData);
  await db.insert(contracts).values(contractData);
  await db.insert(articles).values(articleData);
  await db.insert(qaQuestions).values(qaData);
}

/**
 * Backfill photo_url for lawyers created before photos existed (idempotent, cheap).
 * Photo files live at /lawyers/{slug}.jpg — see scripts/gen-lawyer-photos.ts.
 */
export async function ensureLawyerPhotos(): Promise<void> {
  try {
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
        await seedManagedServices();
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
  } catch {
    /* non-fatal */
  }
  // Managed Services catalog + (non-prod) demo operations accounts.
  try {
    await seedManagedServices();
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
    await insertAll();
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
