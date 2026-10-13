/**
 * لایهٔ EXT_B20 — مدیریت پلن‌ها (کم/زیاد کردن) + حالت خالی صفحهٔ /plans:
 * پیام «پلن فعالی ثبت نشده» + توضیح و راهنمای فیلدهای پنل ادمین پلن‌ها.
 * کلیدها = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "در حال حاضر پلن فعالی ثبت نشده است": [
    "No active plan is published right now",
    "لا توجد باقة فعالية منشورة حاليًا",
    "Şu anda yayında aktif bir paket yok",
    "目前没有已上架的可用套餐",
  ],
  "برای اطلاع از پلن‌های عضویت و فعال‌سازی اختصاصی با ما در تماس باشید.": [
    "Contact us to learn about membership plans and custom activation.",
    "تواصل معنا للتعرف على باقات العضوية والتفعيل الخاص.",
    "Üyelik paketleri ve özel aktivasyon hakkında bilgi için bizimle iletişime geçin.",
    "如需了解会员套餐及专属开通服务，请与我们联系。",
  ],
  "تماس با دادورزان": [
    "Contact Dadvarzan",
    "تواصل مع دادورزان",
    "Dadvarzan ile iletişim",
    "联系 Dadvarzan",
  ],
  "پلن‌های صفحهٔ /plans — همین‌جا پلن اضافه کنید، ویرایش کنید یا حذف کنید؛ تغییرات فوراً روی سایت اعمال می‌شود. برای برداشتن موقت، «فعال» را خاموش کنید.": [
    "Plans of the /plans page — add, edit or remove plans right here; changes apply to the site instantly. To hide a plan temporarily, switch off “Active”.",
    "باقات صفحة /plans — أضف الباقات أو عدّلها أو احذفها من هنا؛ تُطبَّق التغييرات على الموقع فورًا. للإخفاء المؤقت أوقف خيار «فعال».",
    "/plans sayfasının paketleri — paketleri burada ekleyin, düzenleyin veya silin; değişiklikler anında siteye yansır. Geçici gizlemek için “Aktif”i kapatın.",
    "/plans 页面的套餐——在此添加、编辑或删除套餐；更改即时应用到网站。要临时隐藏，请关闭「启用」。",
  ],
  "کلید یکتای انگلیسی (مثل pro یا gold) — پس از ساخت تغییرش ندهید": [
    "Unique English key (e.g. pro or gold) — do not change it after creation",
    "مفتاح إنجليزي فريد (مثل pro أو gold) — لا تغيّره بعد الإنشاء",
    "Benzersiz İngilizce anahtar (örn. pro veya gold) — oluşturduktan sonra değiştirmeyin",
    "唯一英文键（如 pro 或 gold）——创建后请勿更改",
  ],
  "فقط عدد؛ مثلاً 490000 — صفر یعنی پلن رایگان": [
    "Number only, e.g. 490000 — zero means the plan is free",
    "أرقام فقط؛ مثلاً 490000 — الصفر يعني الباقة مجانية",
    "Sadece sayı; örn. 490000 — sıfır, paketin ücretsiz olduğu anlamına gelir",
    "仅数字；例如 490000——零表示免费套餐",
  ],
  "از این‌ها: user، bolt، badge، star، shield، sparkles، coins، certificate، briefcase، gavel، landmark، scale": [
    "One of: user, bolt, badge, star, shield, sparkles, coins, certificate, briefcase, gavel, landmark, scale",
    "أحد هذه: user، bolt، badge، star، shield، sparkles، coins، certificate، briefcase، gavel، landmark، scale",
    "Şunlardan biri: user, bolt, badge, star, shield, sparkles, coins, certificate, briefcase, gavel, landmark, scale",
    "可选值：user、bolt、badge、star、shield、sparkles、coins、certificate、briefcase、gavel、landmark、scale",
  ],
  "خاموش = پلن موقتاً از سایت پنهان می‌شود (حذف نمی‌شود)": [
    "Off = the plan is temporarily hidden from the site (not deleted)",
    "إيقاف = تُخفى الباقة مؤقتًا من الموقع (لا تُحذف)",
    "Kapalı = paket geçici olarak siteden gizlenir (silinmez)",
    "关闭 = 套餐临时从网站隐藏（不会被删除）",
  ],
  "عدد کوچک‌تر = بالاتر": [
    "Smaller number = higher position",
    "رقم أصغر = موضع أعلى",
    "Küçük sayı = daha üstte",
    "数字越小 = 排名越靠前",
  ],
};

export const EXT_B20: Record<"en" | "ar" | "tr" | "zh", Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
