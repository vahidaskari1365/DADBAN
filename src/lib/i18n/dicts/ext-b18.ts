/**
 * لایهٔ EXT_B18 — متادیتای چندزبانهٔ صفحهٔ /case-board (فاز ۴ چندزبانه):
 * عنوان OG، توضیحات متا و توضیحات OG بازار پرونده‌ها که پیش‌تر فارسی ثابت بود.
 * کلیدها = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "بازار پرونده‌های دادورزان": [
    "Dadvarzan case marketplace",
    "سوق قضايا دادورزان",
    "Dadvarzan dava pazarı",
    "Dadvarzan 案件市场",
  ],
  "پروندهٔ حقوقی‌تان را ثبت کنید تا وکلای متخصص دادورزان نظر و پیشنهاد قیمت خود را اعلام کنند و شما بهترین را انتخاب کنید. وکیل هستید؟ روی پرونده‌های استان خودتان پیشنهاد قیمت بدهید.": [
    "File your legal case and let specialist Dadvarzan lawyers submit their opinions and price quotes — you pick the best. Are you a lawyer? Quote on cases in your own province.",
    "سجّل قضيتك القانونية ليتقدّم المحامون المتخصصون في دادورزان برأيهم وعروض أسعارهم واختر أنت الأفضل. هل أنت محامٍ؟ قدّم عرضك على قضايا محافظتك.",
    "Hukuki dosyanızı kaydedin; Dadvarzan uzman avukatları görüş ve fiyat teklifi göndersin, en iyisini siz seçin. Avukat mısınız? Kendi ilinizdeki dosyalara teklif verin.",
    "提交您的法律案件，让 Dadvarzan 专业律师提交意见与报价，由您选择最佳方案。您是律师吗？为您所在省份的案件报价。",
  ],
  "مثل بازار کار، ولی برای پرونده‌های حقوقی: موکل ثبت می‌کند، وکلا قیمت می‌دهند، موکل بهترین را انتخاب می‌کند.": [
    "Like a freelance marketplace — but for legal cases: the client files, lawyers quote, the client picks the best.",
    "مثل سوق العمل الحر، لكن للقضايا القانونية: الموكّل يسجّل، المحامون يقدّمون العروض، والموكّل يختار الأفضل.",
    "Serbest çalışma pazarı gibi — ama hukuk dosyaları için: müvekkil kaydeder, avukatlar teklif verir, müvekkil en iyisini seçer.",
    "像自由职业市场，但对象是法律案件：当事人提交，律师报价，当事人选择最优。",
  ],
};

export const EXT_B18 = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
