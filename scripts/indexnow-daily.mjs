#!/usr/bin/env node
/**
 * IndexNow daily — سابمیت کل sitemap به Bing/Yandex/Seznam هر روز.
 * نیازی به secret ندارد (کلیدها فایل عمومی روی سایت هستند).
 * ترتیب: کلید رسمی پنل → اگر 403 (وریفیکیشن ناتمام) → کلید legacy معتبر.
 * Usage: node scripts/indexnow-daily.mjs
 */
const SITE = 'https://dadvarzan.com';
const KEYS = ['a45bb99f393b45e9b26fd44e23bb561b', '7d61d30a8c52abee357b96e9661b1e46'];

const res = await fetch(`${SITE}/sitemap.xml`, { signal: AbortSignal.timeout(30_000) });
const xml = await res.text();
const urls = [...new Set([...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]))];
console.log(`- sitemap: ${urls.length} URLs`);

async function submit(key) {
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'dadvarzan.com', key, keyLocation: `${SITE}/${key}.txt`, urlList: urls }),
    signal: AbortSignal.timeout(30_000),
  });
  return r.status;
}

let status = await submit(KEYS[0]);
let used = 'official';
if (status === 403) { status = await submit(KEYS[1]); used = 'legacy-fallback'; }

console.log(`- IndexNow [${used}] → HTTP ${status} (${urls.length} URLs)`);
console.log(status === 200 || status === 202 ? '- ✅ IndexNow accepted' : `- ⚠️ IndexNow HTTP ${status}`);
process.exit(status === 200 || status === 202 ? 0 : 0); // هرگز جریان روزانه را نشکن
