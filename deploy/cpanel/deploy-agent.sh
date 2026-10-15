#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# deploy-agent v2 — دادورزان (cPanel)
# مسیر ۱ (سریع): اگر tarball در .release-inbox آپلود شده (با FTP از Actions)
#   و جدیدتر از نصب قبلی است → extract همان + restart.
# مسیر ۲ (fallback): دانلود از GitHub Releases مثل قبل.
# کرون: */5 * * * * /home/dadvarza/deploy-agent.sh >> /home/dadvarza/deploy-agent.log 2>&1
# ═══════════════════════════════════════════════════════════════════════════
set -u
REPO="vahidaskari1365/DADBAN"
APP="$HOME/dadvarzan"
MARK="$APP/.deploy-version"
INBOX="$APP/.release-inbox/release.tar.gz"
now() { date -u +%FT%TZ; }

[ -d "$APP" ] || { echo "$(now) FATAL: پوشهٔ اپ $APP پیدا نشد"; exit 1; }

# ── قفل ضد تداخل کرون ──
LOCK="$APP/tmp/.deploy-lock"
mkdir -p "$APP/tmp"
if ! mkdir "$LOCK" 2>/dev/null; then
  # اگر قفل بیش از ۱۰ دقیقه‌ای سر جایش ماند (کرش قبلی)، بشکن
  if [ -d "$LOCK" ] && [ -n "$(find "$LOCK" -maxdepth 0 -mmin +10 2>/dev/null)" ]; then
    rmdir "$LOCK" 2>/dev/null || true
    mkdir "$LOCK" 2>/dev/null || exit 0
  else
    exit 0
  fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

install_tarball() {
  local src="$1" tag="$2"
  tar -xzf "$src" -C "$APP" || { echo "$(now) ERROR: extract ناموفق"; return 1; }
  mkdir -p "$APP/tmp"
  date -u +%FT%TZ > "$APP/tmp/restart.txt"   # تریگر ری‌استارت Passenger
  echo "$tag" > "$MARK"
  echo "$(now) ✓ ریلیز $tag نصب شد — Passenger در چند ثانیه ری‌استارت می‌کند"
  return 0
}

# ── مسیر ۱: اینباکس محلی (tarball آپلودشده با FTP — بدون دانلود از github) ──
if [ -f "$INBOX" ] && [ -s "$INBOX" ]; then
  if [ ! -f "$MARK" ] || [ "$INBOX" -nt "$MARK" ]; then
    echo "$(now) → نصب ریلیز از اینباکس محلی (latest-cpanel)"
    if install_tarball "$INBOX" "latest-cpanel"; then
      rm -f "$INBOX" 2>/dev/null || true
      exit 0
    fi
    rm -f "$INBOX" 2>/dev/null || true   # tarball خراب — پاک کن تا fallback اجرا شود
  else
    exit 0   # اینباکس همان نسخهٔ نصب‌شده است
  fi
fi

# ── مسیر ۲: fallback دانلود از گیت‌هاب ──
TAG=$(curl -sI --max-time 20 "https://github.com/$REPO/releases/latest" | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}' | sed 's#.*/tag/##')
if [ -z "$TAG" ]; then
  echo "$(now) WARN: تگ آخرین ریلیز خوانده نشد"
  exit 0
fi

if [ -f "$MARK" ] && [ "$(cat "$MARK" 2>/dev/null)" = "$TAG" ]; then
  exit 0  # هیچ چیز جدید نیست
fi

echo "$(now) → نصب ریلیز $TAG (دانلود از گیت‌هاب)"
curl -sL --retry 3 --max-time 580 -o /tmp/dv-release.tar.gz \
  "https://github.com/$REPO/releases/download/$TAG/release.tar.gz" || { echo "$(now) ERROR: دانلود ناموفق"; exit 1; }
[ -s /tmp/dv-release.tar.gz ] || { echo "$(now) ERROR: فایل خالی"; exit 1; }

install_tarball /tmp/dv-release.tar.gz "$TAG" || exit 1
rm -f /tmp/dv-release.tar.gz
