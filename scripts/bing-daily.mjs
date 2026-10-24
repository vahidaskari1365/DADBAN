#!/usr/bin/env node
/**
 * Bing daily ops — v2 (بعد از تأیید وریفیکیشن با Import از GSC در 2026-10-24)
 *  ۱) GetUserSites → یافتن siteUrl «دقیقاً» به همان فرمتی که بینگ ذخیره کرده
 *     (بینگ «https://dadvarzan.com/» با اسلش انتهایی نگه می‌دارد — هر فرمت دیگری
 *     در SubmitFeed خطای NotAuthorized/ErrorCode 14 می‌دهد!)
 *  ۲) SubmitFeed — سابمیت/رفرش sitemap.xml
 *  ۳) SubmitUrlBatch — سابمیت گروهی (سهمیه رسمی: ۱۰۰ URL در روز) از صف اولویت‌دار
 *  ۴) GetCrawlStats snapshot — روند CrawledPages/InIndex برای GitHub Step Summary
 *  خروجی هیچ داده حساسی ندارد (کلید هرگز چاپ نمی‌شود).
 * Usage: BING_API_KEY=... node scripts/bing-daily.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

const KEY = process.env.BING_API_KEY;
if (!KEY) { console.error('BING_API_KEY required'); process.exit(1); }
const API = 'https://ssl.bing.com/webmaster/api.svc/json';
const HOST = 'dadvarzan.com';

async function api(endpoint, params = {}, method = 'GET') {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set('apikey', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { method, signal: AbortSignal.timeout(30_000) });
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 150) }; }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: { error: String(e).slice(0, 150) } };
  }
}

console.log('## Bing daily — ' + new Date().toISOString().slice(0, 16) + 'Z');

// ── ۱) siteUrl دقیق از خود بینگ ──
const us = await api('GetUserSites');
const sites = Array.isArray(us.body?.d) ? us.body.d : [];
const main = sites.find(s => s.Url?.replace(/\/$/, '') === `https://${HOST}`);
if (!main) {
  console.log(`- ⚠️ ${HOST} در GetUserSites یافت نشد — HTTP ${us.status} ${JSON.stringify(us.body).slice(0, 150)}`);
  process.exit(0);
}
const SITE_URL = main.Url.replace(/\/$/, ''); // API siteUrl param بدون اسلش، اما از مقدار خود بینگ
console.log(`- site: ${main.Url} | verified: ${main.IsVerified}`);

// ── ۲) SubmitFeed — رفرش روزانه sitemap ──
// ⚠️ نکته حیاتی (کشف‌شده 2026-10-24): SubmitFeed پارامترها را باید در body JSON
// بپذیرد؛ پاس دادن آن‌ها در query string خطای ErrorCode 14/2 می‌دهد.
const sfRes = await fetch(`${API}/SubmitFeed?apikey=${KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ siteUrl: SITE_URL, feedUrl: `${SITE_URL}/sitemap.xml` }),
  signal: AbortSignal.timeout(30_000),
});
const sfText = await sfRes.text();
let sfBody; try { sfBody = JSON.parse(sfText); } catch { sfBody = { raw: sfText.slice(0, 150) }; }
const sfOk = sfRes.status === 200 && !sfBody?.ErrorCode;
console.log(`- SubmitFeed sitemap.xml → HTTP ${sfRes.status} ${sfOk ? '✅' : `ErrorCode ${sfBody?.ErrorCode} ${sfBody?.Message ?? ''}`}`);

// ── ۳) SubmitUrlBatch — سهمیه ۱۰۰/روز؛ صف اولویت‌دار ──
const queuePath = 'seo/indexing-queue.txt';
if (existsSync(queuePath)) {
  const urls = readFileSync(queuePath, 'utf8').split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.startsWith('http') ? l : `https://${HOST}${l}`)
    .slice(0, 100); // سقف رسمی سهمیه روزانه
  const res = await fetch(`${API}/SubmitUrlBatch?apikey=${KEY}&siteUrl=${encodeURIComponent(SITE_URL)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ siteUrl: SITE_URL, urlList: urls }),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 150) }; }
  const ok = res.status === 200 && !body?.ErrorCode;
  console.log(`- SubmitUrlBatch (${urls.length} URLs) → HTTP ${res.status} ${ok ? '✅' : `ErrorCode ${body?.ErrorCode} ${body?.Message ?? ''}`}`);
} else {
  console.log(`- SubmitUrlBatch skipped — ${queuePath} not found`);
}

// ── ۴) CrawlStats snapshot ──
const cs = await api('GetCrawlStats', { siteUrl: SITE_URL });
if (Array.isArray(cs.body?.d) && cs.body.d.length) {
  const rows = cs.body.d.slice(-14);
  console.log('\n| روز | خزش | خطا | 2xx | InIndex |');
  console.log('|---|---|---|---|---|');
  for (const r of rows) {
    const d = new Date(parseInt(r.Date.slice(6, -2))).toISOString().slice(0, 10);
    console.log(`| ${d} | ${r.CrawledPages} | ${r.CrawlErrors} | ${r.Code2xx} | ${r.InIndex} |`);
  }
  const latest = rows[rows.length - 1];
  console.log(`\nآخرین وضعیت: crawled=${latest.CrawledPages} inIndex=${latest.InIndex}`);
} else {
  console.log(`- GetCrawlStats: HTTP ${cs.status} ${JSON.stringify(cs.body).slice(0, 120)}`);
}
