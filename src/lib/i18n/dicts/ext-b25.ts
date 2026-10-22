
/**
 * لایهٔ EXT_B25 — فرآیند کارشناس حقوقی: دیپ‌لینک ثبت‌نام + زیرنویس نوع-آگاه احراز هویت.
 * کلید = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "مدارک حرفه‌ای خود را بارگذاری کنید تا پس از تأیید مدیر سایت، پروفایل شما در فهرست کارشناسان حقوقی دادورزان نمایش داده شود.": [
    "Upload your professional documents; after the site admin's approval, your profile will appear in the Dadvarzan legal experts directory.",
    "قم بتحميل مستنداتك المهنية؛ بعد من موافقة مدير الموقع، سيظهر ملفك في دليل خبراء دادورزان القانونيين.",
    "Mesleki belgelerinizi yükleyin; site yöneticisinin onayından sonra profiliniz Dadvarzan hukuk uzmanları dizininde görünecektir.",
    "上传您的专业证件；网站管理员批准后，您的资料将显示在达瓦尔赞法律专家名录中。",
  ],
};

export const EXT_B25: Record<"en" | "ar" | "tr" | "zh", Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
