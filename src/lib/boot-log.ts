// bootLog — ردپای بوت روی فایل (FTP-fetchable).
// لاگ‌های Passenger در cPanel قابل‌پیش‌بینی نیستند؛ برای عیب‌یابی انتشار محتوا
// و تشخیص اینکه اصلاً instrumentation اجرا می‌شود یا نه، رد بوت در
// tmp/boot-status.log نوشته می‌شود. هرگز throw نمی‌کند.
import fs from "node:fs";
import path from "node:path";

export function bootLog(line: string): void {
  try {
    const dir = path.join(process.cwd(), "tmp");
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, "boot-status.log"), `${new Date().toISOString()} ${line}\n`);
  } catch {
    /* non-fatal — لاگ هرگز نباید بوت را بشکند */
  }
}
