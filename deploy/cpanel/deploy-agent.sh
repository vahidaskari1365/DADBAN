#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# deploy-agent v2.2 — دادورزان (cPanel)
#   ۱) PostgreSQL خودمانی: بدون root، در ~/pgdata روی 127.0.0.1:5433
#      (initdb یک‌بار + watchdog در هر تیک کرون — سرور سیستمی pg_hba را دور می‌زنیم)
#   ۲) اگر .env تغییر کند → restart.txt (Passenger دوباره env را می‌خواند)
#   ۳) اینباکس محلی → extract + restart (مسیر اصلی)
#   ۴) fallback دانلود گیت‌هاب (مسیر دوم)
# لاگ‌ها: ~/deploy-agent.log و ~/pg-bootstrap.log (هر دو با FTP خواندنی)
# ═══════════════════════════════════════════════════════════════════════════
set -u
REPO="vahidaskari1365/DADBAN"
APP="$HOME/dadvarzan"
MARK="$APP/.deploy-version"
INBOX="$APP/.release-inbox/release.tar.gz"
now() { date -u +%FT%TZ; }

# ═══════════ PostgreSQL خودمانی (بدون دسترسی root) ═══════════
PGDATA="$HOME/pgdata"
PGLOG="$HOME/pg-bootstrap.log"
pglog() { echo "$(now) $*" >> "$PGLOG"; }
# نگه‌داشتن اندازهٔ لاگ
if [ -f "$PGLOG" ] && [ "$(wc -l < "$PGLOG" 2>/dev/null || echo 0)" -gt 400 ]; then
  tail -n 200 "$PGLOG" > "$PGLOG.tmp" 2>/dev/null && mv "$PGLOG.tmp" "$PGLOG"
fi

