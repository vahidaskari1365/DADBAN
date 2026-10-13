/**
 * لایهٔ EXT_B21 — ثبت‌نام وکیل + احراز هویت وکلا:
 * فرم ثبت‌نام کارآموز (تخصص‌ها + گزینهٔ وکیل کارمندان و کارهای اداری)،
 * بخش احراز هویت پنل وکیل (آپلود مدارک + بنرهای وضعیت) و اعلان‌های نتیجهٔ بررسی.
 * کلیدها = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "وکیل کارمندان و کارهای اداری": [
    "Employee & administrative affairs lawyer",
    "محامي الموظفين والأعمال الإدارية",
    "Personel ve idari işler avukatı",
    "员工与行政事务律师",
  ],
  "برای پذیرش پرونده‌های کارکنان، ادارات و امور اداری — اختیاری": [
    "For handling employee, office and administrative cases — optional",
    "لقبول قضايا الموظفين والدوائر والأمور الإدارية — اختياري",
    "Personel, daire ve idari dosyaları kabul etmek için — isteğe bağlı",
    "用于承接员工、机关及行政事务案件——可选",
  ],
  "پس از ثبت‌نام وارد پنل وکیل می‌شوید؛ برای دیده‌شدن در فهرست وکلای سایت، مدارک را در بخش «احراز هویت» پنل بارگذاری کنید تا مدیر سایت بررسی و تأیید کند.": [
    "After signing up you enter the lawyer panel; to appear in the site’s lawyer directory, upload your documents in the panel’s “Verification” section for the site admin to review and approve.",
    "بعد من التسجيل تدخل لوحة المحامي؛ لتظهر في دليل محامي الموقع، ارفع مستنداتك في قسم «التحقق» من اللوحة ليراجعها مدير الموقع ويوافق عليها.",
    "Kayıt olduktan sonra avukat paneline girersiniz; sitenin avukat listesinde görünmek için belgelerinizi panelin “Doğrulama” bölümüne yükleyin ve site yöneticisinin onaylamasını bekleyin.",
    "注册后将进入律师面板；如需出现在网站律师名录中，请在面板的「身份认证」部分上传材料，等待网站管理员审核通过。",
  ],
  "حداقل یک تخصص انتخاب کنید.": [
    "Select at least one specialty.",
    "اختر تخصصًا واحدًا على الأقل.",
    "En az bir uzmanlık seçin.",
    "请至少选择一个专业领域。",
  ],
  "احراز هویت — پنل وکیل": [
    "Identity verification — Lawyer panel",
    "التحقق من الهوية — لوحة المحامي",
    "Kimlik doğrulama — Avukat paneli",
    "身份认证 — 律师面板",
  ],
  "بارگذاری مدارک احراز هویت (پروانهٔ وکالت، کارت ملی) و پیگیری بررسی مدیر سایت.": [
    "Upload verification documents (practice license, national ID) and follow the site admin’s review.",
    "ارفع مستندات التحقق (رخصة المحاماة، البطاقة الوطنية) وتابع مراجعة مدير الموقع.",
    "Doğrulama belgelerini (meslek ruhsatı, kimlik kartı) yükleyin ve site yöneticisinin incelemesini takip edin.",
    "上传认证材料（执业证、身份证）并跟进网站管理员的审核。",
  ],
  "احراز هویت": [
    "Identity verification",
    "التحقق من الهوية",
    "Kimlik doğrulama",
    "身份认证",
  ],
  "مدارک حرفه‌ای خود را بارگذاری کنید تا پس از تأیید مدیر سایت، پروفایل شما در فهرست وکلای دادورزان نمایش داده شود.": [
    "Upload your professional documents; once the site admin approves, your profile appears in the Dadvarzan lawyer directory.",
    "ارفع مستنداتك المهنية؛ بعد من موافقة مدير الموقع يظهر ملفك في دليل محامي دادورزان.",
    "Mesleki belgelerinizi yükleyin; site yöneticisi onayladıktan sonra profiliniz Dadvarzan avukat listesinde görünür.",
    "上传您的职业材料；网站管理员审核通过后，您的档案将显示在 Dadvarzan 律师名录中。",
  ],
  "سامانهٔ احراز هویت موقتاً در دسترس نیست؛ بعداً تلاش کنید.": [
    "The verification service is temporarily unavailable; please try again later.",
    "خدمة التحقق غير متاحة مؤقتًا؛ حاول لاحقًا.",
    "Doğrulama servisi geçici olarak kullanılamıyor; lütfen daha sonra deneyin.",
    "认证服务暂时不可用；请稍后再试。",
  ],
  "احراز هویت شما تأیید شد ✓": [
    "Your identity verification was approved ✓",
    "تمت الموافقة على التحقق من هويتك ✓",
    "Kimlik doğrulamanız onaylandı ✓",
    "您的身份认证已通过 ✓",
  ],
  "احراز هویت شما تأیید شد": [
    "Your identity verification was approved",
    "تمت الموافقة على التحقق من هويتك",
    "Kimlik doğrulamanız onaylandı",
    "您的身份认证已通过",
  ],
  "پروفایل شما تأیید شده و در فهرست وکلای دادورزان نمایش داده می‌شود.": [
    "Your profile is approved and now appears in the Dadvarzan lawyer directory.",
    "تمت الموافقة على ملفك ويظهر الآن في دليل محامي دادورزان.",
    "Profiliniz onaylandı ve artık Dadvarzan avukat listesinde görünüyor.",
    "您的档案已通过认证，现显示在 Dadvarzan 律师名录中。",
  ],
  "پروفایل شما تأیید و در فهرست وکلای دادورزان نمایش داده شد": [
    "Your profile was approved and now appears in the Dadvarzan lawyer directory",
    "تمت الموافقة على ملفك وظهر في دليل محامي دادورزان",
    "Profiliniz onaylandı ve Dadvarzan avukat listesinde görünüyor",
    "您的档案已通过认证，现显示在 Dadvarzan 律师名录中",
  ],
  "مشاهدهٔ پروفایل عمومی من": [
    "View my public profile",
    "عرض ملفي العام",
    "Genel profilimi görüntüle",
    "查看我的公开档案",
  ],
  "مدارک شما در انتظار بررسی مدیر سایت است": [
    "Your documents are awaiting the site admin’s review",
    "مستنداتك بانتظار مراجعة مدير الموقع",
    "Belgeleriniz site yöneticisinin incelemesini bekliyor",
    "您的材料正在等待网站管理员审核",
  ],
  "به‌محض بررسی، نتیجه از طریق اعلان‌های پنل به شما اعلام می‌شود.": [
    "As soon as it is reviewed, the result is announced via your panel notifications.",
    "بمجرد المراجعة يُعلن النتيجة عبر إشعارات اللوحة.",
    "İnceleme tamamlanır tamamlanmaz sonuç panel bildirimleriyle duyurulur.",
    "审核完成后，结果将通过面板通知告知您。",
  ],
  "تاریخ ارسال": [
    "Submitted on",
    "تاريخ الإرسال",
    "Gönderim tarihi",
    "提交日期",
  ],
  "درخواست قبلی شما تأیید نشد": [
    "Your previous request was not approved",
    "لم تتم الموافقة على طلبك السابق",
    "Önceki talebiniz onaylanmadı",
    "您之前的申请未获通过",
  ],
  "دلیل (از مدیر سایت)": [
    "Reason (from the site admin)",
    "السبب (من مدير الموقع)",
    "Gerekçe (site yöneticisinden)",
    "原因（来自网站管理员）",
  ],
  "می‌توانید مدارک را اصلاح و مجدد ارسال کنید.": [
    "You can fix the documents and submit again.",
    "يمكنك تصحيح المستندات وإرسالها مجددًا.",
    "Belgeleri düzeltip yeniden gönderebilirsiniz.",
    "您可以修改材料后重新提交。",
  ],
  "درخواست شما ثبت شد و در انتظار بررسی مدیر سایت است.": [
    "Your request was submitted and is awaiting the site admin’s review.",
    "تم تسجيل طلبك وهو بانتظار مراجعة مدير الموقع.",
    "Talebiniz kaydedildi ve site yöneticisinin incelemesini bekliyor.",
    "您的申请已提交，正在等待网站管理员审核。",
  ],
  "بارگذاری مدارک احراز هویت": [
    "Upload verification documents",
    "رفع مستندات التحقق",
    "Doğrulama belgelerini yükle",
    "上传认证材料",
  ],
  "فایل‌ها فقط برای بررسی مدیر سایت استفاده می‌شوند و به‌صورت امن نگهداری می‌شوند.": [
    "Files are used only for the site admin’s review and are stored securely.",
    "تُستخدم الملفات فقط لمراجعة مدير الموقع وتُحفظ بأمان.",
    "Dosyalar yalnızca site yöneticisinin incelemesi için kullanılır ve güvenle saklanır.",
    "文件仅用于网站管理员审核，并安全存储。",
  ],
  "پروانهٔ وکالت یا مجوز مربوطه": [
    "Practice license or relevant permit",
    "رخصة المحاماة أو التصريح ذو الصلة",
    "Meslek ruhsatı veya ilgili izin",
    "执业证或相关许可",
  ],
  "کارت ملی": [
    "National ID card",
    "البطاقة الوطنية",
    "Kimlik kartı",
    "身份证",
  ],
  "مدرک تحصیلی یا سایر مدارک (اختیاری)": [
    "Academic degree or other documents (optional)",
    "الشهادة الدراسية أو مستندات أخرى (اختياري)",
    "Diploma veya diğer belgeler (isteğe bağlı)",
    "学位证书或其他材料（可选）",
  ],
  "مدرک تحصیلی/سایر": [
    "Degree/other",
    "شهادة/أخرى",
    "Diploma/diğer",
    "学位/其他",
  ],
  "توضیح (اختیاری)": [
    "Note (optional)",
    "ملاحظة (اختياري)",
    "Açıklama (isteğe bağlı)",
    "说明（可选）",
  ],
  "مثلاً شمارهٔ پروانه یا توضیح کوتاه دربارهٔ مدارک": [
    "e.g. license number or a short note about your documents",
    "مثل رقم الرخصة أو ملاحظة قصيرة عن مستنداتك",
    "örn. ruhsat numarası veya belgeleriniz hakkında kısa not",
    "例如执照编号或材料简要说明",
  ],
  "فرمت مجاز: PDF یا تصویر (JPG/PNG/WebP) — حداکثر ۵ مگابایت برای هر فایل.": [
    "Allowed formats: PDF or image (JPG/PNG/WebP) — max 5 MB per file.",
    "الصيغ المسموحة: PDF أو صورة (JPG/PNG/WebP) — ٥ ميغابايت كحد أقصى لكل ملف.",
    "İzinli formatlar: PDF veya görsel (JPG/PNG/WebP) — dosya başına en fazla 5 MB.",
    "允许格式：PDF 或图片（JPG/PNG/WebP）——每个文件最大 5 MB。",
  ],
  "ارسال برای بررسی مدیر سایت": [
    "Submit for the site admin’s review",
    "أرسل لمراجعة مدير الموقع",
    "Site yöneticisinin incelemesine gönder",
    "提交给网站管理员审核",
  ],
  "در حال ارسال…": [
    "Submitting…",
    "جارٍ الإرسال…",
    "Gönderiliyor…",
    "提交中…",
  ],
  "خطا در ارسال — دوباره تلاش کنید.": [
    "Submission failed — please try again.",
    "فشل الإرسال — حاول مجددًا.",
    "Gönderim başarısız — lütfen tekrar deneyin.",
    "提交失败——请重试。",
  ],
  "مدارک ارسال‌شده": [
    "Submitted documents",
    "المستندات المرسلة",
    "Gönderilen belgeler",
    "已提交的材料",
  ],
  "توضیح وکیل": [
    "Lawyer’s note",
    "ملاحظة المحامي",
    "Avukatın notu",
    "律师说明",
  ],
  "تاریخ بررسی": [
    "Reviewed on",
    "تاريخ المراجعة",
    "İnceleme tarihi",
    "审核日期",
  ],
  "درخواست احراز هویت شما بررسی شد": [
    "Your verification request has been reviewed",
    "تمت مراجعة طلب التحقق الخاص بك",
    "Doğrulama talebiniz incelendi",
    "您的认证申请已审核",
  ],
  "تأیید نشد — {note}": [
    "Not approved — {note}",
    "لم تتم الموافقة — {note}",
    "Onaylanmadı — {note}",
    "未通过——{note}",
  ],
  "تأیید نشد؛ می‌توانید مدارک را اصلاح و مجدد ارسال کنید": [
    "Not approved; you can fix the documents and submit again",
    "لم تتم الموافقة؛ يمكنك تصحيح المستندات وإرسالها مجددًا",
    "Onaylanmadı; belgeleri düzeltip yeniden gönderebilirsiniz",
    "未通过；您可以修改材料后重新提交",
  ],
};

export const EXT_B21: Record<"en" | "ar" | "tr" | "zh", Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
