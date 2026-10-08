#!/bin/bash
# گرم‌کردن کامل کش ترجمهٔ DADBAN — ۴ زبان موازی
KEY="dadban-i18n-warm-7f3a2b9c14d5"
BASE="https://dadban-brown.vercel.app/api/i18n/warm"
LOG=/home/z/my-project/warmlogs
mkdir -p "$LOG"

warm_locale() {
  L=$1
  echo "[$L] start $(date +%T)" >> "$LOG/main.log"

  # وکلا — تا done
  O=0
  while :; do
    R=$(curl -s --max-time 70 "$BASE?key=$KEY&what=lawyers&locale=$L&offset=$O")
    echo "[$L lawyers o=$O] $R" >> "$LOG/main.log"
    echo "$R" | rg -q '"done":true' && break
    echo "$R" | rg -q '"ok":false' && { echo "[$L lawyers] ERROR at o=$O" >> "$LOG/main.log"; break; }
    O=$((O+1))
    [ $O -gt 40 ] && break
  done

  # مقالات — meta و faq و content
  O=0
  while :; do
    R=$(curl -s --max-time 70 "$BASE?key=$KEY&what=articles&fields=meta&locale=$L&offset=$O")
    echo "[$L meta o=$O] $R" >> "$LOG/main.log"
    echo "$R" | rg -q '"processed":0' && break
    echo "$R" | rg -q '"ok":false' && { echo "[$L meta] ERROR at o=$O" >> "$LOG/main.log"; break; }
    O=$((O+1))
    [ $O -gt 40 ] && break
  done

  O=0
  while :; do
    R=$(curl -s --max-time 70 "$BASE?key=$KEY&what=articles&fields=faq&locale=$L&offset=$O")
    echo "[$L faq o=$O] $(echo "$R" | head -c 120)" >> "$LOG/main.log"
    echo "$R" | rg -q '"processed":0' && break
    echo "$R" | rg -q '"ok":false' && break
    O=$((O+1))
    [ $O -gt 40 ] && break
  done

  # content — برای هر مقاله، part ها
  O=0
  while :; do
    # part=0 برای گرفتن تعداد parts
    R=$(curl -s --max-time 70 "$BASE?key=$KEY&what=articles&fields=content&part=0&locale=$L&offset=$O")
    echo "[$L content o=$O p=0] $(echo "$R" | head -c 140)" >> "$LOG/main.log"
    echo "$R" | rg -q '"processed":0.*"done":true' && break
    echo "$R" | rg -q '"ok":false' && break
    PARTS=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin).get('parts',0))" 2>/dev/null || echo 0)
    P=1
    while [ "$P" -lt "$PARTS" ]; do
      RP=$(curl -s --max-time 70 "$BASE?key=$KEY&what=articles&fields=content&part=$P&locale=$L&offset=$O")
      echo "[$L content o=$O p=$P] $(echo "$RP" | head -c 100)" >> "$LOG/main.log"
      P=$((P+1))
    done
    O=$((O+1))
    [ $O -gt 40 ] && break
  done

  echo "[$L] DONE $(date +%T)" >> "$LOG/main.log"
}

for L in en ar tr zh; do
  warm_locale "$L" &
done
wait
echo "ALL DONE $(date +%T)" >> "$LOG/main.log"
