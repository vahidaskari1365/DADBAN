#!/usr/bin/env node
/**
 * IndexNow batch submission — همه URLهای مشکل‌دار GSC (non-indexed) + کل sitemap.
 * کلیدها از سورس سایت خوانده می‌شوند (public/*.txt) — نیازی به secret نیست.
 */
import { readFileSync } from 'node:fs';

const SITE = 'https://dadvarzan.com';
const KEYS = ['a45bb99f393b45e9b26fd44e23bb561b', '7d61d30a8c52abee357b96e9661b1e46'];

// ۱) کل sitemap (سابمیت کامل برای Bing/Yandex)
const sitemapRes = await fetch(`${SITE}/sitemap.xml`, { signal: AbortSignal.timeout(30_000) });
const xml = await sitemapRes.text();
const allUrls = [...new Set([...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]))];
console.log(`sitemap: ${allUrls.length} URLs`);

// ۲) URLهای مشکل‌دار از آدیت GSC (اولویت بالا)
let problemUrls = [];
try {
  const lines = readFileSync('/tmp/gsc-audit-latest/gsc-audit-results.jsonl', 'utf8').split('\n').filter(Boolean);
  const problems = lines
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(r => r && r.url && ['DUPLICATE', 'CRAWLED_NOT_INDEXED', 'DISCOVERED_NOT_INDEXED', 'UNKNOWN'].includes(r.bucket));
  problemUrls = [...new Set(problems.map(r => r.url))];
  console.log(`problem URLs from audit: ${problemUrls.length}`);
} catch (e) {
  console.log('audit file not available:', String(e).slice(0, 80));
}

// فایل کلید روی سایت باید همان کلید باشد — verify
for (const k of KEYS) {
  const r = await fetch(`${SITE}/${k}.txt`, { signal: AbortSignal.timeout(15_000) });
  const t = (await r.text()).trim();
  console.log(`key file ${k.slice(0, 8)}…: HTTP ${r.status} content-ok=${t === k}`);
}

async function submit(key, urls, label) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'dadvarzan.com', key, keyLocation: `${SITE}/${key}.txt`, urlList: urls }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.text().catch(() => '');
  console.log(`[${label}] key=${key.slice(0, 8)}… → HTTP ${res.status} ${body.slice(0, 120)}`);
  return res.status;
}

// batch ۱: URLهای مشکل‌دار (اولویت) — کلید رسمی بینگ، اگر 403 شد فال‌بک
let s1 = await submit(KEYS[0], problemUrls, 'problems');
if (s1 === 403) s1 = await submit(KEYS[1], problemUrls, 'problems-legacy');

// batch ۲: کل sitemap (سقف 10000) — همین کلیدی که قبول شد
const key2 = (s1 === 200 || s1 === 202) ? KEYS[0] : KEYS[1];
let s2 = await submit(key2, allUrls, 'full-sitemap');
if (s2 === 403 && key2 === KEYS[0]) s2 = await submit(KEYS[1], allUrls, 'full-sitemap-legacy');

console.log(s1 === 200 || s1 === 202 ? '✅ IndexNow problems-submitted' : `⚠️ IndexNow problems: HTTP ${s1}`);
console.log(s2 === 200 || s2 === 202 ? '✅ IndexNow full-sitemap-submitted' : `⚠️ IndexNow sitemap: HTTP ${s2}`);
