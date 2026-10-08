"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/**
 * نوار ناوبری پایین — طراحی بیضی شناور (floating oval) مثل اپ‌های مدرن.
 * فقط روی موبایل/تبلت (lg:hidden) نمایش داده می‌شود.
 *
 * ویژگی‌ها:
 * - کانتینر بیضی شکل با rounded-full و margin از لبه‌ها
 * - شناور با سایه زیبا (floating)
 * - تب وسط FAB بزرگ با gradient طلایی
 * - active indicator به‌صورت pill/dot
 * - انیمیشن‌های spring نرم
 * - وقتی کاربر با حساب «وکیل» یا «عضو تیم» وارد شده باشد، تب‌ها به نسخهٔ
 *   وکیلی تغییر می‌کند: کارتابل، پنل آنلاین، پیشنهادها و یادآور.
 */

type Tab = {
  label: string;
  href: string;
  icon: IconKey;
  match?: string[];
  center?: boolean;
};

const TABS: Tab[] = [
  { label: "خانه", href: "/", icon: "home", match: ["/"] },
  { label: "وکلا", href: "/lawyers", icon: "search", match: ["/lawyers", "/lawyers/"] },
  { label: "مشاوره", href: "/consultation", icon: "calendar", center: true, match: ["/consultation", "/booking"] },
  { label: "پرونده", href: "/case/new", icon: "folder", match: ["/case/new", "/case/", "/track-case", "/dashboard/cases"] },
  { label: "پنل", href: "/dashboard/client", icon: "user", match: ["/dashboard"] },
];

const LAWYER_TABS: Tab[] = [
  { label: "خانه", href: "/", icon: "home", match: ["/"] },
  { label: "کارتابل", href: "/dashboard/lawyer", icon: "folder", match: ["/dashboard"] },
  { label: "پنل آنلاین", href: "/consultation/live", icon: "calendar", center: true, match: ["/consultation"] },
  { label: "پیشنهادها", href: "/dashboard/lawyer#offers", icon: "mail", match: [] },
  { label: "یادآور", href: "/dashboard/lawyer#reminders", icon: "clock", match: [] },
];

export function BottomNav() {
  const t = useT();
  const pathname = usePathname();
  const [isLawyer, setIsLawyer] = useState(false);

  // نقش کاربر — فقط یک بار بعد از mount؛ SSR همان تب‌های عمومی را می‌دهد (بدون mismatch)
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d?.ok && (d.user?.role === "lawyer" || d.user?.role === "team")) setIsLawyer(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const tabs = isLawyer ? LAWYER_TABS : TABS;

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
      aria-label={t("ناوبری اصلی موبایل")}
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center lg:hidden"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
        paddingLeft: "16px",
        paddingRight: "16px",
      }}
    >
      {/* کانتینر بیضی شناور */}
      <div
        className="relative flex w-full max-w-md items-center justify-around overflow-visible"
        style={{
          height: "64px",
          borderRadius: "9999px",
          backgroundColor: "color-mix(in oklab, var(--surface) 92%, transparent)",
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          boxShadow:
            "0 8px 32px -8px rgb(0 0 0 / 0.28), 0 2px 8px -4px rgb(0 0 0 / 0.12), inset 0 1px 0 0 rgb(255 255 255 / 0.08)",
          border: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
          padding: "0 8px",
        }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          if (tab.center) {
            // تب وسط — FAB بزرگ با gradient طلایی
            return (
              <Link
                key={tab.label}
                href={tab.href}
                aria-label={t(tab.label)}
                aria-current={active ? "page" : undefined}
                className="group flex flex-col items-center"
                style={{ marginTop: "-22px" }}
              >
                <span
                  className="flex items-center justify-center transition-transform duration-300 group-active:scale-90"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "9999px",
                    background: active
                      ? "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)"
                      : "linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)",
                    boxShadow: active
                      ? "0 8px 20px -6px color-mix(in oklab, var(--primary) 50%, transparent), 0 0 0 4px color-mix(in oklab, var(--primary) 15%, transparent)"
                      : "0 8px 20px -6px color-mix(in oklab, var(--accent) 50%, transparent), 0 0 0 4px color-mix(in oklab, var(--accent) 15%, transparent)",
                    color: active ? "var(--primary-foreground)" : "var(--accent-foreground)",
                  }}
                >
                  <Icon name={tab.icon} className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <span
                  className="mt-1 text-[10px] font-bold transition-colors"
                  style={{ color: active ? "var(--primary)" : "var(--accent)" }}
                >
                  {t(tab.label)}
                </span>
              </Link>
            );
          }
          // تب‌های معمولی — با active indicator dot
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-label={t(tab.label)}
              aria-current={active ? "page" : undefined}
              className="group flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-transform duration-200 active:scale-90"
            >
              <span
                className="flex items-center justify-center transition-all duration-300"
                style={{
                  width: "38px",
                  height: "32px",
                  borderRadius: "9999px",
                  backgroundColor: active
                    ? "color-mix(in oklab, var(--primary) 12%, transparent)"
                    : "transparent",
                }}
              >
                <Icon
                  name={tab.icon}
                  className="h-5 w-5 transition-colors"
                  strokeWidth={active ? 2.4 : 1.7}
                  style={{
                    color: active ? "var(--primary)" : "var(--muted-soft)",
                  }}
                />
              </span>
              <span
                className="text-[10px] leading-none transition-colors"
                style={{
                  color: active ? "var(--primary)" : "var(--muted-soft)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {t(tab.label)}
              </span>
              {/* active indicator dot */}
              <span
                className="h-1 w-1 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: active ? "var(--primary)" : "transparent",
                  opacity: active ? 1 : 0,
                }}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
