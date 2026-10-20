# -*- coding: utf-8 -*-
"""Patch host deploy-agent.sh: insert HARD-RESTART-BLOCK after the cron-lock trap.

چرا: در هاست cPanel،restart.txt روی پروسهٔ node کهنه (فرایند دستی/یتیم) اثر
نمی‌کند؛ این بلوک در هر تیک کرون، اگر restart.txt تازه‌تر از مُهر قبلی باشد،
پروسه‌های node همین کاربر را می‌کشد تا Passenger با کد تازه spawn کند.

Usage: python3 scripts/patch-deploy-agent.py /path/to/deploy-agent.sh
"""
import io
import sys

PATH = sys.argv[1]
ANCHOR = "trap 'rmdir \"$LOCK\" 2>/dev/null' EXIT"
MARKER = "HARD-RESTART-BLOCK"

BLOCK = """

# ── HARD-RESTART-BLOCK (ops patch) ──
# اگر پروسهٔ node کهنه (فرایند دستی/یتیم) به‌جای Passenger در حال سرو باشد،
# restart.txt روی آن اثر نمی‌کند؛ اینجا هر بار restart.txt تازه‌تر از مُهر قبلی
# باشد، پروسه‌های node همین کاربر کشته می‌شوند تا Passenger با کد تازه spawn کند.
HR_STAMP="$HOME/.hard-restart-stamp"
HR_RESTART="$APP/tmp/restart.txt"
if [ -f "$HR_RESTART" ] && { [ ! -f "$HR_STAMP" ] || [ "$HR_RESTART" -nt "$HR_STAMP" ]; }; then
  pkill -u "$USER" -f 'server\\.js' 2>/dev/null || true
  pkill -u "$USER" -f 'app\\.js' 2>/dev/null || true
  date -u +%FT%TZ > "$HR_STAMP"
  echo "$(now) HARD-RESTART: stale node processes killed — Passenger respawns with fresh code"
fi
# ── END HARD-RESTART-BLOCK ──"""

src = io.open(PATH, encoding="utf-8").read()

if MARKER in src:
    print("already patched — skip")
    sys.exit(0)

n = src.count(ANCHOR)
if n != 1:
    print(f"FAIL: anchor found {n} times (expected 1)")
    sys.exit(1)

src = src.replace(ANCHOR, ANCHOR + "\n" + BLOCK, 1)
io.open(PATH, "w", encoding="utf-8").write(src)
print(f"patched OK — new size: {len(src)} chars")
