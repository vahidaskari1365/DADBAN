/**
 * لایهٔ EXT_B22 — CMS محتوای صفحات (پنل ادمین) + تالار گفتگو (/forum):
 * همهٔ برچسب‌های پنل محتوا، آپلود عکس، فروم و مدیریت آن.
 * کلیدها = رشتهٔ فارسی منبع (عیناً با نیم‌فاصله). هر ردیف: [en, ar, tr, zh].
 */
type Row = [string, string, string, string];

const D: Record<string, Row> = {
  /* ── تالار گفتگو — سربرگ و متادیتا ── */
  "تالار گفتگو دادورزان": ["Dadvarzan Forum", "منتدى دادورزان", "Dadvarzan Forumu", "Dadvarzan 论坛"],
  "تالار گفتگو برای همه — پرسش حقوقی، تجربه‌ها، نظرها و گفتگوی آزاد؛ کاربران و وکلا و مهمان‌ها همه می‌توانند بنویسند.": [
    "A forum for everyone — legal questions, experiences, opinions and open discussion; users, lawyers and guests can all post.",
    "منتدى للجميع — أسئلة قانونية وتجارب وآراء وحوار مفتوح؛ المستخدمون والمحامون والزوار جميعهم يمكنهم الكتابة.",
    "Herkes için forum — hukuki sorular, deneyimler, görüşler ve açık tartışma; kullanıcılar, avukatlar ve misafirler yazabilir.",
    "面向所有人的论坛——法律问题、经验、观点与自由讨论；用户、律师和访客都可以发言。",
  ],
  "تالار گفتگو": ["Forum", "المنتدى", "Forum", "论坛"],
  "جای همه‌چیز و همه‌کس — پرسش حقوقی، تجربه، نظر و گفتگوی آزاد؛ بدون نیاز به ثبت‌نام بنویسید.": [
    "A place for everyone and everything — legal questions, experiences, opinions and open talk; post without signing up.",
    "مكان للجميع ولكل شيء — أسئلة قانونية وتجارب وآراء وحوار حر؛ اكتب دون تسجيل.",
    "Herkesin ve her şeyin yeri — hukuki sorular, deneyimler, görüşler ve serbest sohbet; kayıt olmadan yazın.",
    "属于每个人、包罗万象的地方——法律问题、经验、观点和自由交流；无需注册即可发言。",
  ],
  "برای همه": ["For everyone", "للجميع", "Herkes için", "面向所有人"],
  "با مدیریت ادمین": ["Admin-moderated", "بإدارة المشرف", "Yönetici denetimli", "管理员审核"],
  "دسته‌های تالار گفتگو": ["Forum categories", "تصنيفات المنتدى", "Forum kategorileri", "论坛分类"],

  /* ── آهنگساز موضوع جدید ── */
  "دست شما هم خالی نیست!": ["Your voice counts too!", "صوتك مهم أيضًا!", "Sizin de sesiniz var!", "你也来发声！"],
  "با نام حساب خودتان بنویسید — همه می‌بینند و می‌توانند پاسخ بدهند.": [
    "Post under your own account name — everyone can see and reply.",
    "اكتب باسم حسابك — الجميع يمكنهم الاطلاع والرد.",
    "Kendi hesap adınızla yazın — herkes görebilir ve yanıt verebilir.",
    "用你的账号名发言——所有人可见并可回复。",
  ],
  "لازم نیست عضو باشید؛ نام دلخواه بگذارید و بنویسید. برای نمایش نام حساب، وارد شوید.": [
    "No account needed — pick any nickname and post. Sign in to show your account name.",
    "لا حاجة للحساب — اختر أي اسم مستعار واكتب. سجّل الدخول لعرض اسم حسابك.",
    "Hesap gerekmez — bir takma ad seçin ve yazın. Hesap adınızı göstermek için giriş yapın.",
    "无需注册——随意取个昵称即可发言。登录可显示账号名。",
  ],
  "موضوع جدید": ["New topic", "موضوع جديد", "Yeni konu", "新话题"],
  "موضوع جدید تالار گفتگو": ["New forum topic", "موضوع جديد في المنتدى", "Yeni forum konusu", "论坛新话题"],
  "دسته": ["Category", "التصنيف", "Kategori", "分类"],
  "نام شما (اختیاری — مهمان)": ["Your name (optional — guest)", "اسمك (اختياري — زائر)", "Adınız (isteğe bağlı — misafir)", "你的名字（选填——访客）"],
  "مثلاً: رضا از تهران": ["e.g. Reza from Tehran", "مثال: رضا من طهران", "örn. Tahran'dan Rıza", "例如：来自德黑兰的礼萨"],
  "عنوان موضوع": ["Topic title", "عنوان الموضوع", "Konu başlığı", "话题标题"],
  "خلاصهٔ گفتگو را در یک جمله بنویسید": ["Sum up the discussion in one sentence", "لخّص الموضوع في جملة واحدة", "Konuyu tek cümlede özetleyin", "用一句话概括讨论内容"],
  "هرچه می‌خواهید بنویسید — پرسش، تجربه، نظر…": [
    "Write whatever you like — a question, an experience, an opinion…",
    "اكتب ما تريد — سؤالًا أو تجربة أو رأيًا…",
    "İstediğinizi yazın — soru, deneyim, görüş…",
    "想写什么都可以——问题、经验、观点……",
  ],
  "در حال ارسال…": ["Sending…", "جارٍ الإرسال…", "Gönderiliyor…", "发送中……"],
  "ثبت موضوع": ["Post topic", "نشر الموضوع", "Konuyu gönder", "发布话题"],
  "موضوع شما ثبت شد ✓": ["Your topic was posted ✓", "تم نشر موضوعك ✓", "Konunuz yayınlandı ✓", "你的话题已发布 ✓"],
  "تعداد نوشته‌های شما زیاد است؛ کمی بعد دوباره تلاش کنید.": [
    "You are posting too fast; please try again a bit later.",
    "أنت تنشر بسرعة كبيرة؛ حاول مرة أخرى بعد قليل.",
    "Çok hızlı gönderi yapıyorsunuz; lütfen birazdan tekrar deneyin.",
    "你发布得太频繁了；请稍后再试。",
  ],
  "ثبت موضوع ناموفق بود": ["Posting the topic failed", "فشل نشر الموضوع", "Konu gönderilemedi", "发布话题失败"],

  /* ── فهرست موضوع‌ها ── */
  "موضوع": ["topic", "موضوع", "konu", "话题"],
  "پاسخ": ["replies", "ردود", "yanıt", "回复"],
  "بازدید": ["views", "مشاهدات", "görüntüleme", "浏览"],
  "هنوز موضوعی در این دسته نیست": ["No topics in this category yet", "لا توجد مواضيع في هذا التصنيف بعد", "Bu kategoride henüz konu yok", "该分类下暂无话题"],
  "اولین نفر باشید — با دکمهٔ «موضوع جدید» گفتگو را شروع کنید.": [
    "Be the first — start the conversation with “New topic”.",
    "كن الأول — ابدأ الحوار بـ «موضوع جديد».",
    "İlk siz olun — “Yeni konu” ile sohbeti başlatın.",
    "做第一个——用「新话题」开启对话。",
  ],
  "سنجاق‌شده": ["Pinned", "مُثبَّت", "Sabitlendi", "置顶"],
  "قواعد تالار: احترام به همه، بدون اطلاعات شخصی حساس (کد ملی، آدرس). نوشته‌های نامناسب توسط مدیر پنهان می‌شود.": [
    "Forum rules: respect everyone; no sensitive personal data (national ID, address). Inappropriate posts are hidden by the admin.",
    "قواعد المنتدى: احترام الجميع؛ دون بيانات شخصية حساسة (الرقم الوطني، العنوان). المشاركات غير المناسبة يخفيها المشرف.",
    "Forum kuralları: herkese saygı; hassas kişisel veri yok (milli kimlik, adres). Uygunsuz gönderileri yönetici gizler.",
    "论坛规则：尊重所有人；不要发布敏感个人信息（身份证号、地址）。不当内容将被管理员隐藏。",
  ],

  /* ── دسته‌های فروم ── */
  "گفتگوی آزاد": ["Open talk", "حوار مفتوح", "Serbest sohbet", "自由交流"],
  "پرسش حقوقی": ["Legal question", "سؤال قانوني", "Hukuki soru", "法律提问"],
  "تجربه‌های موکل‌ها": ["Clients' experiences", "تجارب الموكلين", "Müvekkil deneyimleri", "当事人的经验"],
  "گفتگوی وکلا": ["Lawyers' corner", "ركن المحامين", "Avukatlar köşesi", "律师园地"],
  "کار و امور اداری": ["Work & administrative affairs", "العمل والشؤون الإدارية", "İş ve idari işler", "工作与行政事务"],
  "پیشنهاد به دادورزان": ["Suggestions for Dadvarzan", "اقتراحات لـ دادورزان", "Dadvarzan'a öneriler", "对 Dadvarzan 的建议"],

  /* ── بج نقش‌ها ── */
  "مدیر": ["Admin", "مشرف", "Yönetici", "管理员"],
  "کارشناس": ["Expert", "خبير", "Uzman", "专家"],
  "وکیل": ["Lawyer", "محامٍ", "Avukat", "律师"],
  "وکیل کارمندان": ["Employee-lawyer", "محامي الموظفين", "Çalışan avukatı", "员工事务律师"],
  "کاربر": ["Member", "عضو", "Üye", "会员"],
  "مهمان": ["Guest", "زائر", "Misafir", "访客"],

  /* ── صفحهٔ موضوع ── */
  "موضوع یافت نشد — تالار گفتگو دادورزان": ["Topic not found — Dadvarzan Forum", "الموضوع غير موجود — منتدى دادورزان", "Konu bulunamadı — Dadvarzan Forumu", "未找到话题——Dadvarzan 论坛"],
  "گفتگوی تالار دادورزان": ["A Dadvarzan forum discussion", "حوار من منتدى دادورزان", "Bir Dadvarzan forum tartışması", "Dadvarzan 论坛讨论"],
  "بازگشت به تالار گفتگو": ["Back to the forum", "العودة إلى المنتدى", "Foruma dön", "返回论坛"],
  "پاسخ بگذارید": ["Leave a reply", "اترك ردًا", "Yanıt bırakın", "发表回复"],
  "نظر یا پاسخ خود را بنویسید…": ["Write your comment or reply…", "اكتب تعليقك أو ردك…", "Yorumunuzu veya yanıtınızı yazın…", "写下你的评论或回复……"],
  "ارسال پاسخ": ["Send reply", "إرسال الرد", "Yanıtı gönder", "发送回复"],
  "مهمان — بدون ثبت‌نام": ["Guest — no sign-up", "زائر — دون تسجيل", "Misafir — kayıt yok", "访客——无需注册"],
  "پاسخ شما ثبت شد ✓": ["Your reply was posted ✓", "تم نشر ردك ✓", "Yanıtınız yayınlandı ✓", "你的回复已发布 ✓"],
  "ثبت پاسخ ناموفق بود": ["Posting the reply failed", "فشل نشر الرد", "Yanıt gönderilemedi", "回复失败"],
  "هنوز پاسخی نیست — اولین پاسخ را شما بنویسید.": [
    "No replies yet — be the first to reply.",
    "لا ردود بعد — كن أول المرددين.",
    "Henüz yanıt yok — ilk yanıtı siz yazın.",
    "暂无回复——来做第一个回复的人。",
  ],
  "متن پاسخ": ["Reply text", "نص الرد", "Yanıt metni", "回复内容"],

  /* ── پنل ادمین: محتوای صفحات ── */
  "محتوای صفحات سایت": ["Site page content", "محتوى صفحات الموقع", "Site sayfa içeriği", "网站页面内容"],
  "بلوک محتوایی": ["content block", "كتلة محتوى", "içerik bloğu", "内容块"],
  "برای هر صفحهٔ سایت مطلب و عکس اضافه کنید — همین‌جا بنویسید، فوراً روی همان صفحهٔ عمومی نمایش داده می‌شود. نوع بلوک: اطلاعیه، متن، ویژگی، پرسش‌ومپاسخ و تصویر.": [
    "Add posts and images to any site page — write here and it appears instantly on that public page. Block types: announcement, text, feature, FAQ and image.",
    "أضف مقالات وصورًا إلى أي صفحة — اكتب هنا وتظهر فورًا على الصفحة العامة. أنواع الكتل: إعلان، نص، ميزة، سؤال وجواب، صورة.",
    "Herhangi bir site sayfasına yazı ve görsel ekleyin — buraya yazın, aynı genel sayfada anında görünür. Blok türleri: duyuru, metin, özellik, SSS ve görsel.",
    "为任意网站页面添加文章和图片——在这里编写，立即显示在对应的公开页面上。区块类型：公告、文本、特性、问答和图片。",
  ],
  "صفحهٔ مقصد": ["Target page", "الصفحة الهدف", "Hedef sayfa", "目标页面"],
  "بلوک روی همین صفحهٔ عمومی رندر می‌شود": ["The block renders on this public page", "تُعرض الكتلة على هذه الصفحة العامة", "Bloğu bu genel sayfada görünür", "区块将显示在该公开页面上"],
  "بخش / جای نمایش": ["Section / placement", "القسم / مكان العرض", "Bölüm / yerleşim", "分区/显示位置"],
  "خالی = بالای صفحه": ["empty = top of page", "فارغ = أعلى الصفحة", "boş = sayfa başı", "留空 = 页面顶部"],
  "برای نمایش در انتهای صفحه بنویسید: bottom (فقط همین کلمه)": [
    "To place at the page bottom write: bottom (just this word)",
    "للعرض في أسفل الصفحة اكتب: bottom (هذه الكلمة فقط)",
    "Sayfa sonuna koymak için yazın: bottom (yalnızca bu kelime)",
    "如需放在页面底部请填写：bottom（仅此单词）",
  ],
  "نوع بلوک": ["Block type", "نوع الكتلة", "Blok türü", "区块类型"],
  "اطلاعیهٔ شاخص": ["Highlight announcement", "إعلان بارز", "Öne çıkan duyuru", "醒目公告"],
  "متن ساده": ["Plain text", "نص عادي", "Düz metin", "纯文本"],
  "معرفی ویژگی": ["Feature highlight", "إبراز ميزة", "Özellik tanıtımı", "特性介绍"],
  "پرسش و پاسخ": ["FAQ", "سؤال وجواب", "SSS", "问答"],
  "تصویر + توضیح": ["Image + caption", "صورة + شرح", "Görsel + açıklama", "图片+说明"],
  "زیرعنوان": ["Subtitle", "العنوان الفرعي", "Alt başlık", "副标题"],
  "اختیاری": ["optional", "اختياري", "isteğe bağlı", "选填"],
  "متن کامل مطلب — هرچند خط بخواهید": ["Full text — as many lines as you like", "النص الكامل — بأي عدد من الأسطر", "Tam metin — istediğiniz kadar satır", "完整内容——行数不限"],
  "عکس (آپلود)": ["Image (upload)", "صورة (رفع)", "Görsel (yükleme)", "图片（上传）"],
  "لینک دکمه": ["Button link", "رابط الزر", "Düğme bağlantısı", "按钮链接"],
  "صفحه": ["Page", "الصفحة", "Sayfa", "页面"],
  "نوع": ["Type", "النوع", "Tür", "类型"],
  "عکس": ["Image", "صورة", "Görsel", "图片"],

  /* ── برچسب صفحات رجیستری ── */
  "خانه (/)": ["Home (/)", "الرئيسية (/)", "Ana sayfa (/)", "首页 (/)"],
  "دربارهٔ ما (/about)": ["About (/about)", "من نحن (/about)", "Hakkımızda (/about)", "关于我们 (/about)"],
  "تماس با ما (/contact)": ["Contact (/contact)", "اتصل بنا (/contact)", "İletişim (/contact)", "联系我们 (/contact)"],
  "وکیل‌یابی (/lawyers)": ["Find a lawyer (/lawyers)", "البحث عن محامٍ (/lawyers)", "Avukat bul (/lawyers)", "找律师 (/lawyers)"],
  "پلن‌های عضویت (/plans)": ["Membership plans (/plans)", "باقات العضوية (/plans)", "Üyelik paketleri (/plans)", "会员套餐 (/plans)"],
  "مقالات (/knowledge)": ["Articles (/knowledge)", "المقالات (/knowledge)", "Makaleler (/knowledge)", "文章 (/knowledge)"],
  "پرسش و پاسخ (/qa)": ["Q&A (/qa)", "سؤال وجواب (/qa)", "Soru-cevap (/qa)", "问答 (/qa)"],
  "خدمات حقوقی (/services)": ["Legal services (/services)", "الخدمات القانونية (/services)", "Hukuki hizmetler (/services)", "法律服务 (/services)"],
  "کسب‌وکارها (/business)": ["Businesses (/business)", "الأعمال (/business)", "İşletmeler (/business)", "企业服务 (/business)"],
  "تعرفه خدمات (/pricing)": ["Service pricing (/pricing)", "أسعار الخدمات (/pricing)", "Hizmet fiyatları (/pricing)", "服务定价 (/pricing)"],
  "پرداخت هزینه (/fee-payment)": ["Fee payment (/fee-payment)", "دفع الرسوم (/fee-payment)", "Ücret ödemesi (/fee-payment)", "费用支付 (/fee-payment)"],
  "بازار پرونده‌ها (/case-board)": ["Case board (/case-board)", "لوحة القضايا (/case-board)", "Dosya panosu (/case-board)", "案件市场 (/case-board)"],
  "قوانین و مقررات (/terms)": ["Terms (/terms)", "الشروط (/terms)", "Koşullar (/terms)", "条款 (/terms)"],
  "حریم خصوصی (/privacy)": ["Privacy (/privacy)", "الخصوصية (/privacy)", "Gizlilik (/privacy)", "隐私 (/privacy)"],
  "تالار گفتگو (/forum)": ["Forum (/forum)", "المنتدى (/forum)", "Forum (/forum)", "论坛 (/forum)"],

  /* ── پنل ادمین: تالار گفتگو ── */
  "تالار گفتگو — موضوع‌ها": ["Forum — topics", "المنتدى — المواضيع", "Forum — konular", "论坛——话题"],
  "همهٔ موضوع‌های نوشته‌شدهٔ کاربران و مهمان‌ها. برای برداشتن موقت، وضعیت را hidden کنید.": [
    "All topics written by users and guests. To hide temporarily, set status to hidden.",
    "كل المواضيع المكتوبة من المستخدمين والزوار. للإخفاء المؤقت اجعل الحالة hidden.",
    "Kullanıcıların ve misafirlerin yazdığı tüm konular. Geçici gizlemek için durumu hidden yapın.",
    "用户和访客发布的所有话题。如需临时隐藏，请将状态设为 hidden。",
  ],
  "هر موضوعی را می‌توانید پنهان (status=hidden)، سنجاق یا حذف کنید — تغییرات فوراً در /forum اعمال می‌شود.": [
    "Hide (status=hidden), pin or delete any topic — changes apply to /forum instantly.",
    "أخفِ (status=hidden) أو ثبّت أو احذف أي موضوع — تُطبَّق التغييرات على /forum فورًا.",
    "Herhangi bir konuyu gizleyin (status=hidden), sabitleyin veya silin — değişiklikler anında /forum'a yansır.",
    "可隐藏（status=hidden）、置顶或删除任意话题——更改立即应用于 /forum。",
  ],
  "مدیریت پاسخ‌ها ←": ["Manage replies ←", "إدارة الردود ←", "Yanıtları yönet ←", "管理回复 ←"],
  "تالار گفتگو — پاسخ‌ها": ["Forum — replies", "المنتدى — الردود", "Forum — yanıtlar", "论坛——回复"],
  "پاسخ‌های ثبت‌شده روی موضوع‌ها. برای برداشتن موقت، وضعیت را hidden کنید؛ شمارهٔ topic_id = موضوع مربوطه.": [
    "Replies posted on topics. To hide temporarily, set status to hidden; topic_id = the related topic.",
    "الردود المنشورة على المواضيع. للإخفاء المؤقت اجعل الحالة hidden؛ topic_id = الموضوع المرتبط.",
    "Konulara yazılan yanıtlar. Geçici gizlemek için durumu hidden yapın; topic_id = ilgili konu.",
    "发布在话题下的回复。如需临时隐藏，请将状态设为 hidden；topic_id = 对应话题。",
  ],
  "موضوع (شناسه)": ["Topic (ID)", "الموضوع (المعرّف)", "Konu (ID)", "话题（ID）"],
  "نویسنده": ["Author", "الكاتب", "Yazar", "作者"],
  "نقش": ["Role", "الدور", "Rol", "角色"],
  "وضعیت": ["Status", "الحالة", "Durum", "状态"],
  "سنجاق‌شده (بالای فهرست)": ["Pinned (top of list)", "مُثبَّت (أعلى القائمة)", "Sabitlenmiş (liste başı)", "置顶（列表顶部）"],
  "نمایش": ["Show", "إظهار", "Göster", "显示"],
  "پنهان": ["Hidden", "مخفي", "Gizli", "隐藏"],

  /* ── فیلد عکس در جدول ادمین ── */
  "آپلود ناموفق بود": ["Upload failed", "فشل الرفع", "Yükleme başarısız", "上传失败"],
  "خطا در آپلود تصویر": ["Image upload error", "خطأ في رفع الصورة", "Görsel yükleme hatası", "图片上传出错"],
  "انتخاب تصویر": ["Choose image", "اختيار الصورة", "Görsel seç", "选择图片"],
  "حذف تصویر": ["Remove image", "إزالة الصورة", "Görseli kaldır", "移除图片"],
  "PNG، JPEG، WebP یا GIF — حداکثر ۳ مگابایت": ["PNG, JPEG, WebP or GIF — up to 3 MB", "PNG أو JPEG أو WebP أو GIF — حتى ٣ ميغابايت", "PNG, JPEG, WebP veya GIF — en fazla 3 MB", "PNG、JPEG、WebP 或 GIF——最大 3 MB"],

  /* ── خطاهای آپلود (پیام مستقیم سرور) ── */
  "حجم تصویر باید بین ۱ بایت تا ۳ مگابایت باشد.": [
    "Image size must be between 1 byte and 3 MB.",
    "يجب أن يكون حجم الصورة بين ١ بايت و٣ ميغابايت.",
    "Görsel boyutu 1 bayt ile 3 MB arasında olmalı.",
    "图片大小需在 1 字节至 3 MB 之间。",
  ],
  "فقط تصویر PNG، JPEG، WebP یا GIF مجاز است.": [
    "Only PNG, JPEG, WebP or GIF images are allowed.",
    "يُسمح فقط بصور PNG أو JPEG أو WebP أو GIF.",
    "Yalnızca PNG, JPEG, WebP veya GIF görsellere izin verilir.",
    "仅允许 PNG、JPEG、WebP 或 GIF 图片。",
  ],
  "محتوای فایل با فرمت اعلام‌شده سازگار نیست.": [
    "File content does not match the declared format.",
    "محتوى الملف لا يطابق الصيغة المعلنة.",
    "Dosya içeriği belirtilen biçimle uyuşmuyor.",
    "文件内容与所声明格式不符。",
  ],
};

export const EXT_B22: Record<"en" | "ar" | "tr" | "zh", Record<string, string>> = {
  en: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]])),
  ar: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]])),
  tr: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[2]])),
  zh: Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[3]])),
};
