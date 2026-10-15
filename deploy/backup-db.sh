#!/usr/bin/env bash
# بکاپ روزانهٔ دیتابیس dadvarzan — نگه‌داری ۱۴ نسخهٔ اخیر
# (با cron.d ساعت ۳ بامداد به وقت تهران فراخوانی می‌شود)
set -euo pipefail

DB="dadvarzan"
DIR="/var/backups/dadvarzan"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$DIR"
sudo -u postgres pg_dump -d "$DB" --no-owner --no-privileges | gzip > "$DIR/$DB-$STAMP.sql.gz"

# نگه‌داشتن ۱۴ روز اخیر
find "$DIR" -name "$DB-*.sql.gz" -mtime +14 -delete

echo "[$(date '+%F %T')] backup OK → $DIR/$DB-$STAMP.sql.gz"
