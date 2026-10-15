# انتقال دادورزان به هست ایران — با CI/CD خودکار (تجربهٔ شبیه Vercel)

> هدف: هر `git push` به شاخهٔ `main` → گیت‌هاب خودش بیلد می‌کند → خودش روی سرور ایران نصب می‌کند → health-check می‌گیرد → اگر خراب بود خودش برمی‌گردد به نسخهٔ قبلی. دقیقاً مثل Vercel، فقط روی زیرساخت خودتان.

## نقشهٔ کلی

```
لپ‌تاپ شما ──git push──►  GitHub (main)
                            │
                            ▼
                  GitHub Actions (بیلد Next.js standalone)
                            │  scp بستهٔ آماده
                            ▼
                  سرور ایران (Ubuntu 24.04)
                  ├── Nginx  (80/443 + SSL + فایل‌های استاتیک)
                  ├── systemd dadvarzan.service  (node server.js → 127.0.0.1:3000)
                  ├── PostgreSQL 16  (فقط localhost — از بیرون بسته)
                  └── /opt/dadvarzan/releases  (۵ نسخهٔ آخر برای rollback)
```

### معادل‌سازی مفاهیم Vercel

| در Vercel | معادل روی سرور ایران |
|---|---|
| Build خودکار بعد از هر push | GitHub Actions (workflow `deploy-iran.yml`) |
| Runtime serverless | `systemd` + Node standalone روی VPS |
| Edge / CDN | Nginx (gzip + کش استاتیک immutable) |
| Environment Variables | `/etc/dadvarzan/dadvarzan.env` + Secrets گیت‌هاب |
| Instant Rollback | `release.sh` — بازگردانی symlink در چند ثانیه |
| Cron Jobs | `/etc/cron.d/dadvarzan` (جایگزین `vercel.json`) |
| Neon Postgres | PostgreSQL 16 روی همان سرور (localhost) |

### فایل‌های این پوشه

| فایل | نقش |
|---|---|
| `../.github/workflows/deploy-iran.yml` | بیلد + استقرار خودکار بعد از هر push |
| `../.github/workflows/migrate-db.yml` | مهاجرت دیتابیس Neon → سرور ایران (اجرای دستی) |
| `setup-server.sh` | آماده‌سازی یک‌بارهٔ سرور (۵ دقیقه) |
| `release.sh` | نصب ریلیز جدید + health-check + rollback خودکار |
| `dadvarzan.service` | سرویس systemd اپلیکیشن |
| `nginx.conf.template` | کانفیگ reverse proxy + کش |
| `backup-db.sh` | بکاپ روزانهٔ دیتابیس (نگه‌داری ۱۴ نسخه) |
| `cron-tasks.sh` | جایگزین Vercel Cron (law-sync) |
| `env.production.example` | مرجع همهٔ متغیرهای محیطی |

---

## فاز ۰ — پیش‌نیازها

1. **سرور مجازی (VPS) ایران** — Ubuntu 24.04 LTS با حداقل:
   - ۲ هسته CPU، ۴ گیگ RAM، ۶۰ گیگ SSD
   - ( فروشندگان معمول: پارس‌پک، ایران‌سرور، آسیاتک، ابرآروان، لند… )
2. **دامنه** — مثلاً `dadvarzan.ir`. لازم است چون Service Worker و کوکی‌های secure به HTTPS نیاز دارند و HTTPS به دامنه نیاز دارد. (دامنهٔ `.ir` را می‌توانید از همان فروشندهٔ VPS بخرید.)
3. **دسترسی root** به سرور (SSH).

> ⚠️ هاست اشتراکی (cPanel) جواب نمی‌دهد — Next.js به Node دائم‌کار نیاز دارد.

## فاز ۱ — آماده‌سازی سرور (حدود ۵ دقیقه)

از لپ‌تاپ خودتان:

```bash
# ۱) کلید SSH بسازید (اگر ندارید) — برای گیت‌هاب و اتصال شما
ssh-keygen -t ed25519 -C "dadvarzan-deploy" -f ~/.ssh/dadvarzan_key

# ۲) کلید عمومی را روی سرور بگذارید (IP و رمز root را از پنل فروشنده بگیرید)
ssh-copy-id -i ~/.ssh/dadvarzan_key.pub root@SERVER_IP

# ۳) پوشهٔ deploy را روی سرور ببرید
scp -i ~/.ssh/dadvarzan_key -r deploy root@SERVER_IP:/root/

# ۴) روی سرور: آماده‌سازی کامل (با دامنهٔ خودتان)
ssh -i ~/.ssh/dadvarzan_key root@SERVER_IP
cd /root/deploy
bash setup-server.sh  dadvarzan.ir        # ← دامنهٔ خودتان؛ ندارید؟ خالی بگذارید
```

