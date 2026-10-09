import type { Locale } from "../core";

/**
 * پوشش i18n حوزهٔ «اعلان‌های درون‌برنامه‌ای» (فرآیند بازار پرونده‌ها):
 * اعلان ثبت پرونده برای وکیل، اعلان پیشنهاد قیمت برای موکل، اعلان پذیرش برای وکیل
 * + کارت «اعلان‌ها» در پنل‌ها. کلیدها = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله).
 * هر ردیف: [en, ar, tr, zh]
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "اعلان‌ها": ["Notifications", "الإشعارات", "Bildirimler", "通知"],
  "همه خوانده شد": ["Mark all read", "وضع الكل كمقروء", "Tümünü okundu işaretle", "全部标为已读"],
  "تومان": ["Toman", "تومان", "Toman", "图曼"],
  "پروندهٔ جدید در استان شما ثبت شد": [
    "A new case was filed in your province",
    "تم تسجيل قضية جديدة في محافظتك",
    "İlinizde yeni bir dava kaydedildi",
    "您所在省份提交了新案件",
  ],
  "موضوع: «{subject}» — در انتظار پیشنهاد قیمت شماست": [
    "Subject: “{subject}” — waiting for your price quote",
    "الموضوع: «{subject}» — بانتظار عرض سعركم",
    "Konu: “{subject}” — fiyat teklifiniz bekleniyor",
    "主题：“{subject}”——等待您的报价",
  ],
  "پیشنهاد جدیدی برای پروندهٔ شما ثبت شد": [
    "A new offer was submitted for your case",
    "تم تقديم عرض جديد لقضيتك",
    "Davanız için yeni bir teklif gönderildi",
    "您的案件收到了新报价",
  ],
  "وکیل «{lawyer}» برای «{subject}» پیشنهاد قیمت داد": [
    "Lawyer “{lawyer}” submitted a price quote for “{subject}”",
    "قدّم المحامي «{lawyer}» عرض سعر لـ«{subject}»",
    "Avukat “{lawyer}”, “{subject}” için fiyat teklifi verdi",
    "律师“{lawyer}”为“{subject}”提交了报价",
  ],
  "موکل پیشنهاد شما را پذیرفت": [
    "The client accepted your offer",
    "قبل الموكّل عرضك",
    "Müvekkil teklifinizi kabul etti",
    "当事人接受了您的报价",
  ],
  "پروندهٔ «{subject}» به شما واگذار شد — گفتگوی رایگان فعال است": [
    "Case “{subject}” is now assigned to you — free chat is active",
    "تم إسناد القضية «{subject}» إليكم — المحادثة المجانية مفعّلة",
    "“{subject}” davası size devredildi — ücretsiz sohbet aktif",
    "案件“{subject}”已委托给您——免费沟通已开启",
  ],
};

export const EXT_B6: Record<Exclude<Locale, "fa">, Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
