#!/usr/bin/env node
/**
 * Bing daily ops — جایگزین curl ساده در daily-indexing:
 *  ۱) SubmitSitemap روی هر دو واریانت (non-www اول) — تا وقتی وریفیکیشن کامل نشده
 *     خطای مشخص ثبت می‌شود؛ بعد از وریفیکیشن خودکار موفق می‌شود.
 *  ۲) GetCrawlStats snapshot — روند CrawledPages/InIndex برای GitHub Step Summary
 *  خروجی هیچ داده حساسی ندارد (کلید هرگز چاپ نمی‌شود).
 * Usage: BING_API_KEY=... node scripts/bing-daily.mjs
 */
import { readFileSync } from 'node:fs';

const KEY = process.env.BING_API_KEY;
if (!KEY) { console.error('BING_API_KEY required'); process.exit(1); }
const API = 'https://ssl.bing.com/webmaster/api.svc/json';

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

const variants = ['https://dadvarzan.com', 'https://www.dadvarzan.com'];
let anySuccess = false;

console.log('## Bing daily — ' + new Date().toISOString().slice(0, 16) + 'Z');
for (const v of variants) {
  const ss = await api('SubmitSitemap', { siteUrl: v, feedUrl: `${v}/sitemap.xml` }, 'POST');
  const code = ss.body?.ErrorCode ?? null;
  const msg = ss.body?.Message ?? (ss.body?.d === null || ss.body?.d === '' ? 'OK (null = accepted)' : JSON.stringify(ss.body).slice(0, 100));
  console.log(`- SubmitSitemap \`${v}\` → HTTP ${ss.status} ${code !== null ? `ErrorCode ${code}` : ''} ${msg}`);
  if (ss.status === 200 && ss.body && !ss.body.ErrorCode) anySuccess = true;
}
console.log(anySuccess ? '- ✅ sitemap به بینگ سابمیت شد' : '- ⚠️ سابمیت ناموفق — وریفیکیشن BWT هنوز کامل نشده (docs/geo/bing-verification-steps.md)');

// CrawlStats snapshot — ۱۴ روز اخیر برای روند InIndex
const cs = await api('GetCrawlStats', { siteUrl: variants[0] });
if (cs.body?.d?.length) {
  const rows = cs.body.d.slice(-14);
  console.log('\n| روز | خزش | خطا | 2xx | InIndex |');
  console.log('|---|---|---|---|---|');
  for (const r of rows) {
    const d = new Date(parseInt(r.Date.slice(6, -2))).toISOString().slice(0, 10);
    console.log(`| ${d} | ${r.CrawledPages} | ${r.CrawlErrors} | ${r.Code2xx} | ${r.InIndex} |`);
  }
  const latest = rows[rows.length - 1];
  console.log(`\nآخرین وضعیت: crawled=${latest.CrawledPages} inIndex=${latest.InIndex}`);
  if (latest.InIndex === 0) console.log('\n⚠️ InIndex = 0 — تا وریفیکیشن کامل نشود بینگ سایت را ایندکس نمی‌کند.');
} else {
  console.log(`- GetCrawlStats: HTTP ${cs.status} ${JSON.stringify(cs.body).slice(0, 120)}`);
}
