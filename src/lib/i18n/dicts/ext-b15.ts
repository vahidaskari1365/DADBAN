/**
 * لایهٔ EXT_B15 — سیم‌کشی فاز ۲ (پاس دوم، Task 13-e):
 * کلیدهای تازهٔ admin/dashboard که در لایه‌های قبلی نبودند (استخراج scripts/tmp-b15-check.ts).
 * کلید = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "پرونده‌های ارجاعی": [
    "Referred cases",
    "القضايا المحالة",
    "Sevk edilen davalar",
    "已转介案件",
  ],
  "اقدامات ثبت‌شدهٔ من": [
    "My recorded actions",
    "إجراءاتي المسجَّلة",
    "Kaydettiğim işlemler",
    "我记录的操作",
  ],
};

export const EXT_B15 = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
