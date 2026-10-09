import type { Locale } from "../core";

/**
 * پوشش i18n حوزهٔ «حریم خصوصی پیشنهادها»:
 * پیشنهادهای قیمت و تعدادشان فقط برای موکلِ صاحب پرونده دیده می‌شود؛
 * وکلا پیشنهادهای یکدیگر را نمی‌بینند (نه در برد، نه در مودال جزئیات).
 * کلیدها = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh]
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "پیشنهادها فقط برای موکل": [
    "Offers visible to the client only",
    "العروض يراها الموكّل فقط",
    "Teklifler yalnızca müvekkil tarafından görünür",
    "报价仅客户可见",
  ],
  "قدیمی‌ترین پرونده‌ها": [
    "Oldest cases",
    "أقدم القضايا",
    "En eski davalar",
    "最早的案件",
  ],
  "نام و شمارهٔ تماس موکل، و نیز پیشنهاد قیمت و گفتگوی همهٔ وکلا کاملاً محرمانه است و فقط موکلِ صاحب پرونده آن‌ها را می‌بیند — وکلا پیشنهادهای یکدیگر را نمی‌بینند.": [
    "The client's name and phone, and every lawyer's quote and conversation, are fully confidential — only the case owner sees them; lawyers never see each other's offers.",
    "اسم الموكّل ورقم هاتفه، وكذلك عروض الأسعار ومحادثات جميع المحامين، سرّية تمامًا ولا يراها إلا الموكّل صاحب القضية — المحامون لا يرون عروض بعضهم بعضًا.",
    "Müvekkilin adı ve telefonu ile tüm avukatların teklifleri ve yazışmaları tamamen gizlidir — yalnızca davanın sahibi müvekkil görür; avukatlar birbirlerinin tekliflerini görmez.",
    "客户的姓名和电话，以及所有律师的报价和沟通均完全保密——仅案件所属客户可见；律师之间互不可见对方报价。",
  ],
};

export const EXT_B8: Record<Exclude<Locale, "fa">, Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
