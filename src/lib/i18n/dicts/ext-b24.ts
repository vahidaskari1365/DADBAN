
/**
 * لایهٔ EXT_B24 — زیرمنوی «وکیل‌یابی»: گزینهٔ «کارشناس حقوقی» → /experts.
 * کلید = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "مشاوره، قرارداد و اسناد": ["Consultation, contracts & documents", "استشارات وعقود ومستندات", "Danışmanlık, sözleşme ve belge", "咨询、合同与文书"],
};

export const EXT_B24: Record<"en" | "ar" | "tr" | "zh", Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