اسکریپت در پایان **رمز دیتابیس** و مسیر فایل env را چاپ می‌کند. فایل env را باز کنید و کلیدهای اختیاری (کاوه‌نگار، زرین‌پال، AI و…) را از مقادیر Vercel (پنل Vercel → Settings → Environment Variables) کپی و پر کنید:

```bash
nano /etc/dadvarzan/dadvarzan.env     # بعد از هر تغییر:
systemctl restart dadvarzan           # (فعلاً هنوز سرویس بالا نیامده — اشکالی ندارد)
```

## فاز ۲ — دامنه و SSL

1. در پنل دامنه، یک رکورد **A** بسازید: `@` → `SERVER_IP` (و `www` → همان).
2. صبر کنید DNS پخش شود (معمولاً چند دقیقه): `ping dadvarzan.ir` باید IP سرور را بدهد.
3. روی سرور، گواهی SSL بگیرید:
   ```bash
   certbot --nginx -d dadvarzan.ir -d www.dadvarzan.ir --redirect
   ```
   تموم — Nginx خودش HTTPS و ریدایرکت را می‌چیند و تمدید خودکار هم فعال است (`certbot renew`).

## فاز ۳ — Secrets گیت‌هاب

در گیت‌هاب → مخزن `DADBAN` → **Settings → Secrets and variables → Actions**:

**Secrets** (تب Secrets):

| نام | مقدار |
|---|---|
| `IRAN_HOST` | IP عمومی سرور |
| `IRAN_SSH_USER` | `root` |
| `IRAN_SSH_KEY` | کل محتوای فایل `~/.ssh/dadvarzan_key` **خصوصی** (از `-----BEGIN` تا `-----END`) |
| `IRAN_SSH_PORT` | `22` (یا پورت SSH شما) |
| `BUILD_DATABASE_URL` | URL فعلی Neon (همان `DATABASE_URL` در Vercel) — فقط برای مرحلهٔ بیلد استفاده می‌شود |
| `NEON_DATABASE_URL` | همان URL Neon — برای workflow مهاجرت دیتابیس |

**Variables** (تب Variables — مقادیر عمومی‌اند، secret نیستند):

| نام | مقدار |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://dadvarzan.ir` |
| `NEXT_PUBLIC_GA_ID` و `NEXT_PUBLIC_GSC_VERIFICATION` و `NEXT_PUBLIC_BING_VERIFICATION` و `NEXT_PUBLIC_TELEGRAM_BOT` | اگر در Vercel داشتید، همان‌ها |

> چرا کلید SSH به گیت‌هاب می‌دهیم؟ چون Actions باید بتواند به سرور وصل شود. کلید فقط به همین سرور می‌رسد و هر وقت خواستید، از سرور حذفش کنید.

## فاز ۴ — اولین استقرار

فقط این را push کنید (یا در اکشن‌ها «Deploy to Iran Host» را دستی Run بزنید):

```bash
git add -A && git commit -m "CI/CD هاست ایران" && git push origin main
```

از این به بعد هر push به `main` = استقرار خودکار (~۳ تا ۶ دقیقه). مسیر مشاهدهٔ لاگ: **گیت‌هاب → تب Actions → Deploy to Iran Host**.

بعد از سبز شدن run، روی سرور صحتش را بگیرید:

```bash
curl -s https://dadvarzan.ir/api/health        # → {"ok":true}
systemctl status dadvarzan                      # active (running)
```

> تا وقتی secrets را نگذاشته‌اید، workflow به‌صورت سبز «رد می‌شود» — یعنی پوش‌های معمولی بدون خطای قرمز Action هستند.

## فاز ۵ — مهاجرت دیتابیس (Neon → سرور ایران)

> چرا از GitHub Actions؟ چون رانر گیت‌هاب هم به Neon می‌رسد هم به سرور شما؛ از داخل ایران اتصال مستقیم به Neon قابل اطمینان نیست.

به‌ترتیب و **بعد از** فاز ۴ (چون اپ باید روی سرور بالا باشد):

1. فرصت کم‌ترافیک انتخاب کنید (سایتِ Vercel حین مهاجرت ~۵ دقیقه فریز می‌شود).
2. گیت‌هاب → **Actions → Migrate DB (Neon → Iran host) → Run workflow** → در فیلد confirm بنویسید: `MIGRATE` → Run.
3. workflow این کارها را می‌کند: dump کامل از Neon → انتقال به سرور → توقف موقت اپ → بازگردانی با مالکیت درست → ANALYZE → روشن‌کردن اپ → health-check → گزارش تعداد جداول.

