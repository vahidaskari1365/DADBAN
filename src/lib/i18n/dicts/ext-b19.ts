/**
 * لایهٔ EXT_B19 — پلن‌های عضویت وکلا:
 * دکمهٔ «خرید پلن» پروفایل وکیل + صفحهٔ /plans (عنوان، متا، کارت‌های پلن، FAQ و CTA).
 * کلیدها = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "خرید پلن": [
    "Buy a plan",
    "شراء الباقة",
    "Paket satın al",
    "购买套餐",
  ],
  "پلن‌های عضویت وکلا": [
    "Lawyer membership plans",
    "باقات العضوية للمحامين",
    "Avukat üyelik paketleri",
    "律师会员套餐",
  ],
  "پلن‌های عضویت وکلا در دادورزان: نمایش برتر در نتایج جستجو، نشان تأیید ویژه، آمار پیشرفته پروفایل و اولویت در دریافت درخواست‌های موکلان؛ پلن مناسب وکیل خود را انتخاب کنید.": [
    "Lawyer membership plans on Dadvarzan: top placement in search results, a special verification badge, advanced profile analytics and priority in receiving client requests — pick the right plan for your practice.",
    "باقات العضوية للمحامين في دادورزان: الظهور الأفضل في نتائج البحث، شارة تحقق خاصة، إحصاءات متقدمة للملف وأولوية في استلام طلبات الموكلين؛ اختر الباقة المناسبة لملفك.",
    "Dadvarzan avukat üyelik paketleri: arama sonuçlarında üst sıra, özel doğrulama rozeti, gelişmiş profil analitiği ve müvekkil taleplerinde öncelik — size uygun paketi seçin.",
    "Dadvarzan 律师会员套餐：搜索结果优先展示、专属认证徽章、高级档案分析及客户请求优先接收；请为您的律师档案选择合适的套餐。",
  ],
  "ارتفاع بگیرید؛ دیده شوید": [
    "Rise higher; get seen",
    "ارتفع؛ ليُرَك",
    "Yükselin; görünün",
    "更上一层，让更多人看见",
  ],
  "پروفایل خود را به یک ویترین حرفه‌ای تبدیل کنید؛ در نتایج جستجو بالاتر دیده شوید و درخواست‌های بیشتری از موکلان دریافت کنید.": [
    "Turn your profile into a professional showcase; rank higher in search results and receive more requests from clients.",
    "حوّل ملفك إلى واجهة احترافية؛ ظهر في مراتب أعلى من نتائج البحث واستلم طلبات أكثر من الموكلين.",
    "Profilinizi profesyonel bir vitrine dönüştürün; arama sonuçlarında üst sıralarda görün ve müvekkillerden daha fazla talep alın.",
    "将您的档案打造成专业橱窗；在搜索结果中排名更高，获得更多客户请求。",
  ],
  "نشان تأیید ویژه روی پروفایل": [
    "Special verification badge on your profile",
    "شارة تحقق خاصة على ملفك",
    "Profilinizde özel doğrulama rozeti",
    "档案上的专属认证徽章",
  ],
  "نمایش برتر در نتایج جستجو": [
    "Top placement in search results",
    "الظهور الأفضل في نتائج البحث",
    "Arama sonuçlarında üst sıralarda gösterim",
    "搜索结果中优先展示",
  ],
  "آمار بازدید و عملکرد پروفایل": [
    "Profile visits and performance analytics",
    "إحصاءات زيارات الملف وأدائه",
    "Profil ziyaret ve performans istatistikleri",
    "档案访问量与表现统计",
  ],
  "اشتراک وکلا": [
    "Lawyer subscriptions",
    "اشتراكات المحامين",
    "Avukat abonelikleri",
    "律师订阅",
  ],
  "پلن خود را انتخاب کنید": [
    "Choose your plan",
    "اختر باقتك",
    "Paketinizi seçin",
    "选择您的套餐",
  ],
  "همهٔ پلن‌ها شامل پروفایل حرفه‌ای، درگاه پرداخت امن و پشتیبانی دادورزان است.": [
    "Every plan includes a professional profile, secure payment gateway and Dadvarzan support.",
    "كل باقة تتضمن ملفاً احترافياً وبوابة دفع آمنة ودعم دادورزان.",
    "Her pakette profesyonel profil, güvenli ödeme altyapısı ve Dadvarzan desteği vardır.",
    "所有套餐均包含专业档案、安全支付通道和 Dadvarzan 支持。",
  ],
  "با اشتراک سالانه ۲ ماه رایگان": [
    "2 months free with annual billing",
    "شهران مجاناً مع الاشتراك السنوي",
    "Yıllık abonelikle 2 ay ücretsiz",
    "年付享 2 个月免费",
  ],
  "پایه": [
    "Basic",
    "أساسية",
    "Temel",
    "基础版",
  ],
  "شروع حضور حرفه‌ای در دادورزان": [
    "Start your professional presence on Dadvarzan",
    "ابدأ حضورك الاحترافي في دادورزان",
    "Dadvarzan'da profesyonel varlığınıza başlayın",
    "开启您在 Dadvarzan 的专业形象",
  ],
  "پروفایل عمومی کامل با عکس و تخصص‌ها": [
    "Full public profile with photo and specialties",
    "ملف عام كامل بالصورة والتخصصات",
    "Foto ve uzmanlıklarıyla tam herkese açık profil",
    "含照片与专业领域的完整公开档案",
  ],
  "دریافت درخواست مشاوره و پرونده": [
    "Receive consultation and case requests",
    "استلام طلبات الاستشارة والقضايا",
    "Danışma ve dosya talepleri alma",
    "接收咨询与案件请求",
  ],
  "نمایش در فهرست وکلای استان": [
    "Listed in your province's lawyer directory",
    "الظهور في قائمة محامي محافظتك",
    "İlinizin avukat listesinde yer alma",
    "展示于您所在省份的律师名录",
  ],
  "ساعت کاری و زمان‌های آزاد": [
    "Working hours and availability slots",
    "ساعات العمل والمواعيد المتاحة",
    "Çalışma saatleri ve uygunluk saatleri",
    "工作时间与空闲时段",
  ],
  "شروع رایگان": [
    "Start free",
    "ابدأ مجاناً",
    "Ücretsiz başla",
    "免费开始",
  ],
  "حرفه‌ای": [
    "Pro",
    "احترافية",
    "Profesyonel",
    "专业版",
  ],
  "ماهانه": [
    "month",
    "شهرياً",
    "aylık",
    "月",
  ],
  "برای وکلایی که می‌خواهند بیشتر دیده شوند": [
    "For lawyers who want to be seen more",
    "للمحامين الذين يريدون أن يُروا أكثر",
    "Daha fazla görünmek isteyen avukatlar için",
    "适合希望获得更多曝光的律师",
  ],
  "اولویت نمایش در نتایج جستجو": [
    "Priority placement in search results",
    "أولوية الظهور في نتائج البحث",
    "Arama sonuçlarında öncelikli gösterim",
    "搜索结果优先排名",
  ],
  "نشان «حرفه‌ای» روی پروفایل": [
    "«Pro» badge on your profile",
    "شارة «احترافية» على ملفك",
    "Profilinizde «Profesyonel» rozeti",
    "档案上的「专业」徽章",
  ],
  "آمار کامل بازدید و عملکرد پروفایل": [
    "Full profile visits and performance analytics",
    "إحصاءات كاملة لزيارات الملف وأدائه",
    "Tam profil ziyaret ve performans istatistikleri",
    "完整的档案访问与表现统计",
  ],
  "معرفی در خبرنامه و شبکه‌های اجتماعی": [
    "Featuring in newsletter and social media",
    "التقديم في النشرة البريدية وشبكات التواصل",
    "Bülten ve sosyal medyada tanıtım",
    "新闻通讯与社交媒体推荐",
  ],
  "پشتیبانی اولویت‌دار": [
    "Priority support",
    "دعم ذو أولوية",
    "Öncelikli destek",
    "优先支持",
  ],
  "فعال‌سازی پلن حرفه‌ای": [
    "Activate Pro plan",
    "تفعيل الباقة الاحترافية",
    "Profesyonel paketi etkinleştir",
    "开通专业版",
  ],
  "طلایی": [
    "Gold",
    "ذهبية",
    "Altın",
    "黄金版",
  ],
  "حداکثر دیده‌شدن برای پروفایل شما": [
    "Maximum visibility for your profile",
    "أقصى ظهور ممكن لملفك",
    "Profiliniz için maksimum görünürlük",
    "为您的档案带来最大曝光",
  ],
  "صدر فهرست وکلا و نتایج جستجو": [
    "Top of the lawyer directory and search results",
    "صدارة قائمة المحامين ونتائج البحث",
    "Avukat listesi ve arama sonuçlarının zirvesi",
    "律师名录与搜索结果榜首",
  ],
  "نشان طلایی تأیید ویژه": [
    "Gold special verification badge",
    "شارة تحقق ذهبية خاصة",
    "Altın özel doğrulama rozeti",
    "黄金专属认证徽章",
  ],
  "کارت معرفی اختصاصی در صفحهٔ اصلی": [
    "Dedicated feature card on the homepage",
    "بطاقة تقديم مخصصة في الصفحة الرئيسية",
    "Ana sayfada özel tanıtım kartı",
    "主页专属推荐卡片",
  ],
  "کمپین معرفی ماهانه در فضای مجازی": [
    "Monthly online promotion campaign",
    "حملة تقديم شهرية على الإنترنت",
    "Aylık çevrimiçi tanıtım kampanyası",
    "每月线上推广活动",
  ],
  "مدیر پروفایل اختصاصی": [
    "Dedicated profile manager",
    "مدير ملف مخصص",
    "Özel profil yöneticisi",
    "专属档案管理员",
  ],
  "فعال‌سازی پلن طلایی": [
    "Activate Gold plan",
    "تفعيل الباقة الذهبية",
    "Altın paketi etkinleştir",
    "开通黄金版",
  ],
  "قیمت‌ها بدون احتساب مالیات بر ارزش افزوده است؛ پس از انتخاب پلن، کارشناسان دادورزان فعال‌سازی را انجام می‌دهند.": [
    "Prices exclude VAT; after choosing a plan, Dadvarzan experts handle the activation.",
    "الأسعار لا تشمل ضريبة القيمة المضافة؛ بعد اختيار الباقة يتولى خبراء دادورزان التفعيل.",
    "Fiyatlar KDV hariçtir; paketi seçtikten sonra Dadvarzan uzmanları etkinleştirmeyi gerçekleştirir.",
    "价格不含增值税；选择套餐后，Dadvarzan 专家将为您完成开通。",
  ],
  "چطور پلنم را فعال کنم؟": [
    "How do I activate my plan?",
    "كيف أفعّل باقتي؟",
    "Paketimi nasıl etkinleştiririm?",
    "如何开通我的套餐？",
  ],
  "روی دکمهٔ پلن موردنظر کلیک کنید و در صفحهٔ تماس درخواست فعال‌سازی را ثبت کنید؛ کارشناسان دادورزان حداکثر تا یک روز کاری پلن شما را فعال می‌کنند.": [
    "Click your desired plan's button and submit an activation request via the contact page; Dadvarzan experts activate your plan within one business day.",
    "انقر زر الباقة المطلوبة وسجّل طلب التفعيل عبر صفحة التواصل؛ يفعّل خبراء دادورزان باقتك في غضون يوم عمل واحد كحد أقصى.",
    "İstediğiniz paketin düğmesine tıklayın ve iletişim sayfasından etkinleştirme talebi oluşturun; Dadvarzan uzmanları paketinizi en geç bir iş günü içinde etkinleştirir.",
    "点击所需套餐的按钮，并在联系页面提交开通请求；Dadvarzan 专家将在一个工作日内为您的套餐完成开通。",
  ],
  "آیا می‌توانم پلنم را بعداً تغییر دهم؟": [
    "Can I change my plan later?",
    "هل يمكنني تغيير باقتي لاحقاً؟",
    "Paketimi daha sonra değiştirebilir miyim?",
    "之后可以更换套餐吗？",
  ],
  "بله؛ در هر زمان می‌توانید پلن خود را ارتقا دهید؛ مابه‌التفاوت به‌صورت منصفانه و متناسب با روزهای باقی‌مانده محاسبه می‌شود.": [
    "Yes; you can upgrade your plan at any time; the difference is fairly calculated based on the remaining days.",
    "نعم؛ يمكنك ترقية باقتك في أي وقت؛ يُحسب الفرق بشكل عادل بحسب الأيام المتبقية.",
    "Evet; paketinizi istediğiniz zaman yükseltebilirsiniz; fark, kalan günlere göre adil biçimde hesaplanır.",
    "可以；您可随时升级套餐，差价将按剩余天数公平计算。",
  ],
  "آیا امکان لغو اشتراک هست؟": [
    "Can I cancel my subscription?",
    "هل يمكن إلغاء الاشتراك؟",
    "Aboneliğimi iptal edebilir miyim?",
    "可以取消订阅吗？",
  ],
  "بله؛ اشتراک ماهانه است و هر زمان قابل لغو است؛ پس از لغو، پروفایل شما به پلن پایه بازمی‌گردد و هیچ هزینهٔ اضافه‌ای دریافت نمی‌شود.": [
    "Yes; the subscription is monthly and can be cancelled anytime; after cancellation your profile returns to the Basic plan with no extra charges.",
    "نعم؛ الاشتراك شهري ويمكن إلغاؤه في أي وقت؛ بعد الإلغاء يعود ملفك إلى الباقة الأساسية دون أي رسوم إضافية.",
    "Evet; abonelik aylıktır ve her zaman iptal edilebilir; iptal sonrası profiliniz Temel pakete döner ve ek ücret alınmaz.",
    "可以；订阅按月计费，可随时取消；取消后您的档案将恢复为基础版，不产生任何额外费用。",
  ],
  "برای انتخاب پلن مناسب راهنمایی می‌خواهید؟": [
    "Need help choosing the right plan?",
    "تحتاج مساعدة في اختيار الباقة المناسبة؟",
    "Uygun paketi seçmek için rehberlik mi istiyorsunuz?",
    "需要帮助选择合适的套餐？",
  ],
  "کارشناسان دادورزان بر اساس حوزهٔ تخصص و اهداف شما، بهترین پلن را پیشنهاد می‌دهند.": [
    "Dadvarzan experts recommend the best plan based on your specialty and goals.",
    "يقترح خبراء دادورزان أفضل باقة بحسب تخصصك وأهدافك.",
    "Dadvarzan uzmanları uzmanlık alanınıza ve hedeflerinize göre en uygun paketi önerir.",
    "Dadvarzan 专家将根据您的专业领域和目标推荐最佳套餐。",
  ],
  "مشاوره خرید پلن": [
    "Plan purchase consultation",
    "استشارة شراء الباقة",
    "Paket satın alma danışmanlığı",
    "套餐购买咨询",
  ],
};

export const EXT_B19 = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