ensure_own_pg() {
  # مسیر باینری‌های سرور PG — یک‌بار پیدا و کش می‌شود
  local PGBIN=""
  if [ -f "$HOME/.pgbin" ]; then
    local cached; cached=$(cat "$HOME/.pgbin" 2>/dev/null || echo "")
    [ -n "$cached" ] && [ -x "$cached/initdb" ] && PGBIN="$cached"
  fi
  if [ -z "$PGBIN" ]; then
    local p
    for p in /usr/pgsql-16/bin /usr/pgsql-17/bin /usr/pgsql-15/bin \
             /usr/lib/postgresql/16/bin /usr/lib/postgresql/15/bin \
             /usr/local/pgsql/bin /usr/bin; do
      if [ -x "$p/initdb" ]; then PGBIN="$p"; break; fi
    done
    if [ -z "$PGBIN" ]; then
      local found
      found=$(find /usr /opt -maxdepth 5 -name initdb -type f 2>/dev/null | head -1)
      [ -n "$found" ] && PGBIN=$(dirname "$found")
    fi
    if [ -n "$PGBIN" ] && [ -x "$PGBIN/initdb" ]; then
      echo "$PGBIN" > "$HOME/.pgbin"
    else
      # فقط یک‌بار در هر ۱۰ تیک هشدار بده تا لاگ شلوغ نشود
      if [ ! -f "$PGDATA/.nobin" ] || [ -n "$(find "$PGDATA/.nobin" -mmin +50 2>/dev/null)" ]; then
        pglog "ERROR: initdb در هاست پیدا نشد — PostgreSQL خودمانی ممکن نیست (جزئیات: مسیرهای استاندارد و find خالی)"
        mkdir -p "$PGDATA"; touch "$PGDATA/.nobin"
      fi
      return 1
    fi
  fi

  # ── initdb — فقط یک‌بار (خوش‌حساب: اگر از قبل نیمه‌کاره مانده، پاک و از نو) ──
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    rm -rf "$PGDATA"
    mkdir -p "$PGDATA"
    chmod 700 "$PGDATA"
    printf 'Dadvarzan@0142\n' > "$HOME/.pgpw.tmp"
    chmod 600 "$HOME/.pgpw.tmp"
    pglog "→ initdb با $PGBIN/initdb (superuser=dadvarza_admin, scram)…"
    if "$PGBIN/initdb" -D "$PGDATA" -U dadvarza_admin -A scram-sha-256 \
         --pwfile="$HOME/.pgpw.tmp" --encoding=UTF8 --no-locale >> "$PGLOG" 2>&1; then
      pglog "✓ initdb انجام شد"
    else
      pglog "ERROR: initdb ناموفق — متن کامل خطا در همین لاگ بالای این خط"
      rm -f "$HOME/.pgpw.tmp"
      return 1
    fi
    rm -f "$HOME/.pgpw.tmp"
    # پیکربندی سبک و امن: فقط لوکال‌هاست + پورت آزاد 5433
    {
      echo ""
      echo "# ── دادورزان — PostgreSQL خودمانی (v2.2) ──"
      echo "listen_addresses = '127.0.0.1'"
      echo "port = 5433"
      echo "unix_socket_directories = '$PGDATA'"
      echo "max_connections = 20"
      echo "shared_buffers = 64MB"
      echo "work_mem = 4MB"
      echo "effective_cache_size = 256MB"
    } >> "$PGDATA/postgresql.conf"
    pglog "✓ پیکربندی نوشته شد (127.0.0.1:5433)"
  fi

  # ── watchdog: اگر اجرا نیست، اجرا کن (بعد از ریبوت سرور هم همین‌طور زنده می‌ماند) ──
  if ! "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    pglog "→ start PostgreSQL (127.0.0.1:5433)…"
    if "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/server.log" -w -t 60 start >> "$PGLOG" 2>&1; then
      pglog "✓ PostgreSQL اجرا شد"
    else
      pglog "ERROR: start ناموفق — server.log:"
      tail -n 15 "$PGDATA/server.log" >> "$PGLOG" 2>/dev/null
      return 1
    fi
  fi

  # ── ساخت دیتابیس اپلیکیشن — فقط تا وقتی مارکر نباشد ──
  if [ ! -f "$PGDATA/.db-created" ]; then
    if [ -x "$PGBIN/psql" ]; then
      export PGPASSWORD='Dadvarzan@0142'
      if "$PGBIN/psql" -h 127.0.0.1 -p 5433 -U dadvarza_admin -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
        local hasdb
        hasdb=$("$PGBIN/psql" -h 127.0.0.1 -p 5433 -U dadvarza_admin -d postgres \
                 -tAc "SELECT 1 FROM pg_database WHERE datname='dadvarza_dadvarzan'" 2>/dev/null | tr -d ' \n')
        if [ "$hasdb" = "1" ]; then
          touch "$PGDATA/.db-created"
        else
          if "$PGBIN/psql" -h 127.0.0.1 -p 5433 -U dadvarza_admin -d postgres \
               -c "CREATE DATABASE dadvarza_dadvarzan OWNER dadvarza_admin" >> "$PGLOG" 2>&1; then
            touch "$PGDATA/.db-created"
            pglog "✓ دیتابیس dadvarza_dadvarzan ساخته شد"
          else
            pglog "ERROR: ساخت دیتابیس ناموفق"
            return 1
          fi
        fi
      else
        pglog "WARN: PG اجراست ولی اتصال psql برقرار نشد (احتمالاً در حال راه‌اندازی)"
        return 1
      fi
    fi
  fi
  return 0
}

ensure_own_pg || true

# ═══════════ ری‌استارت Passenger در صورت تغییر .env ═══════════
ENVF="$APP/.env"; ENVMD5="$APP/tmp/.env.md5"
if [ -f "$ENVF" ]; then
  mkdir -p "$APP/tmp"
  local_cur=$(md5sum "$ENVF" 2>/dev/null | awk '{print $1}')
  local_old=$(cat "$ENVMD5" 2>/dev/null || echo "")
  if [ -n "$local_cur" ] && [ "$local_cur" != "$local_old" ]; then
    echo "$local_cur" > "$ENVMD5"
    date -u +%FT%TZ > "$APP/tmp/restart.txt"
    echo "$(now) → .env تغییر کرد → restart.txt تازه شد"
  fi
