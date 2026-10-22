
/**
 * لایهٔ EXT_B23 — توست سراسری تغییرات پروفایل + یکدست‌سازی کارت وکلا.
 * کلید = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  /* ── توست ذخیرهٔ تغییرات پروفایل (۳ ثانیه + محو آرام) ── */
  "تغییرات اعمال شد": ["Changes applied", "تم تطبيق التغييرات", "Değişiklikler uygulandı", "更改已应用"],
};

export const EXT_B23: Record<"en" | "ar" | "tr" | "zh", Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
