/**
 * ============================================================================
 * sharifmand — Keyword Universe (۲۰K+ کلمه‌ی کلیدی)
 * ----------------------------------------------------------------------------
 * استراتژی: تولید ترکیبی long-tail keywords از seed × modifiers.
 *
 * ساختار:
 *  - 10 seed categories (وکیل، مشاوره، قرارداد، پرونده، قانون،...)
 *  - 60+ تخصص حقوقی
 *  - 35+ شهر ایران
 *  - 25+ صفت (بهترین، ارزان، رایگان، فوری، آنلاین،...)
 *  - 10+ intent modifiers (هزینه، قیمت، تعرفه، مراحل، شرایط،...)
 *
 * ترکیب‌ها: ۱۰ × ۶۰ × ۳۵ × ۲۵ × ۱۰ = میلیون‌ها — ما ۲۰K انتخاب می‌کنیم.
 * ============================================================================
 */

// ─── Seed categories ───────────────────────────────────────────────────────
const SEED_CATEGORIES = [
  "وکیل",
  "مشاوره حقوقی",
  "وکالت",
  "قرارداد",
  "پرونده حقوقی",
  "دادخواست",
  "شکواییه",
  "قانون",
  "حقوق",
  "خدمات حقوقی",
] as const;

// ─── ۶۰+ تخصص حقوقی ────────────────────────────────────────────────────────
export const LEGAL_SPECIALTIES = [
  "خانواده", "طلاق", "مهریه", "حضانت", "نفقه", "ارث", "انحصار وراثت", "وصیت",
  "ملک", "تخلیه", "تصرف عدوانی", "اجاره", "سرقفلی", "سند", "افراز",
  "کیفری", "کلاهبرداری", "سرقت", "خیانت در امانت", "جعل", "قتل", "ضرب‌وجرح",
  "تجاری", "قرارداد", "چک برگشتی", "اسناد تجاری", "شرکت‌ها", "داوری",
  "کار", "اخراج", "حقوق کارگر", "مالیاتی", "بیمه",
  "ثبت شرکت", "تغییرات شرکت", "برند", "علامت تجاری", "مالکیت فکری",
  "اداری", "اجرای احکام", "شهرداری", "دارایی",
  "مهاجرت", "پناهندگی", "وکیل بین‌الملل",
  "نظام پزشکی", "مسئولیت محصول",
  "اینترنت", "جرایم رایانه‌ای", "کلاهبرداری اینترنتی",
  "بانکی", "چک", "سفته",
  "شخصیت", "توهین", "اهانت",
  "عقود", "بیع", "اجاره", "وکالت",
  "ورشکستگی", "تصفیه",
  "امور حسبی", "وصایت", "قیمومت",
  "سایبری", "هک", "فیشینگ",
  "انتخابات", "اداری",
  "دانشگاه", "محصولات دارویی",
] as const;

// ─── ۳۵+ شهر ایران ──────────────────────────────────────────────────────────
export const IRAN_CITIES = [
  "تهران", "کرج", "مشهد", "اصفهان", "شیراز", "تبریز", "اهواز", "کرمانشاه",
  "قزوین", "رشت", "ارومیه", "زاهدان", "کرمان", "همدان", "یزد", "اردبیل",
  "بندرعباس", "علی‌آباد کتول", "گرگان", "ساری", "بابل", "آمل", "قائم‌شهر",
  "نوشهر", "چالوس", "خرم‌آباد", "ایلام", "سنندج", "بجنورد", "سمنان",
  "شهرکرد", "بیرجند", "بوشهر", "گنبد کاووس", "نجف‌آباد", "کاشان",
  "اهر", "مراغه", "خوی", "میاندوآب", "جلفا",
] as const;

// ─── ۲۵+ صفات ──────────────────────────────────────────────────────────────
export const QUALIFIERS = [
  "بهترین", "خوب", "حرفه‌ای", "متخصص", "باسابقه", "معروف", "پایه یک", "دادگستری",
  "آنلاین", "تلفنی", "متنی", "تصویری", "حضوری", "فوری", "سریع", "۲۴ ساعته",
  "ارزان", "رایگان", "باکیفیت", "مطمئن", "تأییدشده", "تجربه‌دار",
  "زن", "مرد", "خانم", "آقا", "جوان", "باطلاع",
] as const;

// ─── ۱۰+ intent modifiers ───────────────────────────────────────────────────
export const INTENT_MODIFIERS = [
  "هزینه", "قیمت", "تعرفه", "مزد", "حق‌الوکاله", "دستمزد",
  "مراحل", "شرایط", "مدارک", "نحوه", "روش", "زمان",
  "آدرس", "تلفن", "شماره", "واتساپ",
  "رایگان", "آنلاین",
] as const;

