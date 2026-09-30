// اسکریپت ثبت Service Worker — به‌صورت inline در layout تزریق می‌شود.
// این روش مطمئن‌تر از Client Component است چون مستقل از React hydration اجرا می‌شود.

export const SW_REGISTER_SCRIPT = `
(function() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  function register() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(reg) {
        // بررسی آپدیت دوره‌ای
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
})();
`;
