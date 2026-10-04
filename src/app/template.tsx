import type { ReactNode } from "react";

/**
 * ترنزیشن سینمایی بین صفحات.
 * در App Router، template با هر ناوبری دوباره مونت می‌شود؛ پس انیمیشن ورود
 * (fade + بلور + جابه‌جایی ملایم) در هر جابه‌جای صفحه یک‌بار اجرا می‌شود.
 * فقط transform/opacity/filter — سبک و GPU-friendly. با prefers-reduced-motion
 * به‌طور کامل غیرفعال می‌شود (قاعده سراسری در globals.css).
 * fill-mode: backwards است تا پس از پایان انیمیشن هیچ transform باقی‌مانده‌ای
 * sticky/fixed داخل صفحات را خراب نکند.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
