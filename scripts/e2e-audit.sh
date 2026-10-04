#!/bin/bash
# E2E audit — request flows from CLIENT side and LAWYER side (local throwaway DB only).
#
# How to run:
#   1. Start a throwaway Postgres (e.g. `bun add -d embedded-postgres` then initdb/pg_ctl,
#      or any local PG) and create an empty database.
#   2. Push the schema:  DATABASE_URL=postgres://… bunx drizzle-kit push --force
#   3. Seed services:    DATABASE_URL=postgres://… bun scripts/e2e-seed-services.ts
#   4. Start dev server with the same DATABASE_URL + any 32+ char AUTH_SECRET.
#   5. bash scripts/e2e-audit.sh
#
# The audit registers a demo client (09123450001) and uses the seeded demo
# lawyer account (09000000002 / demo1234, linked to sohrab-mohammadi).
set -u
BASE="http://127.0.0.1:3000"
CJ=/tmp/e2e-client.jar; LJ=/tmp/e2e-lawyer.jar
rm -f $CJ $LJ
PASS=0; FAIL=0
ok(){ echo "✅ $1"; PASS=$((PASS+1)); }
bad(){ echo "❌ $1"; FAIL=$((FAIL+1)); }

echo "───────── [A] CLIENT: register + login ─────────"
bun scripts/e2e-clean.ts >/dev/null 2>&1
R=$(curl -s -c $CJ -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"موکل آزمایشی","phone":"09123450001","email":"client-e2e@test.local","password":"e2etest1234"}')
echo "register: $R"
echo "$R" | grep -q '"ok":true' && ok "register client" || bad "register client"
R=$(curl -s -c $CJ -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"09123450001","password":"e2etest1234"}')
echo "login: $R"
echo "$R" | grep -q '"role":"client"' && ok "login client (role=client)" || bad "login client"

echo "───────── [B] CLIENT: create CASE (پرونده) ─────────"
R=$(curl -s -b $CJ -X POST $BASE/api/cases -H 'Content-Type: application/json' \
  -d '{"subject":"اختلاف ملکی و سرقفلی","description":"اجاره‌نامه رسمی، مالک از تخلیه امتناع می‌کند","city":"تهیه","name":"موکل آزمایشی","phone":"09123450001","stage":"ثبت اولیه"}')
# fix city if typo'd above — recreate with correct city
R=$(curl -s -b $CJ -X POST $BASE/api/cases -H 'Content-Type: application/json' \
  -d '{"subject":"اختلاف ملکی و سرقفلی","description":"اجاره‌نامه رسمی، مالک از تخلیه امتناع می‌کند","city":"تهران","name":"موکل آزمایشی","phone":"09123450001","stage":"ثبت اولیه"}')
echo "case: $R"
CN=$(echo "$R" | grep -oE '"caseNumber":"[^"]+"' | cut -d'"' -f4)
TT=$(echo "$R" | grep -oE '"trackingToken":"[^"]+"' | cut -d'"' -f4)
[ -n "$CN" ] && ok "case created: $CN" || bad "case creation"

echo "───────── [C] CLIENT: submit SERVICE REQUEST (درخواست خدمت) ─────────"
R=$(curl -s -b $CJ -X POST $BASE/api/service-requests -H 'Content-Type: application/json' \
  -d '{"serviceSlug":"case-followup","answers":{"title":"پیگیری پرونده ملکی شعبه ۱۲","description":"لطفاً وضعیت پرونده SHF-1234 در دادگاه خانواده تهران پیگیری شود","caseNumber":"SHF-1234","court":"دادگاه خانواده ۲ تهران"},"urgency":"HIGH","city":"تهران","contactPreference":"PHONE"}')
echo "service-request: $R"
RN=$(echo "$R" | grep -oE '"requestNumber":"[^"]+"' | cut -d'"' -f4)
[ -n "$RN" ] && ok "service request created: $RN" || bad "service request creation"

echo "───────── [D] CLIENT: book CONSULTATION (مشاوره با وکیل) ─────────"
# با پروفایل وکیلِ متصل به حساب وکیل آزمایشی (sohrab-mohammadi) — فقط این یکی باید در حساب وکیل دیده شود
R=$(curl -s -b $CJ -X POST $BASE/api/consultations -H 'Content-Type: application/json' \
  -d '{"lawyer":"sohrab-mohammadi","type":"chat","duration":15,"name":"موکل آزمایشی","phone":"09123450001","subject":"قرارداد اجاره و تسویه سپرده"}')
