#!/usr/bin/env node
/**
 * ربات روزانهٔ «درخواست نمایه‌سازی» سرچ‌کنسول گوگل
 *
 * چرا ربات مرورگر؟ چون گوگل برای Request Indexing هیچ API رسمی ندارد
 * (Indexing API رسمی فقط برای JobPosting/BroadcastEvent است).
 * این اسکریپت با سشن گوگل (کوکی‌ها) UI سرچ‌کنسول را باز می‌کند،
 * صفحات را Inspection می‌کند و اگر ایندکس نبودند دکمهٔ Request Indexing را می‌زند.
 *
 * ورودی‌ها:
 *   GOOGLE_COOKIES_JSON — آرایهٔ JSON کوکی‌ها [{name,value,domain?}] یا رشتهٔ خام هدر Cookie
 *   GSC_PROPERTY        — پیش‌فرض sc-domain:dadvarzan.com
 *   --count N           — حداکثر تعداد در روز (پیش‌فرض 10)
 *   --dry-run           — فقط بازدید/تشخیص، بدون کلیک
 *
 * صف: seo/indexing-queue.txt (اولویت‌دار)
 * خروجی: seo/indexing-done.txt + seo/indexing-log.jsonl + بازنویسی صف
 * کدهای خروج: 0=اوکی، 2=سشن منقضی، 3=کوتای گوگل تمام شده
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PROP = process.env.GSC_PROPERTY ?? 'sc-domain:dadvarzan.com';
const QUEUE = process.env.RI_QUEUE ?? 'seo/indexing-queue.txt';
const DONE = process.env.RI_DONE ?? 'seo/indexing-done.txt';
const LOG = process.env.RI_LOG ?? 'seo/indexing-log.jsonl';
const SHOTS = 'seo/shots';
const COUNT = parseInt(process.argv.find((a, i, arr) => arr[i - 1] === '--count') ?? process.env.RI_COUNT ?? '10', 10);
const DRY = process.argv.includes('--dry-run');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseCookies(raw) {
  const s = (raw ?? '').trim();
  if (!s) return [];
  if (s.startsWith('[')) return JSON.parse(s);
  return s.split(';').map(p => p.trim()).filter(Boolean).map(p => {
    const eq = p.indexOf('=');
    return { name: p.slice(0, eq).trim(), value: p.slice(eq + 1).trim() };
  }).filter(c => c.name && c.value);
}

const readLines = (f) => existsSync(f) ? readFileSync(f, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')) : [];
const iso = () => new Date().toISOString();
const log = (rec) => { appendFileSync(LOG, JSON.stringify(rec) + '\n'); console.log(JSON.stringify(rec)); };

const RE_INDEXED = /URL (is )?on Google|URL در Google است|بر روی Google/i;
const RE_NOT_INDEXED = /URL (is )?not on Google|URL در Google نیست/i;
const RE_BTN = /Request indexing|درخواست نمایه/i;
const RE_REQUESTED = /Indexing (was )?requested|درخواست نمایه‌سازی (ثبت شد|شد)|به Google ارسال شد|submission (has been )?received/i;
const RE_QUOTA = /quota|سهمیه|تعداد درخواست‌های شما/i;
const RE_SESSION_DEAD = /accounts\.google\.com\/|sign in|ورود به حساب/i;

async function shoot(page, tag) {
  try { mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: `${SHOTS}/${Date.now()}-${tag}.png`, fullPage: false }); } catch {}
}

async function main() {
  const cookies = parseCookies(process.env.GOOGLE_COOKIES_JSON);
  if (!cookies.length) {
    console.log('NO_COOKIES: متغیر GOOGLE_COOKIES_JSON تنظیم نیست — امروز ربات UI اجرا نمی‌شود (فقط بازارسال sitemap).');
    process.exit(0);
  }

  const queue = readLines(QUEUE);
  const done = new Set(readLines(DONE).map(l => l.split('\t')[1] ?? l));
  const picks = queue.filter(u => !done.has(u)).slice(0, COUNT);
  if (!picks.length) { console.log('QUEUE_EMPTY: صف خالی است.'); process.exit(0); }
  console.log(`→ ${picks.length} URL از ${queue.filter(u => !done.has(u)).length} صف مانده`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });
  const ctx = await browser.newContext({ userAgent: UA, locale: 'en-US', viewport: { width: 1366, height: 900 } });
  await ctx.addCookies(cookies.map(c => ({ domain: c.domain ?? '.google.com', path: c.path ?? '/', secure: true, httpOnly: false, ...c })));
  const page = await ctx.newPage();

  // ── چک سشن ──
  await page.goto(`https://search.google.com/search-console?resource_id=${encodeURIComponent(PROP)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(4000);
  if (RE_SESSION_DEAD.test(page.url())) {
    await shoot(page, 'session-dead');
    console.log('SESSION_EXPIRED: کوکی‌ها منقضی شده — کوکی تازه لازم است.');
    process.exit(2);
  }

  let okCount = 0, skipCount = 0, failCount = 0;
  const processed = [];

  for (const url of picks) {
    const insp = `https://search.google.com/search-console/inspection?resource_id=${encodeURIComponent(PROP)}&id=${encodeURIComponent(url)}`;
    try {
      await page.goto(insp, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // نتیجهٔ Inspection معمولاً بین ۵ تا ۳۰ ثانیه می‌آید
      const verdict = await page.waitForSelector(`text=/(${RE_INDEXED.source})|(${RE_NOT_INDEXED.source})|(${RE_QUOTA.source})/`, { timeout: 90000 }).catch(() => null);
      const body = await page.textContent('body').catch(() => '');

      if (RE_QUOTA.test(body)) {
        await shoot(page, 'quota');
        log({ ts: iso(), url, status: 'QUOTA_STOP' });
        console.log('کوتای روزانهٔ گوگل تمام شده — فردا ادامه می‌دهیم.');
        break;
      }

      if (RE_INDEXED.test(body) && !RE_NOT_INDEXED.test(body)) {
        skipCount++;
        processed.push([iso(), url, 'SKIP_ALREADY_INDEXED'].join('\t'));
        log({ ts: iso(), url, status: 'SKIP_ALREADY_INDEXED' });
        continue;
      }

      if (!verdict) {
        await shoot(page, 'no-verdict');
        failCount++;
        processed.push([iso(), url, 'FAIL_NO_VERDICT'].join('\t'));
        log({ ts: iso(), url, status: 'FAIL_NO_VERDICT' });
        continue;
      }

      if (DRY) {
        processed.push([iso(), url, 'DRY_RUN_DETECTED_NOT_INDEXED'].join('\t'));
        log({ ts: iso(), url, status: 'DRY_RUN_DETECTED_NOT_INDEXED' });
        continue;
      }

      // ── کلیک Request Indexing ──
      const btn = page.getByRole('button', { name: RE_BTN }).first();
      if (!(await btn.isVisible().catch(() => false))) {
        await shoot(page, 'no-button');
        failCount++;
        processed.push([iso(), url, 'FAIL_NO_BUTTON'].join('\t'));
        log({ ts: iso(), url, status: 'FAIL_NO_BUTTON' });
        continue;
      }
      await btn.click();

      // مودال تست زنده (۱ تا ۳ دقیقه) — اگر دکمهٔ دوم خواست دوباره کلیک می‌کنیم
      const confirm = await page.waitForSelector(`text=/(${RE_REQUESTED.source})/`, { timeout: 240000 }).catch(() => null);
      if (!confirm) {
        const btn2 = page.getByRole('button', { name: RE_BTN }).first();
        if (await btn2.isVisible().catch(() => false)) {
          await btn2.click();
          await page.waitForSelector(`text=/(${RE_REQUESTED.source})/`, { timeout: 240000 }).catch(() => {});
        }
      }
      const body2 = await page.textContent('body').catch(() => '');
      if (RE_REQUESTED.test(body2)) {
        okCount++;
        processed.push([iso(), url, 'REQUESTED'].join('\t'));
        log({ ts: iso(), url, status: 'REQUESTED' });
      } else {
        await shoot(page, 'no-confirm');
        failCount++;
        processed.push([iso(), url, 'FAIL_NO_CONFIRM'].join('\t'));
        log({ ts: iso(), url, status: 'FAIL_NO_CONFIRM' });
      }
      await page.waitForTimeout(2500);
    } catch (e) {
      await shoot(page, 'error');
      failCount++;
      processed.push([iso(), url, `FAIL_ERROR`].join('\t'));
      log({ ts: iso(), url, status: 'FAIL_ERROR', error: String(e?.message ?? e).slice(0, 160) });
    }
  }

  // ── به‌روزرسانی فایل‌های وضعیت ──
  if (processed.length) {
    appendFileSync(DONE, processed.join('\n') + '\n');
    const doneUrls = new Set(processed.map(l => l.split('\t')[1]));
    const remaining = queue.filter(u => !doneUrls.has(u));
    writeFileSync(QUEUE, '# صف درخواست نمایه‌سازی روزانه — اولویت‌دار (بالا = مهم‌تر)\n' + remaining.join('\n') + '\n');
  }

  console.log(`SUMMARY: requested=${okCount} skipped=${skipCount} failed=${failCount} of ${picks.length}`);
  await browser.close();
  process.exit(0);
}

main().catch(e => { console.error('FATAL', String(e?.message ?? e).slice(0, 300)); process.exit(1); });
