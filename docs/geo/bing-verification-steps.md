# تکمیل وریفیکیشن Bing Webmaster Tools — دادورzan.com

**وضعیت تشخیص‌شده (۲۰۲۶-۱۰-۲۴):** کلید API بینگ معتبر است (`GetCrawlStats` پاسخ 200 می‌دهد) ولی سایت **وریفای نشده**:

| نشانه | نتیجه |
|---|---|
| `SubmitSitemap` API | `ErrorCode 2 UnknownError` روی هر دو واریانت (www و non-www) |
| کلید رسمی IndexNow (از پنل) | `403 SiteVerificationNotCompleted` |
| متا تگ `msvalidate.01` روی سایت | ❌ وجود ندارد (`NEXT_PUBLIC_BING_VERIFICATION` خالی) |
| `/BingSiteAuth.xml` | ❌ 404 |
| CrawlStats | ۳ روز داده، جمعاً ۱ صفحه خزش، `InIndex = 0` |

**بعد از وریفیکیشن، همه‌چیز خودکار کار می‌کند چون:** workflow روزانه (`daily-indexing`) هر روز ۶ صبح به وقت تهران SubmitSitemap را روی هر دو واریانت امتحان می‌کند و روند `InIndex` را در Step Summary ثبت می‌کند.

## راه حل — ۳ روش (سریع‌ترین اول)

### روش ۱: Import از Google Search Console (۳۰ ثانیه — توصیه‌شده)
1. وارد [bing.com/webmasters](https://www.bing.com/webmasters) شوید
2. اگر سایت را قبلاً اضافه کرده‌اید: از سایدبار **Settings → Site Verification** یا صفحه اصلی گزینه **Import** را بزنید
3. با اکانت گوگل لاگین کنید و پراپرتی `dadvarzan.com` (که با سرویس‌اکانت وریفای است) را انتخاب کنید
4. تمام — بینگ وریفیکیشن را از GSC کپی می‌کند

### روش ۲: متا تگ (۱ دقیقه + یک پیام به من)
1. در پنل BWT: **Settings → My Sites → dadvarzan.com → Site Verification → Meta tag**
2. کد داخل `content="..."` را کپی کنید و **همین‌جا در چت بفرستید**
3. من `NEXT_PUBLIC_BING_VERIFICATION` را روی هاست ست می‌کنم — متا تگ خودکار در همه صفحات ظاهر می‌شود
4. در پنل دکمه **Verify** را بزنید

### روش ۳: فایل XML
1. در پنل: **Site Verification → XML file** را انتخاب کنید
2. فایل `BingSiteAuth.xml` را دانلود کنید و **همین‌جا آپلود/بفرستید** — من در `public/` می‌گذارم و دیپلوی می‌کنم
3. در پنل **Verify** را بزنید

## بعد از وریفیکیشن چه اتفاقی می‌افتد؟
- ✅ SubmitSitemap روزانه شروع به پاسخ موفق می‌دهد (workflow آماده است)
- ✅ کلید رسمی IndexNow فعال می‌شود و آمار سابمیت در پنل شما دیده می‌شود (فعلاً fallback key کار می‌کند)
- ✅ بینگ شروع به خزش واقعی می‌کند — روند `InIndex` در summary روزانه قابل رصد است
- ✅ می‌توانید با workflow دستی **Bing Webmaster Audit** هر زمان وضعیت کامل را بگیرید

## نکته مهم
**IndexNow از الان کار می‌کند** (کلید fallback معتبر است) — در ۲۰۲۶-۱۰-۲۴ تعداد ۲۲۷ URL مشکل‌دار + کل sitemap (۷۷۵ URL) به Bing/Yandex/Seznam سابمیت شد. یعنی حتی قبل از وریفیکیشن، سیگنال خزش به بینگ می‌رسد؛ وریفیکیشن فقط برای **پنل، آمار و SubmitSitemap** لازم است.
