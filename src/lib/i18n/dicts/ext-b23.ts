
/**
 * لایهٔ EXT_B23 — توست سراسری تغییرات پروفایل + یکدست‌سازی کارت وکلا.
 * کلید = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "کارشناسان حقوقی دادورزان": ["Dadvarzan Legal Experts", "خبراء دادورزان القانونيين", "Dadvarzan Hukuk Uzmanları", "达瓦尔赞法律专家"],
  "کارشناسان حقوقی": ["Legal Experts", "الخبراء القانونيون", "Hukuk Uzmanları", "法律专家"],
  "مشاهده کارشناسان": ["View experts", "عرض الخبراء", "Uzmanları görüntüle", "查看专家"],
  "کارشناس حقوقی": ["Legal Expert", "خبير قانوني", "Hukuk Uzmanı", "法律专家"],
  "کارشناس حقوقی — مشاوره، قرارداد و اسناد": ["Legal expert — consultation, contracts & documents", "خبير قانوني — استشارات وعقود ومستندات", "Hukuk uzmanı — danışmanlık, sözleşme ve belge", "法律专家——咨询、合同与文书"],
  "مشاوره، تنظیم و بازبینی قرارداد و کمک به اسناد — بدون وکالت در دادگاه؛ با فیلتر استان و شهر.": ["Consultation, contract drafting & review, and document help — no court representation; filter by province and city.", "استشارات وصياغة العقود ومراجعتها والمساعدة في المستندات — دون الترافع أمام المحكمة؛ مع تصفية حسب المحافظة والمدينة.", "Danışmanlık, sözleşme hazırlama ve inceleme, belge desteği — mahkemede vekillik yok; il ve şehir filtresiyle.", "咨询、合同起草与审查及文书协助——不含出庭代理；可按省份和城市筛选。"],
  "کارشناس حقوقی: مشاوره، قرارداد و اسناد — بدون وکالت در دادگاه": ["Legal expert: consultation, contracts & documents — no court representation", "خبير قانوني: استشارات وعقود ومستندات — دون الترافع أمام المحكمة", "Hukuk uzmanı: danışmanlık, sözleşme ve belge — mahkemede vekillik yok", "法律专家：咨询、合同与文书——不含出庭代理"],
  "مشاوره تخصصی، تنظیم و بازبینی قرارداد و کمک به اسناد توسط کارشناسان حقوقی تأییدشدهٔ دادورزان — با فیلتر تخصص، استان و شهر.": ["Specialized consultation, contract drafting & review and document help by Dadvarzan verified legal experts — filter by specialty, province and city.", "استشارات متخصصة وصياغة العقود ومراجعتها والمساعدة في المستندات بواسطة خبراء قانونيين معتمدين من دادورزان — مع تصفية حسب التخصص والمحافظة والمدينة.", "Dadvarzan doğrulanmış hukuk uzmanlarıyla uzman danışmanlık, sözleşme hazırlama/inceleme ve belge desteği — uzmanlık, il ve şehir filtresiyle.", "由达瓦尔赞认证法律专家提供专业咨询、合同起草与审查及文书协助——可按专业、省份和城市筛选。"],
  "فهرست کارشناسان حقوقی دادورزان": ["List of Dadvarzan legal experts", "قائمة خبراء دادورزان القانونيين", "Dadvarzan hukuk uzmanları listesi", "达瓦尔赞法律专家名录"],
  "کارشناسان حقوقی — مشاوره، قرارداد و اسناد": ["Legal experts — consultation, contracts & documents", "الخبراء القانونيون — استشارات وعقود ومستندات", "Hukuk uzmanları — danışmanlık, sözleşme ve belge", "法律专家——咨询、合同与文书"],
  "دایرکتوری‌ها:": ["Directories:", "الأدلة:", "Dizinler:", "名录："],
  "وکلا": ["Lawyers", "المحامون", "Avukatlar", "律师"],
  "کارشناس حقوقی با این فیلترها یافت نشد": ["No legal expert found with these filters", "لا يوجد خبير قانوني بهذه المرشحات", "Bu filtrelerle hukuk uzmanı bulunamadı", "未找到符合筛选条件的法律专家"],
  "فیلترها را تغییر دهید یا همه کارشناسان را مشاهده کنید.": ["Change the filters or view all experts.", "غيّر المرشحات أو اعرض جميع الخبراء.", "Filtreleri değiştirin veya tüm uzmanları görün.", "请更改筛选条件或查看全部专家。"],
  "عضویت کارشناس حقوقی": ["Legal expert membership", "عضوية خبير قانوني", "Hukuk uzmanı üyeliği", "法律专家入驻"],
  "کارشناس همکار موردنظر را نیافتید؟": ["Couldn't find the expert colleague you need?", "لم تجد الزميل الخبير المناسب؟", "Aradığınız uzman meslektaşı bulamadınız mı?", "没有找到合适的专家同事？"],
  "با پشتیبانی دادورزان تماس بگیرید یا از دایرکتوری وکلا برای ارجاع پرونده‌های قضایی استفاده کنید.": ["Contact Dadvarzan support or use the lawyers directory for court-case referrals.", "تواصل مع دعم دادورزان أو استخدم دليل المحامين لإحالة القضايا القضائية.", "Dadvarzan desteğiyle iletişime geçin veya dava yönlendirmeleri için avukat dizinini kullanın.", "请联系达瓦尔赞客服，或使用律师名录转介诉讼案件。"],
  "دایرکتوری وکلا": ["Lawyers directory", "دليل المحامين", "Avukat dizini", "律师名录"],
  "کارشناس حقوقی مناسب را پیدا نکردید؟": ["Couldn't find the right legal expert?", "لم تجد الخبير القانوني المناسب؟", "Uygun hukuk uzmanını bulamadınız mı?", "没有找到合适的法律专家？"],
  "می‌توانید مستقیماً با دستیار حقوقی هوشمند شروع کنید یا پرونده خود را ثبت کنید تا به متخصص مناسب معرفی شود.": ["You can start directly with the AI legal assistant or submit your case to be matched with the right specialist.", "يمكنك البدء مباشرة مع المساعد القانوني الذكي أو تسجيل قضيتك لتُعرض على المختص المناسب.", "Doğrudan yapay zekâ hukuk asistanıyla başlayabilir veya dosyanızı kaydedip uygun uzmana yönlendirilmesini sağlayabilirsiniz.", "您可以直接使用 AI 法律助手开始，或提交案件以匹配合适的专家。"],
  "کارشناس فعال": ["Active experts", "خبراء نشطون", "Aktif uzmanlar", "在册专家"],
  "قرارداد و اسناد": ["Contracts & documents", "العقود والمستندات", "Sözleşme ve belge", "合同与文书"],
  "کارشناس حقوقی چه کاری انجام می‌دهد؟": ["What does a legal expert do?", "ماذا يفعل الخبير القانوني؟", "Hukuk uzmanı ne yapar?", "法律专家做什么？"],
  "کارشناس حقوقی مشاوره تخصصی، تنظیم و بازبینی قرارداد و کمک به اسناد ارائه می‌دهد؛ برخلاف وکیل دادگستری، وکالت در دادگاه ندارد.": ["A legal expert provides specialized consultation, drafts and reviews contracts, and helps with documents; unlike a court lawyer, they cannot represent you in court.", "يقدم الخبير القانوني استشارات متخصصة ويصاغ العقود ويراجعها ويساعد في المستندات؛ وعلى خلاف المحامي، لا يترافع أمام المحكمة.", "Hukuk uzmanı uzman danışmanlık verir, sözleşme hazırlar/inceeler ve belge konusunda yardımcı olur; mahkeme avukatının aksine mahkemede vekillik yapamaz.", "法律专家提供专业咨询、起草与审查合同并协助文书工作；与出庭律师不同，不能代理诉讼。"],
  "چگونه کارشناس حقوقی مناسب پیدا کنم؟": ["How do I find the right legal expert?", "كيف أجد الخبير القانوني المناسب؟", "Uygun hukuk uzmanını nasıl bulabilirim?", "如何找到合适的法律专家？"],
  "از این صفحه با فیلتر تخصص، استان و شهر می‌توانید کارشناس حقوقی مناسب پیدا و مشاوره رزرو کنید.": ["From this page, filter by specialty, province and city to find the right legal expert and book a consultation.", "من هذه الصفحة، رشّح حسب التخصص والمحافظة والمدينة لتجد الخبير المناسب وتحجز استشارة.", "Bu sayfadan uzmanlık, il ve şehir filtresiyle uygun uzmanı bulup danışmanlık rezerve edin.", "在此页面按专业、省份和城市筛选，找到合适的专家并预约咨询。"],
  "نتیجه": ["result(s)", "نتيجة", "sonuç", "条结果"],
  "عکس به‌صورت خودکار به سایز استاندارد (مربع) تبدیل می‌شود — هر وقت بخواهید می‌توانید عوضش کنید.": ["The photo is automatically converted to the standard square size — you can change it anytime.", "يتم تحويل الصورة تلقائيًا إلى الحجم المربع القياسي — يمكنك تغييرها في أي وقت.", "Fotoğraf otomatik olarak standart kare boyuta dönüştürülür — istediğiniz an değiştirebilirsiniz.", "照片会自动转换为标准方形尺寸——您随时可以更换。"],
  "حساب شما به پروفایل وکیل متصل است؛ عکس پروفایل را از پنل وکیل تغییر دهید.": ["Your account is linked to a lawyer profile; change the photo from the lawyer panel.", "حسابك مرتبط بملف محامٍ؛ غيّر الصورة من لوحة المحامي.", "Hesabınız bir avukat profiline bağlı; fotoğrafı avukat panelinden değiştirin.", "您的账号已关联律师档案；请从律师面板更换照片。"],

  /* ── توست ذخیرهٔ تغییرات پروفایل (۳ ثانیه + محو آرام) ── */
  "تغییرات اعمال شد": ["Changes applied", "تم تطبيق التغييرات", "Değişiklikler uygulandı", "更改已应用"],
};

export const EXT_B23: Record<"en" | "ar" | "tr" | "zh", Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
