"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import LogoutButton from "@/components/admin/logout-button";
import { useT } from "@/lib/i18n/provider";
import type { AdminMenuGroup, AdminMenuGroupKey } from "@/components/admin/nav-config";

/** آیتم منوی شِل — بدون کلید دسترسی (فیلتر سمت سرور انجام شده) */
export interface ShellNavItem {
  label: string;
  href: string;
  icon: AdminMenuItemIcon;
  group: AdminMenuGroupKey;
}
type AdminMenuItemIcon = Parameters<typeof Icon>[0]["name"];

/**
 * شِل مشترک پنل ادمین — سایدبار پایدار دسکتاپ (سمت راست در RTL) + کشوی منو در موبایل.
 *
 * - روی /admin/login رندر نمی‌شود (فقط children).
 * - آیتم فعال با usePathname هایلایت می‌شود.
 * - آیتم‌ها قبلاً سمت سرور بر اساس دسترسی فیلتر شده‌اند.
 */

const DASHBOARD_HREF = "/admin";

/* پالت ثابت سایدبار — مستقل از تم (در تیره --primary آبی روشن می‌شود و متن سفید ناخوانا می‌شد) */
const SIDEBAR_BG = "bg-[#15365d]";
const ACTIVE_TEXT = "text-[#eec97b]";

function isActive(pathname: string, href: string): boolean {
  if (href === DASHBOARD_HREF) return pathname === DASHBOARD_HREF;
  if (href === "/") return false;
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarBody({
  groups,
  items,
  userName,
  role,
  onNavigate,
  compactHeader,
}: {
  groups: AdminMenuGroup[];
  items: ShellNavItem[];
  userName: string;
  role: string;
  onNavigate?: () => void;
  compactHeader?: boolean;
}) {
  const t = useT();
  const pathname = usePathname();
  /* داشبورد همیشه اول سایدبار — بقیه آیتم‌ها گروه‌بندی‌شده */
  const dashItem = items.find((m) => m.href === DASHBOARD_HREF);
  const restItems = items.filter((m) => m.href !== DASHBOARD_HREF);

  const navLink = (m: ShellNavItem, extraCls = "") => {
    const active = isActive(pathname, m.href);
    return (
      <Link
        key={m.label + m.href}
        href={m.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-bold transition-colors ${extraCls} ${
          active
            ? `border-r-2 border-accent bg-white/10 ${ACTIVE_TEXT}`
            : "border-r-2 border-transparent text-white/75 hover:bg-white/5 hover:text-white"
        }`}
        data-testid={active ? "admin-nav-active" : undefined}
      >
        <Icon name={m.icon} className="h-4 w-4 shrink-0" />
        <span className="truncate">{t(m.label)}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col" data-testid="admin-sidebar-body">
      {!compactHeader && (
        <div className="border-b border-white/10 px-4 py-4">
          <p className="flex items-center gap-2 text-sm font-black text-white">
            <Icon name="shield" className="h-4 w-4 text-accent" />
            {t("پنل مدیریت دادورزان")}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-white/60">
            <Icon name="user" className="h-3 w-3" />
            {userName} — {role}
          </p>
        </div>
      )}

      <nav className="nice-scroll flex-1 overflow-y-auto px-3 py-4" aria-label={t("منوی مدیریت")}>
        {dashItem && <ul className="mb-4"><li>{navLink(dashItem)}</li></ul>}
        {groups.map((g) => {
          const groupItems = restItems.filter((m) => m.group === g.key);
          if (groupItems.length === 0) return null;
          return (
            <div key={g.key} className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-black tracking-wide text-white/40">
                {t(g.label)}
              </p>
              <ul className="space-y-0.5">{groupItems.map((m) => <li key={m.label + m.href}>{navLink(m)}</li>)}</ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-bold text-white/75 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Icon name="globe" className="h-4 w-4 shrink-0" />
          {t("مشاهده سایت")}
        </Link>
        <div className="mt-1 px-1">
          <LogoutButton className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-bold text-white/75 transition-colors hover:bg-white/5 hover:text-white" />
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({
  groups,
  items,
  userName,
  role,
  children,
}: {
  groups: AdminMenuGroup[];
  items: ShellNavItem[];
  userName: string;
  role: string;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* بستن کشو با Escape — قبل از early-return تا ترتیب هوک‌ها ثابت بماند */
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  /* صفحهٔ ورود بدون شِل */
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <>
      {/* سایدبار دسکتاپ — ثابت در سمت راست، زیر هدر عمومی (h-18 = 72px) */}
      <aside
        className={`fixed bottom-0 right-0 top-[72px] z-40 hidden w-60 border-l border-border ${SIDEBAR_BG} lg:block`}
        data-testid="admin-sidebar"
      >
        <SidebarBody groups={groups} items={items} userName={userName} role={role} />
      </aside>

      {/* محتوای صفحه — در دسکتاپ کنار سایدبار */}
      <div className="lg:pr-60">{children}</div>

      {/* دکمه شناور منو — موبایل/تبلت */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label={t("منوی پنل مدیریت")}
        aria-expanded={drawerOpen}
        className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#15365d] px-4 text-xs font-black text-white shadow-[var(--shadow-lift)] transition-transform hover:scale-105 lg:hidden"
        data-testid="admin-menu-fab"
      >
        <Icon name="menu" className="h-4 w-4 text-accent" />
        {t("منوی پنل")}
      </button>

      {/* کشوی منو — موبایل/تبلت */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label={t("منوی پنل مدیریت")}>
          <button
            type="button"
            aria-label={t("بستن منو")}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className={`absolute bottom-0 right-0 top-0 w-72 max-w-[85vw] ${SIDEBAR_BG} shadow-2xl`}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-black text-white">{t("پنل مدیریت")}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("بستن منو")}
                className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <SidebarBody
              groups={groups}
              items={items}
              userName={userName}
              role={role}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
