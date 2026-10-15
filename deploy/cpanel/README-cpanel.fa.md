# راهنمای سریع — دادورزان روی هاست اشتراکی Node (cPanel / هاست ایران)

> هر `git push` → Actions بیلد می‌کند → از طریق SSH یا FTP روی هاست می‌ریزد → Passenger ری‌استارت. بیلد روی سرور انجام **نمی‌شود** (RAM اشتراکی کافی نیست) — خروجی آماده آپلود می‌شود.

## قدم ۰ — چک‌لیست ۱ دقیقه‌ای در cPanel (بعداً به من بگویید جواب‌ها را)

1. آیکون **Setup Node.js App** هست؟ (بخش Software)
2. آیکون **PostgreSQL Databases** هست؟
3. آیکون **SSH/Terminal Access** هست؟ (SSH داریم یا فقط FTP؟)
4. در Setup Node.js App، بالاترین نسخهٔ Node چند است؟ (حداقل ۲۰٫۹ لازم است — ۲۲ بهتر)

## قدم ۱ — ساخت اپ در cPanel

**Setup Node.js App → Create Application:**
- Node.js version: بالاترین موجود (۲۰٫۹+)
- Application mode: Production
- Application root: `dadvarzan`
- Application URL: دامنهٔ شما
- **Application startup file: `app.js`** ← مهم
- Create → (فعلاً Run NPM Install نزنید — باندل خودکفاست)

## قدم ۲ — دیتابیس PostgreSQL

1. **PostgreSQL Databases** → دیتابیس بسازید (مثلاً `user_dadvarzan`) + کاربر و رمز → Add User To DB با ALL PRIVILEGES
2. **دیتا از Neon:** Actions → **«Export DB dump (Neon → برای phpPgAdmin)»** → Run (confirm: `DUMP`) → Artifact را دانلود کنید
3. **PostgreSQL Databases → phpPgAdmin** → دیتابیس → SQL → محتوای `neon-dump.sql` را Upload/اجرا کنید
4. DATABASE_URL شما شد:
   `postgresql://USER_DBUSER:PASSWORD@127.0.0.1:5432/USER_DADVARZAN`

## قدم ۳ — فایل .env (یک‌بار برای همیشه)

cPanel → **File Manager** → پوشهٔ `dadvarzan` → فایل جدید `.env` (طبق `deploy/env.production.example`). حداقل:

```
DATABASE_URL=postgresql://...:...@127.0.0.1:5432/...
AUTH_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_SITE_URL=https://دامنه-شما
```
+ کلیدهای کاوه‌نگار/زرین‌پال/AI را از Vercel کپی کنید. (`.env` در هر دیپلوی دست‌نخورده می‌ماند.)

## قدم ۴ — Secrets گیت‌هاب و اولین دیپلوی

اگر SSH دارید → secrets: `CPANEL_HOST`, `CPANEL_SSH_PORT`, `CPANEL_SSH_USER`, `CPANEL_SSH_KEY`, `CPANEL_APP_DIR=dadvarzan`
وگرنه → secrets: `CPANEL_FTP_HOST`, `CPANEL_FTP_PORT=21`, `CPANEL_FTP_USER`, `CPANEL_FTP_PASS`, `CPANEL_APP_DIR=/home/USER/dadvarzan`

(کلید SSH: لپ‌تاپ `ssh-keygen -t ed25519` → کلید عمومی در cPanel → SSH Access → Manage Keys)

بعد: `git push` → workflow مربوطه اجرا می‌شود (نامش: Deploy to Iran cPanel…). دومی «Setup Node.js App → Restart» دستی لازم نیست؛ restart.txt خودکار است.

## قدم ۵ — دامنه و SSL

- دامنه را به نیم‌سرورهای هاست وصل کنید (پنل هاست Addon/Primary Domain) یا رکورد A به IP هاست
- SSL: cPanel → **SSL/TLS Status → Run AutoSSL** (خودکار و رایگان)

## عیب‌یابی سریع

| مشکل | راه‌حل |
|---|---|
| 503 / صفحهٔ خطا | Setup Node.js App → فیلد STDERR log + «Stop/Start» بزنید؛ مطمئن شوید Startup file = `app.js` |
| خطای دیتابیس | `.env` → DATABASE_URL درست؟ در cPanel → PostgreSQL کاربر به دیتابیس وصل است؟ |
| سایت کهنه/کش | مرورگر Ctrl+Shift+R — سرویس ورکر خودش به‌روز می‌شود |
| آپلود FTP کند | فقط فایل‌های تغییری منتقل می‌شوند (mirror)؛ دفعات بعد سریع‌تر است |
| نصب فعال نشد | در Setup Node.js App دکمهٔ Restart را یک بار دستی بزنید |

## نکات

- **کرون law-sync:** cPanel → Cron Jobs → روزانه ۰۳:۰۰:
  `curl -s -X POST "https://دامنه/api/ai/law-sync" -H "Authorization: Bearer CRON_SECRET"` (در آدرس‌بار دامنهٔ واقعی و CRON_SECRET از .env)
- بیلد بدون DATABASE_URL هم امن است، ولی بهتر است secret `BUILD_DATABASE_URL` (Neon) را هم بگذارید تا پررندر دقیق باشد.
- هر وقت خواستید به VPS ارتقا دهید، پوشهٔ `deploy/` (VPS) و workflow «Deploy to Iran Host» آمادهٔ همان مسیر است.
