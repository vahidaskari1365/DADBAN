/*
 * app.js — فایل استارت اپ برای Passenger (cPanel → Setup Node.js App)
 * کار: لود .env از ریشهٔ اپ (بدون وابستگی) و سپس اجرای server.js استاندلون Next.js
 * در cPanel: Application startup file را روی app.js بگذارید.
 * ⚠ HOSTNAME ست نکنید — Passenger پورت را با env همان PORT خودش می‌دهد.
 */
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
    console.log('[dadvarzan] .env loaded');
  } else {
    console.log('[dadvarzan] .env not found — از متغیرهای cPanel استفاده می‌شود');
  }
} catch (e) {
  console.error('[dadvarzan] .env load error:', e && e.message);
}

require('./server.js');
