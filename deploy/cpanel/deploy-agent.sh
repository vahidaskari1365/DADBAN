#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# deploy-agent v2.1 — دادورزان (cPanel) + one-shot diag پایگاه‌داده
# بار اول اجرا: نتیجهٔ تست PG (psql + node-pg از داخل هاست) را در ~/diag.txt
# می‌نویسد؛ بعد رفتار عادی v2: اینباکس محلی → fallback گیت‌هاب.
# ═══════════════════════════════════════════════════════════════════════════
set -u
REPO="vahidaskari1365/DADBAN"
APP="$HOME/dadvarzan"
MARK="$APP/.deploy-version"
INBOX="$APP/.release-inbox/release.tar.gz"
now() { date -u +%FT%TZ; }

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

# ── one-shot diag2 (فقط بار اول) ──
DIAG2="$HOME/diag2.txt"
if [ ! -f "$DIAG2" ]; then
  {
    echo "=== diag2 start $(date -u +%FT%TZ) ==="
    echo "--- socket files ---"
    ls -la /tmp/.s.PGSQL.* 2>&1 | head -5
    ls -la /var/run/postgresql/ 2>&1 | head -8
    echo "--- psql socket default ---"
    PGPASSWORD='Dadvarzan@0142' psql -U dadvarza_admin -d dadvarza_dadvarzan -c 'select 1' 2>&1 | head -6
    echo "--- psql socket /tmp ---"
    PGPASSWORD='Dadvarzan@0142' psql -h /tmp -U dadvarza_admin -d dadvarza_dadvarzan -c 'select 1' 2>&1 | head -6
    echo "--- psql sslmode=require TCP ---"
    PGPASSWORD='Dadvarzan@0142' psql "host=127.0.0.1 port=5432 sslmode=require user=dadvarza_admin dbname=dadvarza_dadvarzan" -c 'select 1' 2>&1 | head -6
    echo "--- psql sslmode=verify-full localhost ---"
    PGPASSWORD='Dadvarzan@0142' psql "host=localhost port=5432 sslmode=require user=dadvarza_admin dbname=dadvarza_dadvarzan" -c 'select 1' 2>&1 | head -6
    echo "--- node path in cpanel venv ---"
    ls /home/dadvarza/nodevenv/*/bin/node 2>/dev/null | head -3
    echo "=== diag2 end ==="
  } > "$DIAG2" 2>&1
fi

# ── one-shot diag (فقط بار اول) ──
DIAG="$HOME/diag.txt"
if [ ! -f "$DIAG" ]; then
  {
    echo "=== diag start $(date -u +%FT%TZ) ==="
    echo "--- psql ---"
    command -v psql || echo "psql not found"
    psql --version 2>&1 | head -1
    echo "--- pg_isready 127.0.0.1:5432 ---"
    command -v pg_isready >/dev/null 2>&1 && pg_isready -h 127.0.0.1 -p 5432 || echo "pg_isready missing"
    echo "--- psql TCP select1 ---"
    PGPASSWORD='Dadvarzan@0142' psql -h 127.0.0.1 -p 5432 -U dadvarza_admin -d dadvarza_dadvarzan -c 'select 1' 2>&1 | head -8
    echo "--- node-pg (همان DATABASE_URL اپ) ---"
    cd "$APP" && node -e 'const{Pool}=require("pg");const p=new Pool({connectionString:"postgresql://dadvarza_admin:Dadvarzan%400142@127.0.0.1:5432/dadvarza_dadvarzan",connectionTimeoutMillis:8000});p.query("select 1 as v").then(r=>{console.log("PG OK",JSON.stringify(r.rows));process.exit(0)}).catch(e=>{console.log("PG ERR",e.code||"",e.message);process.exit(0)});' 2>&1 | head -6
    echo "--- listeners (5432) ---"
    (ss -tln 2>/dev/null || netstat -tln 2>/dev/null) | grep -E '5432' || echo "no 5432 listener visible"
    echo "=== diag end ==="
  } > "$DIAG" 2>&1
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
