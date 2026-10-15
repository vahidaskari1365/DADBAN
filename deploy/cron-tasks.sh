#!/usr/bin/env bash
# جایگزینِ Vercel Cron روی سرور ایران
# vercel.json سرور ایران را نمی‌شناسد؛ این اسکریپت همان کار را با curl انجام می‌دهد.
# برنامه‌ها (به وقت تهران):
#   ۰۳:۰۰ روزانه  →  /api/ai/law-sync  (معادل 00:30 UTC در vercel.json)
set -uo pipefail

BASE_URL="http://127.0.0.1:3000"

# توکن داخلی از فایل env سرویس خوانده می‌شود (اولویت مثل خودِ مسیر: LAW_SYNC_TOKEN سپس CRON_SECRET)
ENV_FILE="/etc/dadvarzan/dadvarzan.env"
read_env_key() {
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d '"'
}
CRON_TOKEN="$(read_env_key LAW_SYNC_TOKEN)"
[ -n "$CRON_TOKEN" ] || CRON_TOKEN="$(read_env_key CRON_SECRET)"
[ -n "$CRON_TOKEN" ] || { echo "[cron] نه LAW_SYNC_TOKEN و نه CRON_SECRET تنظیم نشده — رد شد"; exit 0; }

log() { echo "[$(date '+%F %T')] $*"; }

log "law-sync شروع"
HTTP=$(curl -s -o /tmp/law-sync.out -w '%{http_code}' -m 300 \
  -X POST "$BASE_URL/api/ai/law-sync" \
  -H "Authorization: Bearer $CRON_TOKEN" || echo "000")
log "law-sync پاسخ: $HTTP"
[ "$HTTP" = "200" ] || cat /tmp/law-sync.out
exit 0
