import type { Locale } from "../core";

/**
 * پوشش i18n حوزهٔ «پروژه‌ها» — تب پروژه‌ها + صندوق پیام‌های پروژه‌ها:
 * تب ناوبری «پروژه‌ها» (/case-board)، ری‌برند بازار پرونده‌ها به پروژه‌ها،
 * و بخش «پیام‌های پروژه‌ها» در پنل موکل (پیشنهادهای وکلا به‌صورت پیام).
 * کلیدها = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh]
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "پروژه‌ها": ["Projects", "المشاريع", "Projeler", "项目"],
  "ثبت پروژه و پیشنهاد قیمت وکلا": [
    "Post a project and get lawyers' price quotes",
    "سجّل مشروعًا واستلم عروض أسعار المحامين",
    "Proje gönder ve avukat fiyat teklifleri al",
    "发布项目，获取律师报价",
  ],
  "بازار پروژه‌های حقوقی — موکل ثبت می‌کند، وکیل قیمت می‌دهد": [
    "The legal projects marketplace — clients post, lawyers quote",
    "سوق المشاريع القانونية — الموكل يسجّل والمحامي يسعّر",
    "Hukuki projeler pazarı — müvekkil kaydeder, avukat fiyat verir",
    "法律项目市场——客户发布，律师报价",
  ],
  "پروژه‌تان را ثبت کنید؛ وکلا قیمت بدهند، شما بهترین را انتخاب کنید": [
    "Post your project; lawyers quote, you pick the best",
    "سجّل مشروعك؛ المحامون يسعّرون وأنت تختار الأفضل",
    "Projenizi gönderin; avukatlar fiyat versin, siz en iyisini seçin",
    "发布您的项目；律师报价，您选最优",
  ],
  "پیام‌های پروژه‌ها": ["Project messages", "رسائل المشاريع", "Proje mesajları", "项目消息"],
  "پیام": ["message", "رسالة", "mesaj", "条消息"],
  "پیشنهادهای وکلای مختلف روی پرونده‌های شما — همه را یک‌جا مثل پیام ببینید.": [
    "Offers from different lawyers on your cases — see them all in one place, like messages.",
    "عروض محامٍ مختلف على قضاياك — شاهدها كلها في مكان واحد مثل الرسائل.",
    "Farklı avukatların davalarınıza teklifleri — hepsini mesaj gibi tek yerde görün.",
    "不同律师对您案件的报价——像消息一样一站式查看。",
  ],
  "برای پروندهٔ «{subject}» پیشنهاد داد": [
    "made an offer for case “{subject}”",
    "قدّم عرضًا للقضية «{subject}»",
    "“{subject}” davası için teklif verdi",
    "为案件“{subject}”提交了报价",
  ],
  "احراز هویت‌شده": ["Verified", "موثّق", "Doğrulanmış", "已认证"],
  "مشاهده و مقایسه پیشنهادها": [
    "View & compare offers",
    "عرض ومقارنة العروض",
    "Teklifleri görüntüle ve karşılaştır",
    "查看并比较报价",
  ],
  "پیشنهاد پذیرفته‌شده": ["Accepted offer", "عرض مقبول", "Kabul edilen teklif", "已接受的报价"],
  "هنوز پیامی برای پروژه‌های شما نیست": [
    "No messages for your projects yet",
    "لا توجد رسائل لمشاريعك بعد",
    "Projeleriniz için henüz mesaj yok",
    "您的项目还没有消息",
  ],
  "پروژه‌تان را ثبت کنید تا پیشنهاد وکلا به‌صورت پیام همین‌جا برسد.": [
    "Post your project so lawyers' offers arrive here as messages.",
    "سجّل مشروعك لتصلك عروض المحامين هنا كرسائل.",
    "Projenizi gönderin ki avukat teklifleri buraya mesaj olarak gelsin.",
    "发布您的项目，律师的报价将作为消息发送到这里。",
  ],
};

export const EXT_B7: Record<Exclude<Locale, "fa">, Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