fi

# ── one-shot diag3 (فقط بار اول) ──
DIAG3="$HOME/diag3.txt"
if [ ! -f "$DIAG3" ]; then
  {
    echo "=== diag3 start $(date -u +%FT%TZ) ==="
    echo "--- try read pg_hba ---"
    cat /var/lib/pgsql/data/pg_hba.conf 2>&1 | head -30
    cat /etc/postgresql/16/main/pg_hba.conf 2>&1 | head -10
    find /var /etc -xdev -maxdepth 4 -name "pg_hba.conf" 2>/dev/null | head -3
    echo "--- psql -U postgres socket ---"
    psql -U postgres -d postgres -c 'select current_user' 2>&1 | head -4
    echo "--- psql -U dadvarza_admin db=postgres ---"
    PGPASSWORD='Dadvarzan@0142' psql -U dadvarza_admin -d postgres -c 'select current_user' 2>&1 | head -4
    echo "--- psql -U dadvarza_admin db=template1 ---"
    PGPASSWORD='Dadvarzan@0142' psql -U dadvarza_admin -d template1 -c 'select 1' 2>&1 | head -4
    echo "--- psql -U dadvarza_admin db=dadvarza_dadvarzan host=/var/run/postgresql ---"
    PGPASSWORD='Dadvarzan@0142' psql "host=/var/run/postgresql user=dadvarza_admin dbname=dadvarza_dadvarzan" -c 'select 1' 2>&1 | head -4
    echo "=== diag3 end ==="
  } > "$DIAG3" 2>&1
fi

# ── قفل ضد تداخل کرون ──
LOCK="$APP/tmp/.deploy-lock"
mkdir -p "$APP/tmp"
if ! mkdir "$LOCK" 2>/dev/null; then
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
  date -u +%FT%TZ > "$APP/tmp/restart.txt"
  echo "$tag" > "$MARK"
  echo "$(now) ✓ ریلیز $tag نصب شد — Passenger در چند ثانیه ری‌استارت می‌کند"
  return 0
}

# ── مسیر ۱: اینباکس محلی ──
if [ -f "$INBOX" ] && [ -s "$INBOX" ]; then
  if [ ! -f "$MARK" ] || [ "$INBOX" -nt "$MARK" ]; then
    echo "$(now) → نصب ریلیز از اینباکس محلی (latest-cpanel)"
    if install_tarball "$INBOX" "latest-cpanel"; then
      rm -f "$INBOX" 2>/dev/null || true
      exit 0
    fi
    rm -f "$INBOX" 2>/dev/null || true
  else
    exit 0
  fi
fi

# ── مسیر ۲: fallback گیت‌هاب ──
TAG=$(curl -sI --max-time 20 "https://github.com/$REPO/releases/latest" | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}' | sed 's#.*/tag/##')
if [ -z "$TAG" ]; then
  echo "$(now) WARN: تگ آخرین ریلیز خوانده نشد"
  exit 0
fi

if [ -f "$MARK" ] && [ "$(cat "$MARK" 2>/dev/null)" = "$TAG" ]; then
  exit 0
fi

echo "$(now) → نصب ریلیز $TAG (دانلود از گیت‌هاب)"
curl -sL --retry 3 --max-time 580 -o /tmp/dv-release.tar.gz \
  "https://github.com/$REPO/releases/download/$TAG/release.tar.gz" || { echo "$(now) ERROR: دانلود ناموفق"; exit 1; }
[ -s /tmp/dv-release.tar.gz ] || { echo "$(now) ERROR: فایل خالی"; exit 1; }

install_tarball /tmp/dv-release.tar.gz "$TAG" || exit 1
rm -f /tmp/dv-release.tar.gz
