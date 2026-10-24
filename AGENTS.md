# AGENTS.md — استاندارد اجباری ساخت و نگهداری دادورزان

> این سند برای **همه عامل‌های کدنویس و توسعه‌دهندگان** الزامی است. هر صفحه، کامپوننت،
> محتوا یا فیچری که از این پس به دادورزان اضافه می‌شود **باید** از چک‌لیست‌های این سند
> عبور کند. مرجع کامل معماری: `DADVARZAN-KNOWLEDGE.md` (خارج از ریپو، نزد عامل).

---

## ۱) پنج استاندارد الزامی — چیست و در دادورزان یعنی چه

### SEO — سئوی کلاسیک (گوگل/بینگ)
- هر صفحه یک `canonical` یگانه دارد (از `metadata-builder.ts` استفاده کن، دستی نساز).
- عنوان ≤ ۶۰ کاراکتر، توضیحات متا ۱۲۰–۱۶۰ کاراکتر، کلیدواژه در H1 و اولین پاراگراف.
- ساختار H1→H2→H3 بدون پرش سطح؛ هیچ تیتری خالی نماند.
- لینک داخلی: هر صفحه جدید حداقل ۳–۵ لینک ورودی از صفحات مرتبط (Hub/Spoke — قوانین↔مقالات↔وکلا).
- تصاویر: همیشه `alt` توصیفی فارسی؛ از `next/image` با width/height (جلوگیری از CLS).
- sitemap: صفحه جدید عمومی باید در `src/app/sitemap.ts` اضافه شود؛ noindex ها نه.

### GEO — بهینه‌سازی برای موتورهای مولد (ChatGPT, Perplexity, Gemini, Copilot)
- **آمار و استناد**: ادعاهای عددی باید منبع/تاریخ داشته باشند (روش پرینستون: Cite Sources ‎+۳۰–۱۱۵٪، Statistics ‎+۴۰٪، Quotation ‎+۳۰–۴۰٪).
- ارجاع به ماده قانونی با قالب «ماده X قانون Y» — هرگز ماده جعل نشود (مطابق پرامپت `llm.ts`).
- لینک‌های خارجی معتبر (قانون‌گذار، قوه قضاییه) در محتوای راهنما.
- محتوا خودکفا و بدون وابستگی به JS رندر شود (خزنده‌های AI HTML خام می‌خوانند).
- **ممنوع**: keyword stuffing (اثر صفر یا منفی در تحقیق GEO).

### AEO — بهینه‌سازی پاسخ‌محور (AI Overviews، فچر اسنیپت)
- هر صفحه محتوایی با «پاسخ سریع» شروع شود: ۲–۳ جمله مستقیم جواب، بعد توضیح.
- پرسش‌های متداول با `<FaqSection>` رندر شود (خودش FAQPage JSON-LD تزریق می‌کند — schema دستی اضافه نکنید، تکرار ممنوع).
- سوال به‌صورت تیتر مستقل + پاسخ خودکفا زیرش.
- جدول‌های مقایسه‌ای/قیمت به‌جای پاراگراف طولانی (برداشت مستقیم توسط موتور پاسخ).

### AIO — کشف‌پذیری برای عامل‌های هوش مصنوعی
- صفحات عمومی جدید باید از `proxy.ts` مذاکره `Accept: text/markdown` پیروی کنند — برای صفحات محتوایی مهم، معادل مارک‌داون در `src/lib/ai-discovery.ts` اضافه شود.
- llms.txt (`src/lib/seo.ts → LLMS_TXT`) و llms-full.txt با هر بخش جدید به‌روز شود — **همه لینک‌ها فرمت مارک‌داون `[متن](آدرس)`؛ لینک خام شمرده نمی‌شود**.
- اندپوینت‌های `ai/summary.json`, `ai/faq.json`, `ai/service.json` با فیچر جدید همگام بمانند.
- `robots.ts` سیاست ربات‌های AI را حفظ کند: تیرِ «جستجو» (OAI-SearchBot، PerplexityBot، Claude-SearchBot، Googlebot، Perplexity-User، Meta-ExternalAgent) هرگز بسته نشود.

### SXO — بهینه‌سازی تجربه جستجو (از کلیک تا اقدام)
- هماهنگی عنوان SERP ↔ H1 ↔ محتوای صفحه؛ وعده‌ای که صفحه به‌جا نمی‌آورد ندهید.
- CTA اصلی هر صفحه یک اقدام مشخص: ثبت پرونده، رزرو مشاوره، یافتن وکیل.
- «اقدام بعدی» منطبق بر intent صفحه — در پایان هر راهنما، پل به سرویس مرتبط.
- اعتماد: آمار واقعی یا «—»؛ هیچ داده جعلی (قانون صفرِ LAUNCH-READINESS-REPORT).

---

## ۲) چک‌لیست اجباری صفحه جدید (قبل از هر merge)

