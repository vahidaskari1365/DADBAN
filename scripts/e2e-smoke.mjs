#!/usr/bin/env node
/**
 * ============================================================================
 * dadban — E2E Smoke Test (۵ مسیر طلایی)
 * ----------------------------------------------------------------------------
 * بدون وابستگی خارجی — فقط fetch داخلی Node (≥18، توصیه‌شده: 24).
 * اجرا:  E2E_BASE_URL=https://dadban-brown.vercel.app node scripts/e2e-smoke.mjs
 * CI:    .github/workflows/e2e-smoke.yml (روزی یک‌بار + اجرای دستی)
 *
 * مسیرهای طلایی:
 *   ۱) سلامت سرویس و دیتابیس        GET  /api/health
 *   ۲) صفحهٔ اصلی + محاسبه‌گرها      GET  / ، /calculators (JSON-LD)
 *   ۳) ورود موکل و وکیل             POST /api/auth/login → کوکی dadban_user
 *   ۴) ثبت پرونده → مزایده → پذیرش  POST /api/cases → /api/cases/offers → accept
 *   ۵) دستیار هوشمند حقوقی          POST /api/ai-assistant (پاسخ مستند ماده‌محور)
 *
 * ملاحظات rate-limit (src/lib/api-security): login 10/15دقیقه، ثبت پرونده ۵/ساعت،
 * AI ۶۰/ساعت — این اسکریپت فقط ۲ لاگین، ۱ پرونده و ۱ درخواست AI مصرف می‌کند.
 * هیچ پاسخی جعل نمی‌شود؛ هر شکست = exit 1.
 * ============================================================================
 */

const BASE = (process.env.E2E_BASE_URL || "https://dadban-brown.vercel.app").replace(/\/$/, "");
const CLIENT = {
  identifier: process.env.E2E_CLIENT_ID || "09120000002",
  password: process.env.E2E_CLIENT_PW || "Dadban1404!",
};
const LAWYER = {
  identifier: process.env.E2E_LAWYER_ID || "09120000001",
  password: process.env.E2E_LAWYER_PW || "Dadban1404!",
};

const results = [];
let failed = 0;

function record(name, ok, info) {
  results.push({ name, ok });
  if (!ok) failed++;
  console.log(`${ok ? "✅" : "❌"} ${name}${info ? ` — ${info}` : ""}`);
}

async function api(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      "User-Agent": "dadban-e2e-smoke/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90_000),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* پاسخ JSON نبود — status کافی است */
  }
  return { res, json };
}

function dadbanCookie(res) {
  const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of cookies) {
    if (c.startsWith("dadban_user=")) return c.split(";")[0];
  }
  return null;
}

