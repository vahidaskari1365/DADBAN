# راهنمای استقرار دادبان روی Vercel 🚀

این راهنما گام‌به‌گام استقرار پروژه روی Vercel را توضیح می‌دهد.

## پیش‌نیازها

- اکانت GitHub (کد این مخزن)
- اکانت Vercel (رایگان — [vercel.com](https://vercel.com))
- یک دیتابیس PostgreSQL (پیشنهاد: [Neon](https://neon.tech) — رایگان)

## گام ۱ — ساخت دیتابیس PostgreSQL

1. وارد [neon.tech](https://neon.tech) شوید و پروژه بسازید (Region پیشنهادی: **Frankfurt** — نزدیک‌ترین به ایران).
2. Connection String را کپی کنید — شکلی شبیه این دارد:
   ```
   postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/dadban?sslmode=require
   ```

## گام ۲ — Import مخزن در Vercel

1. در Vercel: **Add New → Project** و مخزن `DADBAN` را انتخاب کنید.
2. Vercel به‌طور خودکار Next.js را تشخیص می‌دهد؛ تنظیمات Build را دست نزنید.
3. **Node.js Version**: در بخش Settings → General → Node.js Version گزینهٔ **22.x** را انتخاب کنید (پروژه به Node ≥22.12 نیاز دارد).

## گام ۳ — متغیرهای محیطی

در **Settings → Environment Variables** این مقادیر را وارد کنید:

| متغیر | توضیح | اجباری؟ |
|---|---|---|
| `DATABASE_URL` | Connection String دیتابیس (گام ۱) | ✅ |
| `AUTH_SECRET` | رشتهٔ تصادفی ≥۳۲ کاراکتر (session کاربران) | ✅ |
| `ADMIN_EMAIL` | ایمیل ورود پنل مدیریت | ✅ |
| `ADMIN_PASSWORD` | رمز قوی برای پنل مدیریت | ✅ |
| `ADMIN_SECRET` | رشتهٔ تصادفی ≥۳۲ کاراکتر (session ادمین) | ✅ |
| `ZAI_API_KEY` | کلید Z.ai برای هوش مصنوعی (پیشنهاد می‌شود قبل از انتشار، rotate شود) | ⭕ |
| `LLM_BASE_URL` | پیش‌فرض: `https://api.z.ai/api/paas/v4` | ⭕ |
| `LLM_MODEL` | پیش‌فرض: `glm-4.6` | ⭕ |
| `NEXT_PUBLIC_SITE_URL` | دامنهٔ نهایی (مثل `https://dadban.ir`) | ⭕ |

> ⚠️ **امنیت کلید:** کلید Z.ai و رمز ادمین را هرگز در کد یا فایل commit نکنید — فقط در Vercel ثبت کنید. اگر کلیدی در چت/عمومی به اشتراک گذاشته شده، حتماً از پنل ارائه‌دهنده آن را باطل و جدید بسازید.

## گام ۴ — Deploy و ساخت جداول

1. **Deploy** را بزنید. اولین build چند دقیقه طول می‌کشد.
2. بعد از انتشار، یک بار آدرس زیر را در مرورگر باز کنید تا جداول ساخته و دادهٔ اولیه درج شود (خودکار):
   ```
   https://your-app.vercel.app/api/health/db
   ```
3. سایت آماده است — صفحهٔ اصلی، وکیل‌یابی و پنل ادمین باید کار کنند.

## گام ۵ — دامنه اختصاصی (اختیاری)

در **Settings → Domains** دامنهٔ خود (مثل `dadban.ir`) را اضافه و DNS را طبق راهنمای Vercel تنظیم کنید.

---

## معماری هوش مصنوعی در تولید

زنجیرهٔ تأمین هوش مصنوعی دادبان (فایل `src/lib/llm.ts`):

```
1) ZAI_API_KEY (Z.ai / GLM)     ← تولید روی Vercel
2) z-ai-web-dev-sdk             ← محیط توسعه
3) Pollinations (بدون کلید)     ← fallback نهایی
```

قابلیت‌های فعال:
- 💬 دستیار حقوقی چت (با استناد به مواد قانونی) — `/ai-assistant`
- 📄 تحلیل سند با عکس (بینایی ماشین) — `/ai`
- 🔎 جستجوی وب حقوقی با ذکر منبع — `/ai`
- 🔊 متن به گفتار و 🎙 گفتار به متن — `/ai`

## نکات فنی

- **فریم‌ورک:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **دیتابیس:** PostgreSQL + Drizzle ORM (بدون DB هم سایت در حالت degraded بالا می‌آید)
- **Node:** ≥22.12 (فایل `.nvmrc` موجود است)
- **احراز هویت:** session امضاشده HMAC + scrypt + کوکی httpOnly/SameSite
- **امنیت:** rate limiting روی همه APIها، هدرهای امنیتی (CSP/HSTS)، CSRF token
- **پروکسی:** `src/proxy.ts` (استاندارد جدید Next.js 16 جایگزین middleware)
