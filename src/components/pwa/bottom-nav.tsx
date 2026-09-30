"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";

/**
 * نوار ناوبری پایین — شبیه اپ‌های نیتیو موبایل.
 * فقط روی موبایل/تبلت (lg:hidden) نمایش داده می‌شود.
 * روی دسکتاپ، ناوبری اصلی هدر استفاده می‌شود.
 *
 * الگو بر اساس تجربه اپ‌مانند (مثل 10on): ۵ تب اصلی با آیکون + برچسب،
 * تب وسط (مشاوره) برجسته‌تر است (FAB-style) تا تبدیل کاربر را افزایش دهد.
 */

type Tab = {
  label: string;
  href: string;
  icon: IconKey;
  match?: string[]; // مسیرهایی که این تب را «فعال» نشان می‌دهند
  center?: boolean; // آیا این تب وسطی و برجسته است؟
};

const TABS: Tab[] = [
  { label: "خانه", href: "/", icon: "home", match: ["/"] },
  { label: "وکلا", href: "/lawyers", icon: "search", match: ["/lawyers", "/lawyers/"] },
  { label: "مشاوره", href: "/consultation", icon: "calendar", center: true, match: ["/consultation", "/booking"] },
  { label: "پرونده", href: "/case/new", icon: "folder", match: ["/case/new", "/case/", "/track-case", "/dashboard/cases"] },
  { label: "پنل", href: "/dashboard/client", icon: "user", match: ["/dashboard"] },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (tab: Tab) => {
    if (tab.match) {
      return tab.match.some((m) =>
        m === "/" ? pathname === "/" : pathname.startsWith(m)
      );
    }
    return pathname === tab.href;
  };

  return (
    <nav
      aria-label="ناوبری اصلی موبایل"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* پس‌زمینه blur شیشه‌ای */}
      <div
        className="glass border-t border-border"
        style={{
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          backgroundColor: "color-mix(in oklab, var(--surface) 88%, transparent)",
        }}
      >
        <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-2 pb-1">
          {TABS.map((tab) => {
            const active = isActive(tab);
            if (tab.center) {
              // تب وسطی برجسته (FAB-style)
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  aria-label={tab.label}
                  aria-current={active ? "page" : undefined}
                  className="flex -translate-y-3 flex-col items-center gap-1"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--shadow-lift)] transition-transform duration-200 active:scale-90 ${
                      active
                        ? "bg-primary text-primary-foreground scale-105"
                        : "bg-accent text-accent-foreground hover:scale-105"
                    }`}
                  >
                    <Icon name={tab.icon} className="h-6 w-6" />
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      active ? "text-primary" : "text-accent"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            }
            // تب‌های معمولی
            return (
              <Link
                key={tab.label}
                href={tab.href}
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center gap-1 py-1.5 transition-colors"
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-primary-soft text-primary scale-105"
                      : "text-muted-soft"
                  }`}
                >
                  <Icon
                    name={tab.icon}
                    className={`h-5 w-5 ${active ? "stroke-[2.2]" : ""}`}
                  />
                </span>
                <span
                  className={`text-[10px] ${
                    active
                      ? "font-bold text-primary"
                      : "font-medium text-muted-soft"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
