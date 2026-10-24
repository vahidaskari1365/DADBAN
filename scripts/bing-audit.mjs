#!/usr/bin/env node
/**
 * Bing Webmaster Tools — آدیت کامل با API رسمی
 * Usage: BING_API_KEY=... node scripts/bing-audit.mjs
 * خروجی: bing-audit-results.json (بدون هیچ داده حساس — کلید هرگز چاپ نمی‌شود)
 *
 * API docs: https://www.bing.com/webmasters/help/webmasters-api-hub-v1-9e1c9d74
 */
import { writeFileSync } from 'node:fs';

const KEY = process.env.BING_API_KEY;
if (!KEY) { console.error('BING_API_KEY required'); process.exit(1); }
const API = 'https://ssl.bing.com/webmaster/api.svc/json';

const out = { ts: new Date().toISOString(), sites: null, sitemaps: {}, crawlStats: {}, queryStats: {}, linkCounts: {}, urlStats: {}, submitTests: {} };

async function api(endpoint, params = {}, method = 'GET') {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set('apikey', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, { method, signal: AbortSignal.timeout(30_000) });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: { error: String(e).slice(0, 200) } };
  }
}

// ── ۱) همهٔ سایت‌های ثبت‌شده با این کلید — حیاتی‌ترین فراخوانی ──
const sites = await api('GetSites');
out.sites = sites.body?.d?.map(s => ({ url: s.Url, verified: !!s.IsVerified, cat: s.AssociatedAggregationService ?? null, indexNowEnabled: s.IndexNowEnabled ?? null })) ?? { status: sites.status, raw: sites.body };
console.log('GetSites →', JSON.stringify(out.sites));

// GetSites یک‌بار دیگر (اگر 404 موقتی بود) + تست هر دو واریانت پراپرتی
const sites2 = await api('GetSites');
out.sitesRetry = { status: sites2.status, body: sites2.body };
console.log('GetSites retry →', sites2.status, JSON.stringify(sites2.body).slice(0, 300));

// کدام واریانت واقعاً با این کلید شناخته می‌شود؟ (CrawlStats حتی برای سایت ناشناخته خطای مشخص می‌دهد)
const variants = ['https://dadvarzan.com', 'https://www.dadvarzan.com'];
out.variantProbe = {};
for (const v of variants) {
  const cs = await api('GetCrawlStats', { siteUrl: v });
  out.variantProbe[v] = { status: cs.status, hasData: Array.isArray(cs.body?.d) && cs.body.d.length > 0, error: cs.body?.ErrorCode ?? null, message: cs.body?.Message ?? null };
  console.log(`variant ${v} → HTTP ${cs.status}`, JSON.stringify(cs.body).slice(0, 150));
}
const workingVariant = Object.entries(out.variantProbe).find(([, p]) => p.hasData)?.[0] ?? 'https://dadvarzan.com';

const SITE_URL = workingVariant;
console.log('→ using siteUrl:', SITE_URL);

// ── ۲) sitemapها ──
const sm = await api('GetSitemaps', { siteUrl: SITE_URL });
out.sitemaps = { siteUrl: SITE_URL, status: sm.status, body: sm.body };
console.log('GetSitemaps →', JSON.stringify(sm.body).slice(0, 400));

// ── ۳) CrawlStats (۶ ماه اخیر) ──
const cs = await api('GetCrawlStats', { siteUrl: SITE_URL });
out.crawlStats = { status: cs.status, body: cs.body };
const crawlInfo = cs.body?.d;
if (crawlInfo) {
  const withData = Object.entries(crawlInfo).filter(([k, v]) => Array.isArray(v) && v.length);
  console.log('GetCrawlStats keys with data:', withData.map(([k, v]) => `${k}:${v.length}`).join(', ') || 'EMPTY');
}

// ── ۴) QueryStats (۳ ماه اخیر) ──
const qs = await api('GetQueryStats', { siteUrl: SITE_URL });
out.queryStats = { status: qs.status, body: qs.body };
console.log('GetQueryStats →', JSON.stringify(qs.body).slice(0, 300));

// ── ۵) LinkCounts ──
const lc = await api('GetLinkCounts', { siteUrl: SITE_URL });
out.linkCounts = { status: lc.status, body: lc.body };
console.log('GetLinkCounts →', JSON.stringify(lc.body).slice(0, 300));

// ── ۶) Index Explorer برای صفحات کلیدی ──
const sampleUrls = [
  'https://dadvarzan.com/',
  'https://dadvarzan.com/lawyers',
  'https://dadvarzan.com/knowledge/tarefe-vekalat-1405',
  'https://dadvarzan.com/lawyers/city/shiraz',
  'https://dadvarzan.com/services/administrative-request',
];
for (const u of sampleUrls) {
  const us = await api('GetUrlStatistics', { siteUrl: SITE_URL, url: u });
  out.urlStats[u] = { status: us.status, body: us.body };
  console.log(`GetUrlStatistics ${u} →`, JSON.stringify(us.body).slice(0, 250));
}

// ── ۷) تست SubmitSitemap روی هر دو واریانت پراپرتی ──
for (const v of variants) {
  const ss = await api('SubmitSitemap', {
    siteUrl: v,
    feedUrl: `${v}/sitemap.xml`,
  }, 'POST');
  out.submitTests[`sitemap_${v}`] = { status: ss.status, body: ss.body };
  console.log(`SubmitSitemap ${v} →`, JSON.stringify(ss.body).slice(0, 300));
}

writeFileSync('bing-audit-results.json', JSON.stringify(out, null, 2));
console.log('✓ written bing-audit-results.json');
