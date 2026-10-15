#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-server.sh — آماده‌سازی یک‌بارهٔ سرور ایران (Ubuntu 24.04)
#
#   usage (روی سرور، به‌صورت root):
#     bash setup-server.sh  [your-domain.ir]
#
#   اگر دامنه دارید پاسش دهید (مثلاً dadvarzan.ir)؛ اگر هنوز ندارید خالی بگذارید
#   (سایت با IP سرو می‌شود و بعداً فقط کانفیگ Nginx را دوباره اعمال می‌کنیم).
#
# انجام می‌دهد: timezone تهران، بسته‌ها (PostgreSQL 16 + Nginx + certbot + …)،
# Node 24، swap، کاربر سرویس، ساخت دیتابیس و کاربر postgres، فایل env،
# سرویس systemd، سایت nginx، فایروال (ufw)، fail2ban، بکاپ و کرون روزانه.
#
# نکتهٔ مهم: دیتابیس فقط روی 127.0.0.1 گوش می‌دهد و از بیرون قابل دسترسی نیست.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="dadvarzan"
APP_DIR="/opt/$APP"
ENV_DIR="/etc/$APP"
ENV_FILE="$ENV_DIR/$APP.env"

[[ $EUID -eq 0 ]] || { echo "✗ با root اجرا کنید: sudo bash setup-server.sh"; exit 1; }

. /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then
  echo "⚠ این اسکریپت برای Ubuntu طراحی شده (فعلی: ${ID:-?}) — ادامه می‌دهم…"
fi

echo "══ ۱/۱۲  Timezone → Asia/Tehran"
timedatectl set-timezone Asia/Tehran 2>/dev/null || true

echo "══ ۲/۱۲  نصب بسته‌های پایه"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg openssl jq rsync \
  postgresql postgresql-contrib nginx certbot python3-certbot-nginx \
  ufw fail2ban >/dev/null

echo "══ ۳/۱۲  Node.js 24 (برای اجرای standalone)"
if command -v node >/dev/null 2>&1 && [[ "$(node -v | tr -d v | cut -d. -f1)" -ge 24 ]]; then
  echo "  node $(node -v) موجود است — رد شد"
else
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
  echo "  نصب شد: $(node -v)"
fi

echo "══ ۴/۱۲  Swap (اگر نباشد — ۲ گیگ)"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "  swap فعال شد"
else
  echo "  swap موجود است — رد شد"
fi

echo "══ ۵/۱۲  کاربر سرویس و پوشه‌ها"
id -u "$APP" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP"
mkdir -p "$APP_DIR"/{releases,bin,shared/uploads} "$ENV_DIR" /var/backups/$APP

echo "══ ۶/۱۲  PostgreSQL — دیتابیس و کاربر"
systemctl enable --now postgresql >/dev/null 2>&1 || true
PG_VER="$(ls /etc/postgresql | head -1)"
PG_READY="$(sudo -u postgres pg_isready -q; echo $?)"
[[ "$PG_READY" = "0" ]] || { echo "✗ postgres آماده نیست"; exit 1; }

DB_PASS="$(openssl rand -hex 24)"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$APP'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE ROLE $APP LOGIN PASSWORD '$DB_PASS';" >/dev/null
else
  # کاربر هست؛ اگر env قبلاً ساخته نشده، رمز را ریست می‌کنیم تا مطابق env جدید باشد
  sudo -u postgres psql -c "ALTER ROLE $APP WITH LOGIN PASSWORD '$DB_PASS';" >/dev/null
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$APP'" | grep -q 1; then
  sudo -u postgres createdb -O "$APP" "$APP"
fi
echo "  PostgreSQL $PG_VER آماده است (listen فقط localhost)"

echo "══ ۷/۱۲  فایل متغیرهای محیطی: $ENV_FILE"
if [ -f "$ENV_FILE" ]; then
  echo "  موجود است — دست‌نخورده نگه داشته شد (رمز دیتابیس جدید در NOTE پایین چاپ می‌شود)"
  cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"
else
  cat > "$ENV_FILE" <<EOF
# متغیرهای محیطی تولیدی — /etc/dadvarzan/dadvarzan.env
# بعد از هر تغییر:  systemctl restart dadvarzan

