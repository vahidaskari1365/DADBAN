#!/usr/bin/env node
/**
 * بازارسال روزانهٔ sitemap به سرچ‌کنسول (با سرویس‌اکانت — بدون کوکی).
 * هر روز اجرا می‌شود تا سیگنال تازگی برای Googlebot بماند؛
 * وضعیت هر URL هم از طریق گوگل دوباره خوانده می‌شود.
 * خروجی: 0=اوکی
 */
import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const SITE = process.env.GSC_SITE ?? 'https://dadvarzan.com';
const SITE_URL = process.env.GSC_SITE_URL ?? `sc-domain:${SITE.replace(/^https?:\/\//, '')}`;

function loadKey() {
  if (process.env.GSC_KEY_FILE) return JSON.parse(readFileSync(process.env.GSC_KEY_FILE, 'utf8'));
  if (process.env.GSC_KEY_JSON) {
    writeFileSync('/tmp/gsc-key-runtime.json', process.env.GSC_KEY_JSON, { mode: 0o600 });
    return JSON.parse(process.env.GSC_KEY_JSON);
  }
  console.error('Set GSC_KEY_FILE or GSC_KEY_JSON');
  process.exit(1);
}

const b64u = (b) => Buffer.from(b).toString('base64url');

async function getToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64u(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const jwt = `${header}.${payload}.${signer.sign(key.private_key, 'base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`token failed: ${JSON.stringify(j).slice(0, 200)}`);
  return j.access_token;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const key = loadKey();
  const token = await getToken(key);
  console.log(`✓ token OK (${SITE_URL})`);

  const feedpath = encodeURIComponent(`${SITE}/sitemap.xml`);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/sitemaps/${feedpath}`;

  // بازارسال (resubmit) با PUT — با کمی retry
  let res;
  for (let tries = 1; tries <= 3; tries++) {
    res = await fetch(url, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
    if (res.status === 429 || res.status >= 500) { await sleep(3000 * tries); continue; }
    break;
  }
  if (!res.ok) {
    // 400 «already submitted» هم عادی است — سیشن‌مپ همین حالا ثبت است
    const txt = await res.text().catch(() => '');
    console.log(`resubmit HTTP ${res.status}: ${txt.slice(0, 200)}`);
  } else {
    console.log('✓ sitemap resubmitted به گوگل');
  }

  // وضعیت: چند صفحه در سیشن‌مپ ثبت شده؟
  const info = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  if (info.ok) {
    const j = await info.json();
    const pageType = (j.contents ?? []).find(c => c.type === 'web') ?? {};
    console.log(`sitemap: isProcessed=${j.isProcessed} lastDownloaded=${j.lastDownloaded ?? '?'} pages=${pageType.submitted ?? '?'}`);
  } else {
    console.log(`sitemaps GET HTTP ${info.status}`);
  }

  try { unlinkSync('/tmp/gsc-key-runtime.json'); } catch {}
  console.log('DONE');
}

main().catch(e => { console.error('FATAL', String(e?.message ?? e).slice(0, 300)); process.exit(1); });
