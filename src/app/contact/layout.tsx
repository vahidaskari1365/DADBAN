import type { Metadata } from "next";

// صفحه /contact کلاینت‌کامپوننت است؛ canonical در layout سروری تعریف می‌شود.
// بدون آن، صفحه canonical صفحه اصلی را ورثت می‌برد (آدیت GSC 2026-10-24).
export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
