/* ============================================================================
   دادورزان — Service Worker (PWA offline + caching)
   ----------------------------------------------------------------------------
   استراتژی‌ها:
   - Static assets (_next/static, fonts, icons): cache-first (همیشه سریع)
   - Navigation (HTML pages): network-first با fallback به cache و offline page
   - API routes: network-only (داده تازه مهمه)
   - تصاویر: stale-while-revalidate
   ========================================================================== */

// v1.4.54 — فاز ۴ چندزبانه: ترجمهٔ فیلتر شهر برد بازار (مقادیر DB با دیکشنری GEO)، متادیتای چندزبانهٔ /case-board، فیکس سرریز ۲۰px موبایل LTR (قرینه‌سازی reveal-start)
const VERSION = "dadvarzan-v1.4.54";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const IMG_CACHE = `${VERSION}-img`;

const OFFLINE_URL = "/offline";

// مسیرهایی که نباید cache شوند
const NEVER_CACHE = [
  /\/api\//,            // API endpoints همیشه network
  /\/admin\//,          // صفحات ادمین
  /\/dashboard\//,      // داشبورد کاربر (داده شخصی)
  /\/login/,
  /\/register/,
  // HMR / WebSocket در dev mode — هرگز cache نمی‌شوند
  /\/_next\/webpack/,
  /\/_next\/hmr/,
  /\/__nextjs/,
  /hot-update/,
  /\.hot-update\./,
];

// Pre-cache: آیکون‌ها و صفحه offline (سبک، همیشه در دسترس)
const PRECACHE_URLS = [
  "/offline",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192-maskable.png",
  "/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Pre-cache به‌صورت best-effort (اگر یکی شکست خورد، کل install شکست نمی‌خورد)
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null)
        )
      );
      // فعال‌سازی سریع SW جدید
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // حذف cache‌های قدیمی
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      // کنترل سریع همه کلاینت‌ها
      await self.clients.claim();
    })()
  );
});

// آیا درخواست نباید cache شود؟
const shouldNeverCache = (req, url) =>
  NEVER_CACHE.some((re) => re.test(url.pathname)) ||
  url.searchParams.has("XTransformPort") ||
  // payloadهای RSC و prefetch نکست مخصوص یک بیلد هستند — کش‌کردنشان بین دیپلوی‌ها
  // باعث نمایش نسخه قدیمی در ناوبری سمت کلاینت می‌شود؛ همیشه network
  req.headers.get("RSC") === "1" ||
  req.headers.get("Next-Router-Prefetch") === "1" ||
  // پارامترهای HMR و query strings های dev mode
  url.searchParams.has("t") ||
  url.searchParams.has("ts") ||
  url.searchParams.has("hash");

// تشخیص درخواست navigation (HTML)
const isNavigation = (req) =>
  req.mode === "navigate" ||
  (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));

// تشخیص static asset
const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  /\.(?:woff2?|css|js|png|jpg|jpeg|svg|ico|webp)$/i.test(url.pathname);

// تشخیص تصویر
const isImage = (req, url) =>
  req.destination === "image" ||
  /\.(?:png|jpg|jpeg|svg|webp|gif)$/i.test(url.pathname);

// Cache-first (برای static assets)
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

// Stale-while-revalidate (برای تصاویر)
async function swr(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok && res.type === "basic") cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// Network-first با fallback cache و offline page (برای ناوبری)
async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // صفحه offline اگر در cache هست
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    // fallback نهایی
    return new Response(
      "<h1 dir='rtl' style='font-family:sans-serif;padding:2rem;text-align:center'>اتصال اینترنت قطع است</h1>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request: req } = event;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // فقط same-origin
  if (url.origin !== self.location.origin) return;
  if (shouldNeverCache(req, url)) return;

  if (isNavigation(req)) {
    event.respondWith(networkFirst(req, PAGE_CACHE));
    return;
  }
  if (isImage(req, url)) {
    event.respondWith(swr(req, IMG_CACHE));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }
  // پیش‌فرض: stale-while-revalidate
  event.respondWith(swr(req, STATIC_CACHE));
});

// مدیریت پیام از کلاینت (مثلاً برای force update)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  if (event.data === "UNREGISTER") {
    // برای debug: unregister همه SWها
    self.registration.unregister().then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((c) => c.navigate(c.url));
      });
    });
  }
});