echo "consultation: $R"
echo "$R" | grep -q '"ok":true' && ok "consultation booked with linked lawyer (sohrab-mohammadi)" || bad "consultation booking (linked)"
LSLUG=$(curl -s $BASE/api/lawyers | grep -oE '"slug":"[^"]+"' | head -1 | cut -d'"' -f4)
echo "lawyer slug: $LSLUG"
R=$(curl -s -b $CJ -X POST $BASE/api/consultations -H 'Content-Type: application/json' \
  -d "{\"lawyer\":\"$LSLUG\",\"type\":\"chat\",\"duration\":15,\"name\":\"موکل آزمایشی\",\"phone\":\"09123450001\",\"subject\":\"چک برگشتی ۵۰ میلیون تومانی\",\"caseType\":\"چک برگشتی\"}")
echo "$R" | grep -q '"ok":true' && ok "consultation booked with another lawyer ($LSLUG)" || bad "consultation booking"

echo "───────── [E] CLIENT views ─────────"
H=$(curl -s -b $CJ "$BASE/dashboard/cases")
echo "$H" | grep -q "اختلاف ملکی و سرقفلی" && ok "client sees case subject in /dashboard/cases" || bad "case subject missing in /dashboard/cases"
echo "$H" | grep -q "$CN" && ok "client sees caseNumber in /dashboard/cases" || bad "caseNumber missing in /dashboard/cases"
H=$(curl -s -b $CJ "$BASE/dashboard/cases/$CN")
echo "$H" | grep -q "مراحل پرونده" && echo "$H" | grep -q "ثبت اولیه" && ok "client opens case detail with stage timeline" || bad "case detail/timeline broken"
R=$(curl -s -b $CJ "$BASE/api/service-requests")
echo "$R" | grep -q "پیگیری پرونده ملکی شعبه ۱۲" && ok "client sees own service request (API)" || bad "own service request missing (API)"
H=$(curl -s -b $CJ "$BASE/dashboard/services")
echo "$H" | grep -q "پیگیری پرونده ملکی شعبه ۱۲" && ok "client sees service request in /dashboard/services" || bad "service request missing in /dashboard/services"
SID=$(echo "$R" | grep -oE '"id":[0-9]+' | head -1 | cut -d: -f2)
H=$(curl -s -b $CJ "$BASE/dashboard/services/$SID")
echo "$H" | grep -q "پیگیری پرونده ملکی شعبه ۱۲" && ok "client opens request detail page" || bad "request detail page"

echo "───────── [F] PUBLIC tracking ─────────"
R=$(curl -s "$BASE/api/cases/track?code=$TT")
echo "$R" | grep -q '"found":true' && ok "public track API works with token" || bad "public track API"

echo "───────── [G] LAWYER: login + what does he SEE? ─────────"
R=$(curl -s -c $LJ -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"09000000002","password":"demo1234"}')
echo "lawyer login: $R"
echo "$R" | grep -q '"role":"lawyer"' && ok "lawyer login (role=lawyer)" || bad "lawyer login"

H=$(curl -s -b $LJ "$BASE/dashboard/lawyer")
echo "$H" | grep -q "قرارداد اجاره و تسویه سپرده" && ok "LAWYER sees consultation SUBJECT addressed to his profile" || bad "consultation subject NOT visible to lawyer"
echo "$H" | grep -q "اختلاف ملکی و سرقفلی" && ok "LAWYER sees case subject in his dashboard" || bad "case subject NOT visible to lawyer"
echo "$H" | grep -q "پیگیری پرونده ملکی شعبه ۱۲" && ok "LAWYER sees service-request title in his dashboard" || bad "service-request title NOT visible to lawyer"

R=$(curl -s -b $LJ "$BASE/api/service-requests")
echo "lawyer service-requests API: $(echo $R | head -c 300)"
echo "$R" | grep -q "پیگیری پرونده ملکی شعبه ۱۲" && ok "LAWYER service-requests API returns the request" || bad "lawyer service-requests API empty/403"

echo "───────── [H] DB truth ─────────"
cd /home/z/my-project
bun -e 'import {Client} from "pg"; const c=new Client({connectionString:"postgres://postgres@127.0.0.1:54329/dadban_e2e"}); await c.connect();
const sr=await c.query("SELECT request_number, title, status FROM service_requests ORDER BY id DESC LIMIT 3");
console.log("service_requests:", JSON.stringify(sr.rows));
const ev=await c.query("SELECT type, title FROM service_request_events ORDER BY id DESC LIMIT 3");
console.log("events:", JSON.stringify(ev.rows));
const co=await c.query("SELECT subject, lawyer_id, status FROM consultations ORDER BY id DESC LIMIT 2");
console.log("consultations:", JSON.stringify(co.rows));
await c.end();' 2>/dev/null | tail -3

echo "───────── RESULT: PASS=$PASS FAIL=$FAIL ─────────"
