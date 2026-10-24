#!/usr/bin/env node
/**
 * Bing Webmaster Tools — آدیت کامل + رفع مشکل با API رسمی (v2 — endpointهای درست)
 * Usage: BING_API_KEY=... node scripts/bing-audit.mjs
 * خروجی: bing-audit-results.json (بدون هیچ داده حساس — کلید هرگز چاپ نمی‌شود)
 *
 * نکته مهم (2026-10-24): endpointهای GetSites / GetSitemaps / GetUrlStatistics
 * دیگر وجود ندارند (404 خالی می‌دهند حتی با کلید الکی). معادل‌های درست:
 *   GetSites      → GetUserSites
 *   GetSitemaps   → GetFeeds
 *   SubmitSitemap → SubmitFeed (POST)
 *   GetCrawlIssues → فهرست مشکلات SEO که بینگ گزارش می‌کند (هدف اصلی آدیت)
 *   SubmitUrlBatch → سابمیت گروهی URL برای ایندکس (POST)
 */
import { writeFileSync } from 'node:fs';

const KEY = process.env.BING_API_KEY;
if (!KEY) { console.error('BING_API_KEY required'); process.exit(1); }
const API = 'https://ssl.bing.com/webmaster/api.svc/json';
const HOST = 'dadvarzan.com';
const VARIANTS = [`https://${HOST}`, `https://www.${HOST}`];

const out = { ts: new Date().toISOString(), userSites: null, site: null, feeds: {}, crawlIssues: {}, crawlStats: {}, queryStats: {}, linkCounts: {}, submitFeed: {}, submitBatch: {}, verified: false };

async function api(endpoint, params = {}, method = 'GET') {
  const url = new URL(`${API}/${endpoint}`);
  url.searchParams.set('apikey', KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url, {
      method,
      ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({}) } : {}),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }
    return { status: res.status, body };
  } catch (e) {
    return { status: 0, body: { error: String(e).slice(0, 200) } };
  }
}

// ── ۱) GetUserSites — تنها راه درست فهرست سایت‌ها ──
const us = await api('GetUserSites');
out.userSites = { status: us.status, sites: us.body?.d?.map(s => ({ url: s.Url, verified: !!s.IsVerified, indexNowEnabled: s.IndexNowEnabled ?? null, cat: s.AssociatedAggregationService ?? null })) ?? { status: us.status, body: us.body } };
console.log('GetUserSites →', JSON.stringify(out.userSites));

const sites = Array.isArray(us.body?.d) ? us.body.d : [];
const main = sites.find(s => s.Url?.replace(/\/$/, '') === `https://${HOST}`) ?? sites.find(s => s.Url?.includes(HOST));
if (main) {
  out.site = { url: main.Url, verified: !!main.IsVerified, indexNowEnabled: main.IndexNowEnabled ?? null };
  out.verified = !!main.IsVerified;
}
const SITE_URL = main?.Url?.replace(/\/$/, '') ?? `https://${HOST}`; // مقدار دقیق از خود بینگ (اسلش انتهایی حذف می‌شود فقط برای پارامتر API)
console.log('→ using siteUrl:', SITE_URL, '| verified:', out.verified);

// ── ۲) GetCrawlIssues — لیست مشکلاتی که خود بینگ گزارش کرده ──
const ci = await api('GetCrawlIssues', { siteUrl: SITE_URL });
const issues = Array.isArray(ci.body?.d) ? ci.body.d : null;
out.crawlIssues = { status: ci.status, count: issues?.length ?? null, issues: issues?.map(i => ({ url: i.Url ?? i.DiscoveredUrl, category: i.IssueType ?? i.Category, code: i.HttpStatus ?? null, date: i.DiscoveryDate ?? null })) ?? ci.body };
console.log('GetCrawlIssues →', JSON.stringify(out.crawlIssues).slice(0, 800));

// ── ۳) GetFeeds — وضعیت sitemapها ──
const gf = await api('GetFeeds', { siteUrl: SITE_URL });
const feeds = Array.isArray(gf.body?.d) ? gf.body.d : null;
out.feeds = { status: gf.status, count: feeds?.length ?? null, feeds: feeds?.map(f => ({ url: f.Url ?? f.FeedUrl, status: f.Status, lastMod: f.LastModifiedDate ?? null, discovered: f.DiscoveredUrlsCount ?? f.DiscoveredCount ?? null, indexed: f.InIndexCount ?? null })) ?? gf.body };
console.log('GetFeeds →', JSON.stringify(out.feeds).slice(0, 600));

// توجه: SubmitFeed/SubmitUrlBatch اینجا اجرا نمی‌شوند (فقط-خواندنی؛ سهمیه ۱۰۰/روز
// SubmitUrlBatch هدر نمی‌رود) — آن عملیات در scripts/bing-daily.mjs است.

// ── ۶) آمار خزش/ترافیک/بک‌لینک ──
const cs = await api('GetCrawlStats', { siteUrl: SITE_URL });
const crawlData = cs.body?.d;
out.crawlStats = { status: cs.status, hasData: Array.isArray(crawlData) && crawlData.length > 0, sample: Array.isArray(crawlData) ? crawlData.slice(0, 3) : cs.body };
console.log('GetCrawlStats →', JSON.stringify(out.crawlStats).slice(0, 400));

const qs = await api('GetQueryStats', { siteUrl: SITE_URL });
out.queryStats = { status: qs.status, rows: Array.isArray(qs.body?.d) ? qs.body.d.length : 0 };
console.log('GetQueryStats →', JSON.stringify(out.queryStats));

const lc = await api('GetLinkCounts', { siteUrl: SITE_URL });
const lcD = lc.body?.d;
out.linkCounts = { status: lc.status, total: lcD?.TotalPages ?? null, links: lcD?.Links?.length ?? null };
console.log('GetLinkCounts →', JSON.stringify(out.linkCounts));

writeFileSync('bing-audit-results.json', JSON.stringify(out, null, 2));
console.log('✓ written bing-audit-results.json');
console.log('SUMMARY:', JSON.stringify({ verified: out.verified, site: out.site?.url, crawlIssues: out.crawlIssues.count, feeds: out.feeds.count }));
