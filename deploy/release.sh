#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# release.sh — استقرار امن یک ریلیز جدید روی سرور ایران
#
#   usage: bash /opt/dadvarzan/bin/release.sh /tmp/.../release.tar.gz <git-sha>
#
# کارهایی که می‌کند:
#   ۱) بازکردن بسته در /opt/dadvarzan/releases/<زمان>-<sha>
#   ۲) جابه‌جایی اتمیک symlink «current» به ریلیز جدید
#   ۳) ری‌استارت سرویس systemd «dadvarzan»
#   ۴) health-check روی /api/health (شامل تست دیتابیس) تا ۴۵ ثانیه
#   ۵) اگر سالم نبود → rollback خودکار به ریلیز قبلی + ری‌استارت
#   ۶) نگه‌داشتن ۵ ریلیز آخر و پاک‌کردن بقیه (رول‌بک دستی همیشه ممکن است)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TARBALL="${1:?usage: release.sh <tarball> <git-sha>}"
FULL_SHA="${2:-unknown}"
SHA="${FULL_SHA:0:12}"

BASE="/opt/dadvarzan"
RELEASES="$BASE/releases"
CURRENT="$BASE/current"
SHARED="$BASE/shared"
KEEP=5
PORT=3000
SERVICE="dadvarzan"

[ -f "$TARBALL" ] || { echo "✗ tarball not found: $TARBALL"; exit 1; }
[ -f "/etc/dadvarzan/dadvarzan.env" ] || { echo "✗ /etc/dadvarzan/dadvarzan.env یافت نشد — اول setup-server.sh را اجرا کنید."; exit 1; }

TS="$(date +%Y%m%d-%H%M%S)"
NEW="$RELEASES/$TS-$SHA"

# ریلیزِ قبلی — قبل از هر تغییری ثبت می‌شود (برای rollback)
PREV="$(readlink -f "$CURRENT" 2>/dev/null || true)"

echo "→ extracting $(basename "$TARBALL") → $NEW"
mkdir -p "$NEW"
tar -xzf "$TARBALL" -C "$NEW"

# مالکیت برای کاربر سرویس (وقتی root اجرا می‌شود)
if [ "$(id -u)" = "0" ] && id -u dadvarzan >/dev/null 2>&1; then
  chown -R dadvarzan:dadvarzan "$NEW"
fi

# پوشه‌های پایدار مشترک بین ریلیزها (فعلاً کل داده‌ها در DB است؛ جای رزرو)
mkdir -p "$SHARED/uploads"
ln -sfn "$SHARED/uploads" "$NEW/uploads"

echo "→ swapping current symlink"
TMP_LNK="$BASE/.current.tmp.$$"
ln -sfn "$NEW" "$TMP_LNK"
mv -T "$TMP_LNK" "$CURRENT"

echo "→ restarting $SERVICE"
systemctl restart "$SERVICE"

echo "→ health check (up to 45s)"
OK=0
for i in $(seq 1 45); do
  sleep 1
  if curl -fsS -m 3 "http://127.0.0.1:$PORT/api/health" 2>/dev/null | grep -q '"ok":true'; then
    OK=1
    break
  fi
done

if [ "$OK" != "1" ]; then
  echo "✗ health check FAILED after release $TS-$SHA"
  if [ -n "$PREV" ] && [ -d "$PREV" ] && [ "$PREV" != "$(readlink -f "$CURRENT")" ]; then
    echo "→ rolling back to previous release: $(basename "$PREV")"
    TMP_LNK="$BASE/.current.tmp.$$"
    ln -sfn "$PREV" "$TMP_LNK"
    mv -T "$TMP_LNK" "$CURRENT"
    systemctl restart "$SERVICE"
    sleep 3
    if curl -fsS -m 3 "http://127.0.0.1:$PORT/api/health" 2>/dev/null | grep -q '"ok":true'; then
      echo "✓ rollback OK — نسخهٔ قبلی دوباره در سرویس است"
    else
      echo "✗ rollback هم سالم نیست — لاگ را ببینید: journalctl -u $SERVICE -n 100"
    fi
  else
    echo "✗ ریلیز قبلی موجود نیست — لاگ را ببینید: journalctl -u $SERVICE -n 100"
  fi
  exit 1
fi

echo "✓ release $TS ($SHA) deployed and healthy"

# نگه‌داشتن ۵ ریلیز آخر
cd "$RELEASES"
ls -1dt */ 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  echo "→ pruning old release: $old"
  rm -rf "${RELEASES:?}/${old%/}"
done

exit 0
