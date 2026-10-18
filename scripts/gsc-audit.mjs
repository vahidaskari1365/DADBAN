#!/usr/bin/env node
/**
 * GSC URL Inspection Audit — dadvarzan.com
 * Usage:
 *   GSC_KEY_FILE=/path/key.json node scripts/gsc-audit.mjs [--site https://dadvarzan.com] [--out out.jsonl]
 *   (or)  GSC_KEY_JSON='<service-account json string>' node scripts/gsc-audit.mjs
 * Reads sitemap.xml, inspects every URL via Search Console URL Inspection API,
 * appends results to out (resume-safe) and prints a summary.
 */
import { createSign, createVerify } from 'node:crypto';
import { readFileSync, appendFileSync, existsSync, statSync, unlinkSync } from 'node:fs';

const SITE = (process.argv.find(a => a.startsWith('--site'))?.split('=')[1]
  ?? process.argv.find((a, i, arr) => arr[i - 1] === '--site')
  ?? 'https://dadvarzan.com').replace(/\/$/, '');
const OUT = (process.argv.find((a, i, arr) => arr[i - 1] === '--out') ?? 'gsc-audit-results.jsonl');
const SITE_URL = process.env.GSC_SITE_URL ?? `sc-domain:${SITE.replace(/^https?:\/\//, '')}`;
const CONC = 10;
// URL Inspection API: /v1 path — siteUrl goes in the BODY (not /webmasters/v3/sites/...)
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const MIN_GAP_MS = 120; // ≤500 requests/min (under the 600 QPM quota)

function loadKey() {
  if (process.env.GSC_KEY_FILE) return JSON.parse(readFileSync(process.env.GSC_KEY_FILE, 'utf8'));
  if (process.env.GSC_KEY_JSON) return JSON.parse(process.env.GSC_KEY_JSON);
  console.error('Set GSC_KEY_FILE or GSC_KEY_JSON');
  process.exit(1);
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');

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
  const sig = signer.sign(key.private_key, 'base64url');
  const jwt = `${header}.${payload}.${sig}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`token failed: ${JSON.stringify(j).slice(0, 300)}`);
  return j.access_token;
}

async function fetchSitemap(site) {
  const res = await fetch(`${site}/sitemap.xml`, { headers: { 'User-Agent': 'Mozilla/5.0 dadvarzan-audit' } });
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
  return [...new Set(urls)];
}

function classify(r) {
  // URL Inspection response: inspectionResult.indexStatusResult (a.k.a. "index" in some docs)
  const i = r?.inspectionResult?.indexStatusResult ?? r?.inspectionResult?.index ?? {};
  const cov = i.coverageState ?? '';
  const v = i.verdict ?? 'UNKNOWN';
  let bucket;
  if (/Submitted and indexed/i.test(cov)) bucket = 'INDEXED';
  else if (/Discovered - currently not indexed/i.test(cov)) bucket = 'DISCOVERED_NOT_INDEXED';
  else if (/Crawled - currently not indexed/i.test(cov)) bucket = 'CRAWLED_NOT_INDEXED';
  else if (/redirect/i.test(cov)) bucket = 'REDIRECT';
  else if (/Duplicate/i.test(cov) || /Alternate page/i.test(cov)) bucket = 'DUPLICATE';
  else if (/Soft 404/i.test(cov)) bucket = 'SOFT404';
  else if (/not found \(404\)/i.test(cov)) bucket = 'NOT_FOUND';
  else if (/robots/i.test(cov)) bucket = 'BLOCKED_ROBOTS';
  else if (/noindex/i.test(cov)) bucket = 'NOINDEX';
  else if (/Spammy|Violating|Pure harm/i.test(cov)) bucket = 'SPAM';
  else if (v === 'PASS') bucket = 'INDEXED';
  else bucket = 'UNKNOWN';
  return { bucket, verdict: v, coverage: cov, indexing: i.indexingState ?? '', crawling: i.crawlingState ?? '', robots: i.robotsTxtState ?? (r?.inspectionResult?.robotsTxtResult?.robotsTxtState ?? ''), fetch: i.pageFetchState ?? '', canonical: i.googleCanonical ?? '', lastCrawl: i.lastCrawlTime ?? '' };
}

let nextSlot = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function pace() {
  const t = Math.max(nextSlot, Date.now());
  nextSlot = t + MIN_GAP_MS;
  await sleep(Math.max(0, t - Date.now()));
}

async function inspect(token, url) {
  await pace();
  const res = await fetch(INSPECT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE_URL, languageCode: 'fa' }),
    signal: AbortSignal.timeout(60_000), // don't hang forever on slow live inspections
  });
  if (res.status === 429 || res.status >= 500) { const e = new Error(`HTTP ${res.status}`); e.retry = true; e.status = res.status; throw e; }
  const j = await res.json();
  if (j.error) { const e = new Error(`API ${j.error.code}: ${j.error.message?.slice(0, 120)}`); e.retry = j.error.code === 429 || j.error.code >= 500; throw e; }
  return j;
}

async function main() {
  const t0 = Date.now();
  const key = loadKey();
  const token = await getToken(key);
  console.log(`✓ token OK (site: ${SITE_URL})`);

  const urls = await fetchSitemap(SITE);
  console.log(`✓ sitemap: ${urls.length} URLs`);

  const done = new Set();
  if (existsSync(OUT)) {
    for (const line of readFileSync(OUT, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { done.add(JSON.parse(line).url); } catch {}
    }
  }
  const todo = urls.filter(u => !done.has(u));
  console.log(`→ ${todo.length} to inspect (${done.size} already done)`);

  let idx = 0, ok = 0, fail = 0;
  const buckets = {};
  const failures = [];
  async function worker(id) {
    while (idx < todo.length) {
      const url = todo[idx++];
      let rec, tries = 0;
      for (;;) {
        try {
          const r = await inspect(token, url);
          rec = { url, ts: new Date().toISOString(), ...classify(r) };
          ok++; buckets[rec.bucket] = (buckets[rec.bucket] ?? 0) + 1;
          break;
        } catch (e) {
          tries++;
          const retryable = e.retry || e.name === 'TimeoutError' || e.name === 'AbortError';
          if (retryable && tries <= 6) { await sleep(Math.min(60_000, 2000 * 2 ** tries)); continue; }
          rec = { url, ts: new Date().toISOString(), bucket: 'ERROR', error: String(e.message ?? e).slice(0, 200) };
          fail++; failures.push(rec);
          break;
        }
      }
      appendFileSync(OUT, JSON.stringify(rec) + '\n');
      if ((ok + fail) % 25 === 0) {
        const elapsed = Math.round((Date.now() - t0) / 1000);
        console.log(`  … ${ok + fail}/${todo.length} (${elapsed}s) — ${JSON.stringify(buckets)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i)));

  console.log('\n===== SUMMARY =====');
  for (const [b, n] of Object.entries(buckets).sort((a, x) => x[1] - a[1])) console.log(`${b.padEnd(24)} ${n}`);
  if (fail) console.log(`ERRORS: ${fail} (first 5: ${failures.slice(0, 5).map(f => f.url).join(' | ')})`);
  console.log(`Total ${urls.length} — elapsed ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