/**
 * تولید همه‌ی ترکیب‌های ممکن از seed × specialty.
 * این الگو: «وکیل خانواده»، «وکیل طلاق»، «مشاوره حقوقی خانواده»،...
 */
function generateSeedSpecialty(): string[] {
  const result: string[] = [];
  for (const seed of SEED_CATEGORIES) {
    for (const sp of LEGAL_SPECIALTIES) {
      result.push(`${seed} ${sp}`);
    }
  }
  return result;
}

/**
 * افزودن شهر: «وکیل خانواده در تهران»، «بهترین وکیل طلاق مشهد»،...
 */
function withCity(keywords: string[]): string[] {
  const result: string[] = [];
  for (const kw of keywords) {
    // فقط برای کلماتی که با «وکیل» یا «مشاوره» شروع می‌شن، شهر اضافه کن
    if (kw.startsWith("وکیل") || kw.startsWith("مشاوره") || kw.startsWith("خدمات")) {
      for (const city of IRAN_CITIES) {
        result.push(`${kw} در ${city}`);
        result.push(`${kw} ${city}`);
      }
    }
  }
  return result;
}

/**
 * افزودن صفات: «بهترین وکیل خانواده»، «وکیل خانواده ارزان»،...
 */
function withQualifiers(keywords: string[]): string[] {
  const result: string[] = [];
  for (const kw of keywords) {
    if (kw.startsWith("وکیل") || kw.startsWith("مشاوره")) {
      for (const q of QUALIFIERS) {
        result.push(`${q} ${kw}`);
      }
    }
  }
  return result;
}

/**
 * افزودن intent modifiers: «هزینه وکیل خانواده»، «تعرفه وکالت طلاق»،...
 */
function withIntents(keywords: string[]): string[] {
  const result: string[] = [];
  for (const kw of keywords) {
    for (const intent of INTENT_MODIFIERS) {
      result.push(`${intent} ${kw}`);
    }
  }
  return result;
}

/**
 * تولید همه‌ی کلمات ترکیبی و حذف تکرارها.
 * هدف: ۲۰K+ کلمه‌ی منحصربه‌فرد.
 */
export function generateKeywordUniverse(): string[] {
  const set = new Set<string>();

  // ۱. seed × specialty
  for (const kw of generateSeedSpecialty()) set.add(kw);

  // ۲. با شهر
  for (const kw of withCity(generateSeedSpecialty())) set.add(kw);

  // ۳. با صفت
  for (const kw of withQualifiers(generateSeedSpecialty())) set.add(kw);

  // ۴. با intent
  for (const kw of withIntents(generateSeedSpecialty())) set.add(kw);

  // ۵. ترکیب city + qualifier + seed + specialty
  const seedSpecialty = generateSeedSpecialty();
  for (const kw of seedSpecialty.slice(0, 200)) {
    // فقط ۲۰۰ کلمه‌ی اول برای جلوگیری از انفجار
    for (const city of IRAN_CITIES.slice(0, 15)) {
      // ۱۵ شهر اصلی
      for (const q of QUALIFIERS.slice(0, 8)) {
        set.add(`${q} ${kw} در ${city}`);
      }
    }
  }

  // ۶. intent + seed + specialty + city
  for (const kw of seedSpecialty.slice(0, 100)) {
    for (const intent of INTENT_MODIFIERS.slice(0, 6)) {
      for (const city of IRAN_CITIES.slice(0, 10)) {
        set.add(`${intent} ${kw} در ${city}`);
      }
    }
  }

  return Array.from(set);
}

/** کلیدواژه‌های تولیدشده (cache شده). */
let _universe: string[] | null = null;

/** دریافت keyword universe با lazy init. */
export function getKeywordUniverse(): string[] {
  if (!_universe) {
    _universe = generateKeywordUniverse();
  }
  return _universe;
}

/** تعداد کل کلمات. */
export function getKeywordCount(): number {
  return getKeywordUniverse().length;
}

/**
 * فیلتر کردن کلمات بر اساس prefix.
 * مثلاً: getKeywordsByPrefix("وکیل خانواده") → همه‌ی long-tail های مرتبط.
 */
export function getKeywordsByPrefix(prefix: string): string[] {
  return getKeywordUniverse().filter((kw) => kw.startsWith(prefix));
}

/**
 * جستجوی کلمات شامل یک term.
 */
export function searchKeywords(term: string): string[] {
  const lower = term.toLowerCase();
  return getKeywordUniverse().filter((kw) => kw.toLowerCase().includes(lower));
}

/**
 * توزیع کلمات بر اساس طول (نمودار long-tail).
 */
export function getKeywordLengthDistribution(): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const kw of getKeywordUniverse()) {
    const words = kw.split(" ").length;
    const bucket = `${words} کلمه`;
    dist[bucket] = (dist[bucket] || 0) + 1;
  }
  return dist;
}
