/**
 * لایهٔ EXT_B17 — تکمیل برچسب‌های داینامیک (آرایه‌های module-scope که با t(x.label)
 * رندر می‌شوند و ممیزی استاتیک لایهٔ ۱ آنها را نمی‌بیند) — Task 13.
 * هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  "پلتفرم هوشمند خدمات حقوقی، وکیل‌یابی و مشاوره آنلاین": ["The smart legal platform for finding lawyers and online consultation", "منصة الخدمات القانونية الذكية للعثور على محامٍ والاستشارة عبر الإنترنت", "Avukat bulma ve çevrimiçi danışmanlık için akıllı hukuk platformu", "寻找律师与在线咨询的智能法律平台"],
  "دادبان پلتفرم کامل خدمات حقوقی است: جستجوی وکیل متخصص، مشاوره متنی و صوتی و تصویری، ثبت و مدیریت پرونده، تنظیم قرارداد، دادخواست و شکواییه، بانک قوانین و دستیار حقوقی هوش مصنوعی.": ["Dadban is a complete legal services platform: finding specialist lawyers, text, voice and video consultations, filing and managing cases, contract drafting, lawsuits and complaints, a law library and an AI legal assistant.", "دادبان منصة خدمات قانونية متكاملة: البحث عن محامٍ متخصص، واستشارات نصية وصوتية ومرئية، وتسجيل الملفات وإدارتها، وصياغة العقود، والدعاوى والشكاوى، وبنك القوانين، ومساعد قانوني ذكي.", "Dadban eksiksiz bir hukuk hizmetleri platformudur: uzman avukat bulma, yazılı, sesli ve görüntülü danışmanlık, dava açma ve yönetme, sözleşme hazırlama, dava ve şikâyet dilekçeleri, mevzuat bankası ve yapay zekâ hukuk asistanı.", "Dadban 是一个完整的法律服务平台：寻找专业律师、文字/语音/视频咨询、案件的提交与管理、合同起草、诉状与控告状、法律法规库以及人工智能法律助手。"],
  "جستجوی وکیل متخصص، مشاوره آنلاین، ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی — همه در دادبان.": ["Finding a specialist lawyer, online consultation, filing cases, contract drafting and an AI legal assistant — all in Dadban.", "العثور على محامٍ متخصص، واستشارة عبر الإنترنت، وتسجيل الملفات، وصياغة العقود، ومساعد قانوني ذكي — كل ذلك في دادبان.", "Uzman avukat bulma, çevrimiçi danışmanlık, dava açma, sözleşme hazırlama ve yapay zekâ hukuk asistanı — hepsi Dadban'da.", "寻找专业律师、在线咨询、提交案件、起草合同与人工智能法律助手——尽在 Dadban。"],
  "پلتفرم خدمات حقوقی ایران: وکیل‌یابی، مشاوره آنلاین، ثبت پرونده، تنظیم قرارداد و دستیار حقوقی هوش مصنوعی.": ["Iran's legal services platform: finding lawyers, online consultation, filing cases, contract drafting and an AI legal assistant.", "منصة الخدمات القانونية في إيران: العثور على محامٍ، واستشارة عبر الإنترنت، وتسجيل الملفات، وصياغة العقود، ومساعد قانوني ذكي.", "İran'ın hukuk hizmetleri platformu: avukat bulma, çevrimiçi danışmanlık, dava açma, sözleşme hazırlama ve yapay zekâ hukuk asistanı.", "伊朗的法律服务平台：寻找律师、在线咨询、提交案件、起草合同与人工智能法律助手。"],
  "انتخاب زبان": ["Choose language", "اختيار اللغة", "Dil seçin", "选择语言"],
  "۱": ["1", "١", "1", "1"],
  "۲": ["2", "٢", "2", "2"],
  "۳": ["3", "٣", "3", "3"],
  "تنظیم اسناد": ["Document drafting", "صياغة المستندات", "Belge düzenleme", "文件起草"],
  "درخواست وکیل": ["Request a lawyer", "طلب محامٍ", "Avukat talebi", "请求律师"],
  "دستیار حقوقی AI": ["AI legal assistant", "المساعد القانوني الذكي", "YZ hukuk asistanı", "AI 法律助手"],
  "وکلا بر اساس شهر": ["Lawyers by city", "المحامون حسب المدينة", "Şehre göre avukatlar", "按城市查找律师"],
  "دستیار هوش مصنوعی": ["AI assistant", "المساعد الذكي", "YZ asistanı", "人工智能助手"],
  "مهریه، دیه، هزینه دادرسی و حق‌الوکاله": ["Mahr, diya, court fees and attorney fees", "المهر والدياة ورسوم الدعوى وأتعاب المحاماة", "Mehir, diyet, dava masrafları ve vekâlet ücreti", "彩礼、血金、诉讼费与律师费"],
  "دسته‌بندی‌ها": ["Categories", "الفئات", "Kategoriler", "分类"],
  "عضویت وکلای جدید": ["Join as a new lawyer", "عضوية محامين جدد", "Yeni avukat kaydı", "新律师入驻"],
  "دیه": ["Diya (blood money)", "الدياة", "Diyet", "血金（迪亚）"],
  "تأخیر دیه": ["Diya payment delay", "تأخير الدية", "Diyet gecikme faizi", "血金迟延"],
  "حق‌الوکاله": ["Attorney fees", "أتعاب المحاماة", "Vekâlet ücreti", "律师费"],
  "برای کشف، اسکرول کنید": ["Scroll to explore", "مرّر للاستكشاف", "Keşfetmek için kaydırın", "滚动探索"],
  "امور اداری و حضوری": ["Administrative and in-person matters", "الإجراءات الإدارية والحضورية", "İdari ve şahsi işlemler", "行政与到场事务"],
  "تنظیم تخصصی اسناد قانونی توسط وکیل": ["Specialized legal document drafting by a lawyer", "صياغة متخصصة للمستندات القانونية بواسطة محامٍ", "Avukat tarafından uzman hukuki belge düzenleme", "由律师专业起草法律文件"],
  "تنظیم، بررسی ریسک و قراردادساز گام‌به‌گام": ["Drafting, risk review and step-by-step contract builder", "الصياغة ومراجعة المخاطر ومنشئ العقود خطوة بخطوة", "Taslak hazırlama, risk incelemesi ve adım adım sözleşme oluşturucu", "起草、风险审查与逐步式合同生成器"],
  "ثبت شرکت، برند و علامت تجاری": ["Company, brand and trademark registration", "تسجيل الشركة والعلامة التجارية", "Şirket, marka ve ticari marka tescili", "公司、品牌与商标注册"],
  "خدمات حقوقی کسب‌وکار": ["Business legal services", "الخدمات القانونية للأعمال", "İşletme hukuki hizmetleri", "企业法律服务"],
  "دادخواست و شکواییه": ["Lawsuits and complaints", "الدعاوى والشكاوى", "Dava ve şikâyet dilekçeleri", "诉状与控告状"],
  "قراردادهای تجاری و مشاورهٔ B2B": ["Commercial contracts and B2B advisory", "العقود التجارية واستشارات الأعمال", "Ticari sözleşmeler ve B2B danışmanlığı", "商业合同与 B2B 咨询"],
  "متنی، صوتی یا تصویری با وکیل متخصص": ["Text, voice or video with an expert lawyer", "نصًّا أو صوتًا أو صورةً مع محامٍ خبير", "Uzman avukatla yazılı, sesli veya görüntülü", "与专业律师进行文字、语音或视频交流"],
  "نمایندهٔ دادبان با وکالت‌نامهٔ رسمی": ["A Dadban representative with an official power of attorney", "ممثل دادبان بوكالة رسمية", "Resmî vekâletnameyle Dadban temsilcisi", "凭正式委托书的 Dadban 代表"],
};

export const EXT_B17 = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