/** جستجوی بازگشتی اولین شیئی که subject یکتا دارد (board عمداً caseNumber/تماس را ماسک می‌کند) */
function findBySubject(node, subject, depth = 0) {
  if (!node || depth > 8) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findBySubject(item, subject, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node === "object") {
    if (node.subject === subject && Number.isFinite(Number(node.id))) return node;
    for (const v of Object.values(node)) {
      const hit = findBySubject(v, subject, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

async function main() {
  const t0 = Date.now();
  console.log(`\n🧪 dadban E2E smoke → ${BASE}\n`);

  /* ۱) سلامت */
  try {
    const { res, json } = await api("/api/health");
    record("سلامت سرویس/DB", res.status === 200 && json?.ok === true, `HTTP ${res.status}`);
  } catch (e) {
    record("سلامت سرویس/DB", false, e.message);
  }

  /* ۲) صفحهٔ اصلی + محاسبه‌گرها */
  try {
    const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(60_000) });
    const html = await res.text();
    record("صفحهٔ اصلی", res.status === 200 && html.includes("دادبان"), `HTTP ${res.status}, ${html.length}B`);
  } catch (e) {
    record("صفحهٔ اصلی", false, e.message);
  }
  try {
    const res = await fetch(`${BASE}/calculators`, { signal: AbortSignal.timeout(60_000) });
    const html = await res.text();
    record("محاسبه‌گرها + JSON-LD", res.status === 200 && html.includes("application/ld+json"), `HTTP ${res.status}`);
  } catch (e) {
    record("محاسبه‌گرها + JSON-LD", false, e.message);
  }

  /* ۳) ورود موکل و وکیل */
  let clientCookie = null;
  let lawyerCookie = null;
  try {
    const { res, json } = await api("/api/auth/login", { method: "POST", body: CLIENT });
    clientCookie = dadbanCookie(res);
    record("ورود موکل", res.status === 200 && json?.ok === true && !!clientCookie, `HTTP ${res.status}`);
  } catch (e) {
    record("ورود موکل", false, e.message);
  }
  try {
    const { res, json } = await api("/api/auth/login", { method: "POST", body: LAWYER });
    lawyerCookie = dadbanCookie(res);
    record("ورود وکیل", res.status === 200 && json?.ok === true && !!lawyerCookie, `HTTP ${res.status}`);
  } catch (e) {
    record("ورود وکیل", false, e.message);
  }

  /* ۴) ثبت پرونده → مزایده → پذیرش */
  const SUBJECT = `[تست خودکار E2E ${new Date().toISOString().slice(0, 16)}] بررسی مسیر مزایده`;
  let caseNumber = null;
  let trackingToken = null;
  try {
    const { res, json } = await api("/api/cases", {
      method: "POST",
      body: {
        subject: SUBJECT,
        city: "تهران",
        name: "کاربر تست خودکار",
        phone: CLIENT.identifier,
        stage: "ثبت اولیه",
        description: "پروندهٔ ایجادشده توسط تست خودکار دادبان — لطفاً نادیده گرفته شود.",
      },
    });
    caseNumber = json?.caseNumber ?? null;
    trackingToken = json?.trackingToken ?? null;
    record(
      "ثبت پروندهٔ مهمان",
      res.status === 200 && json?.ok === true && !!caseNumber && !!trackingToken,
      `${caseNumber ?? `HTTP ${res.status}`}`,
    );
  } catch (e) {
    record("ثبت پروندهٔ مهمان", false, e.message);
  }

  if (caseNumber && lawyerCookie) {
    try {
      const { res, json } = await api("/api/cases/board", { cookie: lawyerCookie });
      const found = findBySubject(json, SUBJECT);
      record("بازار پرونده‌ها (وکیل)", res.status === 200 && !!found, found ? `caseId=${found.id}` : "پروندهٔ تست در board نیست");
      if (found) {
        const offerRes = await api("/api/cases/offers", {
          method: "POST",
          cookie: lawyerCookie,
          body: { caseId: Number(found.id), message: "پیشنهاد تست خودکار — مسیر E2E", price: 5_000_000 },
        });
        record("ثبت پیشنهاد قیمت (وکیل)", offerRes.res.status === 200 && offerRes.json?.ok === true, `HTTP ${offerRes.res.status}`);

        const view = await api(`/api/cases/offers?caseNumber=${encodeURIComponent(caseNumber)}&token=${encodeURIComponent(trackingToken)}`);
        const offers = Array.isArray(view.json?.offers) ? view.json.offers : [];
        const mine = offers.find((o) => Number(o.price) === 5_000_000);
        record("مشاهدهٔ پیشنهادها (موکل/مهمان)", view.res.status === 200 && offers.length > 0, `${offers.length} پیشنهاد`);

        if (mine) {
          const accept = await api("/api/cases/offers/accept", {
            method: "POST",
            body: { caseNumber, token: trackingToken, offerId: Number(mine.id) },
          });
          record("پذیرش پیشنهاد و انتخاب وکیل", accept.res.status === 200 && accept.json?.ok === true, `HTTP ${accept.res.status}`);
        } else {
          record("پذیرش پیشنهاد و انتخاب وکیل", false, "پیشنهاد تست در فهرست نیست");
        }
      }
    } catch (e) {
      record("چرخهٔ مزایده", false, e.message);
    }
  } else if (!caseNumber) {
    record("چرخهٔ مزایده", false, "بدون پروندهٔ تست قابل اجرا نیست");
  } else {
    record("چرخهٔ مزایده", false, "کوکی وکیل در دسترس نیست");
  }

  /* ۵) دستیار هوشمند */
  try {
    const { res, json } = await api("/api/ai-assistant", {
      method: "POST",
      body: { query: "مهلت واخواهی از حکم غیابی چند روز است؟" },
    });
    const answer = String(json?.answer ?? "");
    const ok = res.status === 200 && json?.ok === true && answer.trim().length > 20;
    record("دستیار حقوقی AI", ok, `HTTP ${res.status}, ${answer.length} کاراکتر`);
    if (ok && !(answer.includes("۲۰") || answer.includes("۳۰۶") || answer.includes("20"))) {
      console.log("⚠️  هشدار نرم: پاسخ AI نشانی «۲۰ روز / ماده ۳۰۶» نداشت — بررسی شود.");
    }
  } catch (e) {
    record("دستیار حقوقی AI", false, e.message);
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n📊 نتیجه: ${passed}/${results.length} موفق — ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error("❌ خطای کلی:", e);
  process.exit(1);
});
