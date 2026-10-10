// اسکریپت ثبت Service Worker — به‌صورت inline در layout تزریق می‌شود.
// این روش مطمئن‌تر از Client Component است چون مستقل از React hydration اجرا می‌شود.

// در dev ثبت نمی‌شود — SW با HMR و کشِ صفحه تداخل ایجاد می‌کند و HTML توسعه را
// کهنه می‌کند (علت «به‌ظاهر کار نکردن» صفحه در محیط توسعه). PWA فقط production.
const DEV_SKIP = process.env.NODE_ENV !== "production";

export const SW_REGISTER_SCRIPT = DEV_SKIP
  ? ""
  : `(function() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  function register() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(reg) {
        // بررسی آپدیت دوره‌ای — هر ۶۰ ثانیه آپدیت چک کن
        setInterval(function() {
          reg.update().catch(function() {});
        }, 60000);

        // بررسی آپدیت اولیه (هنگام load)
        reg.update().catch(function() {});

        // وقتی SW جدید پیدا شد
        reg.addEventListener('updatefound', function() {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', function() {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              // SW جدید آماده — بلافاصله فعال کن
              nw.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch(function(err) { console.warn('[pwa] SW registration failed:', err); });
  }

  // بعد از load کامل صفحه ثبت کن
  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }

  // وقتی SW جدید کنترل رو گرفت، reload کن
  var reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  // اضافه: اگه کاربر از سایتی برگشته و SW قدیمی داره، در اولین فرصت update کن
  window.addEventListener('focus', function() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.getRegistration().then(function(reg) {
        if (reg) reg.update().catch(function() {});
      });
    }
  });
})();`;
