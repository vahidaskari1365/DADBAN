#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# deploy-agent — دادورزان (cPanel)
# هر بار اجرا: آخرین ریلیز گیت‌هاب را چک می‌کند؛ اگر جدیدتر بود، دانلود و
# نصب می‌کند و Passenger را ری‌استارت می‌کند (tmp/restart.txt).
# نصب: curl -sL https://raw.githubusercontent.com/vahidaskari1365/DADBAN/main/deploy/cpanel/deploy-agent.sh -o ~/deploy-agent.sh && chmod +x ~/deploy-agent.sh
# کرون: */5 * * * * /home/dadvarza/deploy-agent.sh >> /home/dadvarza/deploy-agent.log 2>&1
# ═══════════════════════════════════════════════════════════════════════════
set -u
REPO="vahidaskari1365/DADBAN"
APP="$HOME/dadvarzan"
MARK="$APP/.deploy-version"
now() { date -u +%FT%TZ; }

if [ ! -d "$APP" ]; then
  echo "$(now) FATAL: پوشهٔ اپ $APP پیدا نشد"
  exit 1
fi

# آخرین تگ از هدر ریدایرکت (بدون محدودیت API گیت‌هاب)
TAG=$(curl -sI --max-time 20 "https://github.com/$REPO/releases/latest" | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}' | sed 's#.*/tag/##')
if [ -z "$TAG" ]; then
  echo "$(now) WARN: تگ آخرین ریلیز خوانده نشد"
  exit 0
fi

if [ -f "$MARK" ] && [ "$(cat "$MARK" 2>/dev/null)" = "$TAG" ]; then
  exit 0  # هیچ چیز جدید نیست
fi

echo "$(now) → نصب ریلیز $TAG"
curl -sL --retry 3 --max-time 300 -o /tmp/dv-release.tar.gz \
  "https://github.com/$REPO/releases/download/$TAG/release.tar.gz" || { echo "$(now) ERROR: دانلود ناموفق"; exit 1; }
[ -s /tmp/dv-release.tar.gz ] || { echo "$(now) ERROR: فایل خالی"; exit 1; }

tar -xzf /tmp/dv-release.tar.gz -C "$APP" || { echo "$(now) ERROR: extract ناموفق"; exit 1; }
mkdir -p "$APP/tmp"
date -u +%FT%TZ > "$APP/tmp/restart.txt"   # تریگر ری‌استارت Passenger
echo "$TAG" > "$MARK"
rm -f /tmp/dv-release.tar.gz
echo "$(now) ✓ ریلیز $TAG نصب شد — Passenger در چند ثانیه ری‌استارت می‌کند"
