#!/usr/bin/env node
/**
 * Probe: کدام فرمت siteUrl در SubmitFeed پذیرفته می‌شود؟
 * واریانت‌ها: با اسلش انتهایی / بدون اسلش / www
 * خروجی غیرحساس. فقط برای اجرای دستی — سهمیه‌ای مصرف نمی‌کند (SubmitFeed سهمیه ندارد).
 */
const KEY = process.env.BING_API_KEY;
if (!KEY) { console.error('BING_API_KEY required'); process.exit(1); }
const API = 'https://ssl.bing.com/webmaster/api.svc/json';

async function call(endpoint, params, method = 'GET') {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set('apikey', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 150) }; }
  return { status: res.status, body };
}

// ۱) مقدار دقیق ذخیره‌شده در بینگ
const us = await call('GetUserSites', {});
const stored = us.body?.d?.find(s => s.Url?.includes('dadvarzan'))?.Url ?? 'NOT_FOUND';
console.log('stored siteUrl:', JSON.stringify(stored));

const variants = [...new Set([stored, 'https://dadvarzan.com/', 'https://dadvarzan.com', 'https://www.dadvarzan.com'])].filter(v => v !== 'NOT_FOUND');

// ۲) GetFeeds با هر واریانت — کدام داده کامل برمی‌گرداند؟
console.log('\n=== GetFeeds variants ===');
for (const v of variants) {
  const r = await call('GetFeeds', { siteUrl: v });
  const d = Array.isArray(r.body?.d) ? r.body.d : null;
  console.log(`GetFeeds ${v} → HTTP ${r.status} | feeds: ${d?.length ?? 'null'}`, d?.[0] ? `| status: "${d[0].Status ?? d[0].status ?? '?'}"` : '');
}

// ۳) SubmitFeed با هر واریانت
console.log('\n=== SubmitFeed variants ===');
for (const v of variants) {
  const r = await call('SubmitFeed', { siteUrl: v, feedUrl: 'https://dadvarzan.com/sitemap.xml' }, 'POST');
  const ok = r.status === 200 && !r.body?.ErrorCode;
  console.log(`SubmitFeed siteUrl=${v} → HTTP ${r.status} ${ok ? '✅ ACCEPTED' : `ErrorCode ${r.body?.ErrorCode} ${r.body?.Message ?? JSON.stringify(r.body).slice(0, 100)}`}`);
}
console.log('\n✓ probe done');