```
□ metadata از metadata-builder / generateMetadata با canonical
□ title و description در محدوده استاندارد + intent درست
□ H1 یکتا؛ سلسله‌مراتب تیترها درست
□ پاسخ سریع AEO در ابتدای محتوا
□ FaqSection با حداقل ۳ پرسش (اگر صفحه محتوایی است)
□ JSON-LD نوع درست (Article/Lawyer/Service/FAQPage/BreadcrumbList)
□ حداقل ۳ لینک داخلی ورودی + ۳ خروجی مرتبط
□ همه تصاویر alt دارند؛ next/image با ابعاد
□ در sitemap.ts ثبت شده (اگر عمومی و ایندکس‌پذیر)
□ در llms.txt/llms-full.txt ثبت شده (اگر ارزش ارجاع AI دارد)
□ محتوا در HTML خام حاضر است (بدون نیاز به JS)
□ نسخه موبایل + RTL تست شده — ظاهر صفحات موجود خراب نشده
□ typecheck + lint + build سبز
```

## ۳) زیرساخت موجود — از این‌ها استفاده کن، بازنساز

| نیاز | ابزار موجود |
|---|---|
| اسکیمای JSON-LD | `safeJsonLd()` در `lib/jsonld.ts` + `lib/seo.ts` (article/lawyer/service/qa/breadcrumb) |
| FAQ | `components/seo/faq-section.tsx` (schema خودکار) |
| لینک‌های مرتبط | `components/seo/link-grid.tsx` |
| متادیتا | `lib/metadata-builder.ts` |
| مارک‌داون برای AI | `lib/ai-discovery.ts` (HOME_MARKDOWN و …) |
| لندینگ سئو | `lib/seo-landings.ts` (SPECIALTY_LANDINGS/CITY_LANDINGS) |
| robots/sitemap/RSS | `app/robots.ts` · `app/sitemap.ts` · `app/knowledge/feed` |

## ۴) قواعد طراحی — ظاهر مقدس است

- **هرگز** استایل/چیدمان صفحات موجود را برای «بهبود سئو» تغییر نده؛ سئو با لایه‌های نامرئی (schema، متا، محتوا) کار می‌کند.
- صفحه جدید باید از سیستم طراحی فعلی پیروی کند: `components/ui.tsx` + shadcn + تم روشن/تاریک + RTL + وزیرمتن.
- برای ساخت/ری‌استایل صفحه جدید از اسکیل‌های نصب‌شده استفاده کن: `taste-skill` (ضبط کیفیت)، `design-library` (مرجع ۸۴ DESIGN.md)، `web-design-guidelines` (بازبینی نهایی)، `playwright-cli` (اسکرین‌شات سه عرض: 375/768/1440).
- تغییر UI قابل‌مشاهده = همیشه اسکرین‌شات قبل/بعد.

## ۵) اسکیل‌های نصب‌شده (`.claude/skills/`)

| اسکیل | کاربرد |
|---|---|
| `taste-skill` | آرت‌دایرکشن ضد-slop برای صفحات جدید — اجرای کامل run صفحه |
| `design-library` | ۸۴ سند DESIGN.md برندهای واقعی — مرجع بصری |
| `web-design-guidelines` | بازبینی نهایی UI طبق Web Interface Guidelines ورسل |
| `playwright-browser` | اتوماسیون مرورگر برای تست بصری و e2e |
| `geo-optimizer` | آدیت ۹-بخشی GEO + روش‌های پرینستون + robots/llms/schema |
| `gsc-indexing-audit` | آدیت ایندکس گوگل با Search Console (نیازمند MCP GSC) |
| `gsc-cannibalization-check` | تشخیص هم‌نوع‌خواری کلیدواژه بین صفحات |
| `gsc-content-opportunities` | فرصت‌های سریع: رتبه ۱۱–۲۰ با ایمپرشن بالا |
| `gsc-seo-weekly-report` | گزارش هفتگی عملکرد سئو |
| `openseo-seo-audit` | آدیت کامل سئو با داده DataForSEO (نیازمند MCP OpenSEO) |
| `openseo-keyword-research` | تحقیق کلیدواژه اولویت‌بندی‌شده |
| `openseo-keyword-clustering` | خوشه‌بندی intent و نگاشت به صفحه |
| `openseo-ai-visibility-audit` | آدیت حضور برند در پاسخ‌های AI (GEO/AEO) |
| `openseo-competitor-analysis` | تحلیل رقیب ارگانیک |

> اسکیل‌های `gsc-*` به سرور MCP گوگل‌سرچ‌کنسول (`mcp-gsc/gsc_server.py`) و `openseo-*` به
> سرور MCP openseo.so وصل می‌شوند؛ بدون اتصال، همان‌ها را به‌صورت چک‌لیست دستی اجرا کن.

## ۶) جریان کاری پیشنهادی هر فیچر سئو-محور

1. **تحقیق**: `openseo-keyword-research` یا `gsc-content-opportunities` → کلیدواژه هدف
2. **نگاشت**: `openseo-keyword-clustering` → کدام صفحه؟ جدید یا موجود؟
3. **ساخت**: چک‌لیست §۲ + سیستم طراحی §۴
4. **بازبینی**: `web-design-guidelines` + اسکرین‌شات playwright
5. **آدیت GEO**: `geo-optimizer` روی صفحه منتشرشده
6. **پایش هفتگی**: `gsc-seo-weekly-report` + ایندکس‌چک