# ── الزامی ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://$APP:$DB_PASS@127.0.0.1:5432/$APP
AUTH_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_SITE_URL=${DOMAIN:+https://$DOMAIN}

# ── توکن‌های داخلی ──────────────────────────────────────────────────────────
CRON_SECRET=$(openssl rand -hex 32)
# LAW_SYNC_TOKEN=
# I18N_WARM_KEY=
# LLM_HEALTH_TOKEN=

# ── پیامک (کاوه‌نگار) ───────────────────────────────────────────────────────
# KAVEHNEGAR_API_KEY=
# KAVEHNEGAR_SENDER=

# ── ایمیل ──────────────────────────────────────────────────────────────────
# SMTP_URL=smtps://user:pass@smtp.example.ir:465
# EMAIL_FROM="دادورزان <no-reply@your-domain.ir>"
# RESEND_API_KEY=

# ── پرداخت (زرین‌پال) ──────────────────────────────────────────────────────
# ZARINPAL_MERCHANT_ID=
# ZARINPAL_SANDBOX=false
# PAYMENT_PROVIDER=zarinpal

# ── تلگرام ─────────────────────────────────────────────────────────────────
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_WEBHOOK_SECRET=

# ── هوش مصنوعی (هر کدام اختیاری؛ حداقل یکی برای بخش AI) ────────────────────
# ATRIA_API_KEY=
# OPENROUTER_API_KEY=
# GROQ_API_KEY=
# GEMINI_API_KEY=
# ZAI_API_KEY=

# ── سئو/آنالیتیکس (در بیلد هم لازم می‌شود → در GitHub Variables هم بگذارید) ─
# NEXT_PUBLIC_GA_ID=
# NEXT_PUBLIC_GSC_VERIFICATION=
# NEXT_PUBLIC_BING_VERIFICATION=
EOF
  chmod 600 "$ENV_FILE"
  chown root:root "$ENV_FILE"
  echo "  ساخته شد (سقف دسترسی 600)"
fi
NEW_DB_PASS="$DB_PASS"

echo "══ ۸/۱۲  سرویس systemd + اسکریپت‌ها"
install -m 755 "$SCRIPT_DIR/release.sh"     "$APP_DIR/bin/release.sh"
install -m 755 "$SCRIPT_DIR/backup-db.sh"   "$APP_DIR/bin/backup-db.sh"
install -m 755 "$SCRIPT_DIR/cron-tasks.sh"  "$APP_DIR/bin/cron-tasks.sh"
install -m 644 "$SCRIPT_DIR/dadvarzan.service" /etc/systemd/system/dadvarzan.service
systemctl daemon-reload
systemctl enable "$APP" >/dev/null 2>&1 || true

echo "══ ۹/۱۲  Nginx"
sed "s/__DOMAIN__/${DOMAIN:-_}/" "$SCRIPT_DIR/nginx.conf.template" > /etc/nginx/sites-available/$APP
ln -sfn /etc/nginx/sites-available/$APP /etc/nginx/sites-enabled/$APP
rm -f /etc/nginx/sites-enabled/default
nginx -t

echo "══ ۱۰/۱۲  فایروال (ufw) و fail2ban"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
systemctl enable --now fail2ban >/dev/null 2>&1 || true

echo "══ ۱۱/۱۲  بکاپ و کرون روزانه (۰۳:۰۰ تهران)"
cat > /etc/cron.d/$APP <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
# بکاپ روزانهٔ دیتابیس
0 3 * * * root $APP_DIR/bin/backup-db.sh >> /var/log/$APP-backup.log 2>&1
# جایگزین Vercel Cron (law-sync)
0 3 * * * root $APP_DIR/bin/cron-tasks.sh >> /var/log/$APP-cron.log 2>&1
EOF
chmod 644 /etc/cron.d/$APP

echo "══ ۱۲/۱۲  خلاصه"
cat <<EOF

────────────────────────────────────────────────────────────────
✓ سرور آماده است.

  ۱) فایل env:            $ENV_FILE   (بازش کنید و کلیدهای اختیاری را پر کنید)
  ۲) رمز دیتابیس این‌بار:  $NEW_DB_PASS
     (در DATABASE_URL داخل همان فایل هم هست)
  ۳) next → secrets گیت‌هاب (فاز ۳ راهنما) و اولین دیپلوی
  ۴) بعد از تنظیم DNS، گواهی SSL:
       certbot --nginx -d $DOMAIN$([ -n "$DOMAIN" ] && echo " -d www.$DOMAIN") --redirect
  ۵) لاگ اپلیکیشن:  journalctl -u $APP -f
     وضعیت سرویس:   systemctl status $APP

  ⚠ اگر DOMAIN ندادید، NEXT_PUBLIC_SITE_URL را بعداً در env کامل کنید و
    nginx را با دامنهٔ نهایی دوباره اعمال کنید (sed الگوی __DOMAIN__).
────────────────────────────────────────────────────────────────
EOF
