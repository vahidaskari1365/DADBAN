/**
 * خروجی امن برای تزریق JSON-LD داخل <script type="application/ld+json">.
 *
 * چرا لازم است؟ JSON.stringify به‌تنهایی از تزریق جلوگیری نمی‌کند: اگر داده‌ای
 * که از دیتابیس یا ورودی کاربر می‌آید (مثلاً نام وکیل، عنوان قرارداد، پاسخ پرسش)
 * شامل «</script>» باشد، مهاجم می‌تواند بلاک اسکریپت را ببندد و کد دلخواهش را
 * در صفحهٔ عمومی اجرا کند (Stored XSS).
 *
 * راه‌حل استاندارد (OWASP JSON Injection): نویسه‌های خطرناک را به escape یونیکد
 * معتبر JSON تبدیل می‌کنیم — مرورگرها همان داده را می‌خوانند ولی دیگر نمی‌توانند
 * ساختار HTML را بشکنند.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