بعدش برای اطمینان، در سایتِ جدید لاگین کنید و چند صفحه را ببینید. (حساب‌ها، مقالات، پلن‌ها، تالار گفتگو… همه با دیتا منتقل می‌شوند.)

## فاز ۶ — سوییچ نهایی

1. یک بار دیگر push کنید تا **آخرین نسخه** با دیتای تازه استقرار یابد (اختیاری).
2. workflow قدیمی Vercel را خاموش کنید: گیت‌هاب → Actions → **Deploy to Vercel (production)** → سه‌نقطه → **Disable workflow**. (کدش را حذف هم می‌توانید بکنید: فایل `.github/workflows/deploy-vercel.yml`)
3. از این لحظه کاربرانِ دامنهٔ شما به سرور ایران می‌روند. اگر بعداً مطمئن شدید، پروژهٔ Neon و حساب Vercel را نگه دارید تا چند هفته (backout آسان) — بعد حذف.

> اگر وسط راه خواستید برگردید به Vercel: فقط DNS را به عقب برنگردانید؛ Vercel دامنه را اضافه کنید و رکورد A را به Vercel بدهید. دیتای جدید روی سرور ایران مانده است — اول یک مهاجرت معکوس (dump از سرور → Neon) لازم می‌شود.

## فاز ۷ — زندگی روزمره (مثل Vercel)

| کار | چطور |
|---|---|
| انتشار تغییر جدید | `git push origin main` → ۳-۶ دقیقه بعد روی سرور |
| دیدن لاگ زندهٔ اپ | `journalctl -u dadvarzan -f` (روی سرور) |
| وضعیت سرویس | `systemctl status dadvarzan` |
| تغییر env | `nano /etc/dadvarzan/dadvarzan.env` → `systemctl restart dadvarzan` |
| رول‌بک دستی | `ls -1t /opt/dadvarzan/releases` → نسخهٔ قبلی را بردارید: `ln -sfn /opt/dadvarzan/releases/<dir> /opt/dadvarzan/current && systemctl restart dadvarzan` |
| بکاپ‌ها | `/var/backups/dadvarzan/*.sql.gz` — روزانه ۰۳:۰۰ تهران، نگه‌داری ۱۴ روز |
| اجرای مهاجرت اسکیما (drizzle) | از لپ‌تاپ: `ssh -L 5433:127.0.0.1:5432 root@SERVER_IP` → در ترمینال دیگر: `DATABASE_URL=postgresql://dadvarzan:PASS@127.0.0.1:5433/dadvarzan bunx drizzle-kit push` |

## نکات مهم مخصوص ایران (صادقانه)

- **سرویس‌های خارجی از IP ایران**: زرین‌پال، کاوه‌نگار و Atria (هوش مصنوعی) مشکلی ندارند. اما `api.telegram.org` و بعضی از LLM‌های خارجی (OpenRouter/Groq/Gemini) از IP ایران ممکن است فیلتر باشند — بخش تلگرام و بخشی از AI بدون پروکسی کار نکند. هستهٔ سایت مستقل از این‌هاست.
- **jsdelivr** (فونت/کتابخانه‌های Tesseract و CSP فعلی) از ایران معمولاً در دسترس است.
- گیت‌هاب Actions از خارج ایران به سرور شما SSH می‌زند — اگر فروشندهٔ VPS محدودیت جغرافیایی دارد، از پنلش IP خارجی را بلاک‌لیست نکنید.
- اپ فقط `127.0.0.1:3000` است و فقط از Nginx سرو می‌شود؛ PostgreSQL هم فقط localhost است — سطح حملهٔ بیرونی صفر.

## عیب‌یابی سریع

| مشکل | چک |
|---|---|
| run اکشن قرمز در مرحلهٔ SSH | secrets (به‌خصوص کلید خصوصی کامل با خطوط BEGIN/END) و پورت SSH |
| صفحه 502 | `systemctl status dadvarzan` + `journalctl -u dadvarzan -n 50` — سرویس بالا نیست |
| `/api/health` → `{"ok":false}` | دیتابیس: `sudo -u postgres pg_isready` و `DATABASE_URL` در env |
| certbot خطا می‌دهد | DNS هنوز ست نشده — `dig +short dadvarzan.ir` باید IP سرور را بدهد |
| deploy سبز شد ولی سایت کهنه است | مرورگر PWA را کش کرده — یک رفرش سخت (Ctrl+Shift+R) یا چند ثانیه صبر (Service Worker خودش به‌روز می‌شود) |
| مهاجرت DB شکست خورد | لاگ run + روی سرور: `sudo -u dadvarzan psql -d dadvarzan -c '\dt'` ببینید جداول آمده یا نه |
