"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import LogoutButton from "@/components/admin/logout-button";
import { useT } from "@/lib/i18n/provider";
import { faNum } from "@/lib/data";
import type { AdminMenuGroup, AdminMenuGroupKey } from "@/components/admin/nav-config";

/** آیتم منوی شِل — بدون کلید دسترسی (فیلتر سمت سرور انجام شده) */
export interface ShellNavItem {
  label: string;
  href: string;
  icon: AdminMenuItemIcon;
  group: AdminMenuGroupKey;
}
type AdminMenuItemIcon = Parameters<typeof Icon>[0]["name"];

/** شمارش‌های «نیازمند اقدام» — از /api/admin/counts؛ کلیدها href نسبی بخش مربوطه */
export type PendingCounts = Record<string, number>;

/** نگاشت href بخش → کلید شمارش API counts */
const COUNT_KEY_BY_HREF: Record<string, string> = {
  "/admin/verifications": "verifications",
  "/admin/onboarding": "onboarding",
  "/admin/tickets": "tickets",
  "/admin/qa-submissions": "qa",
  "/admin/errors": "errors",
};

const DASHBOARD_HREF = "/admin";

/* پالت ثابت سایدبار — مستقل از تم (در تیره --primary آبی روشن می‌شود و متن سفید ناخوانا می‌شد) */
const SIDEBAR_BG = "bg-[#15365d]";
const ACTIVE_TEXT = "text-[#eec97b]";

function isActive(pathname: string, href: string): boolean {
  if (href === DASHBOARD_HREF) return pathname === DASHBOARD_HREF;
  if (href === "/") return false;
  return pathname === href || pathname.startsWith(href + "/");
}

/** بج شمارش در انتظار — فقط وقتی بیشتر از صفر است؛ سقف نمایش ۹۹+ */
function PendingBadge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null;
  const label = count > 99 ? `${faNum(99)}+` : faNum(count);
  return (
    <span
      className={`ms-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10px] font-black leading-none ${
        active ? "bg-accent text-[#15365d]" : "bg-accent/90 text-[#15365d]"
      }`}
      data-testid="admin-nav-badge"
      aria-label={`${label} مورد در انتظار`}
    >
      {label}
    </span>
  );
}

function SidebarBody({
  groups,
  items,
  userName,
  role,
  counts,
  onNavigate,
  compactHeader,
}: {
  groups: AdminMenuGroup[];
  items: ShellNavItem[];
  userName: string;
  role: string;
  counts: PendingCounts;
  onNavigate?: () => void;
  compactHeader?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  /* داشبورد همیشه اول سایدبار — بقیه آیتم‌ها گروه‌بندی‌شده */
  const dashItem = items.find((m) => m.href === DASHBOARD_HREF);
  const restItems = items.filter((m) => m.href !== DASHBOARD_HREF);

  /** فیلتر جست‌وجو — تطابق برچسب یا مسیر؛ «مقاله» → «مدیریت مقالات» را می‌آورد */
  const matchesQuery = useCallback(
    (m: ShellNavItem) => {
      const term = query.trim().toLowerCase();
      if (!term) return true;
      return m.label.toLowerCase().includes(term) || m.href.toLowerCase().includes(term);
    },
    [query],
  );

  const navLink = (m: ShellNavItem, extraCls = "") => {
    const active = isActive(pathname, m.href);
    const countKey = COUNT_KEY_BY_HREF[m.href];
    const pending = countKey ? (counts[countKey] ?? 0) : 0;
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
        {pending > 0 && <PendingBadge count={pending} active={active} />}
      </Link>
    );
  };

  /* آیتم اولِ نتیجهٔ جست‌وجو — Enter مستقیم به همان صفحه می‌رود */
  const firstMatch = useMemo(() => {
    if (!searching) return null;
    if (dashItem && matchesQuery(dashItem)) return dashItem;
    return restItems.find(matchesQuery) ?? null;
  }, [searching, dashItem, restItems, matchesQuery]);

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

      {/* جست‌وجوی منو — با ۳۵ بخش، یافتن سریع صفحه بدون اسکرول */}
      <div className="border-b border-white/10 px-3 py-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && firstMatch) {
                setQuery("");
                onNavigate?.();
                router.push(firstMatch.href);
              }
            }}
            placeholder={t("جست‌وجوی منو…")}
            aria-label={t("جست‌وجو در منوی مدیریت")}
            data-testid="admin-nav-search"
            className="h-9 w-full rounded-lg border border-white/15 bg-white/10 pr-8 pl-8 text-xs font-bold text-white placeholder:text-white/40 focus:border-accent/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("پاک‌کردن جست‌وجو")}
              className="absolute left-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <nav className="nice-scroll flex-1 overflow-y-auto px-3 py-4" aria-label={t("منوی مدیریت")}>
        {dashItem && (matchesQuery(dashItem) || !searching) && <ul className="mb-4"><li>{navLink(dashItem)}</li></ul>}
        {groups.map((g) => {
          const groupItems = restItems.filter((m) => m.group === g.key && matchesQuery(m));
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
        {searching && !firstMatch && dashItem && !matchesQuery(dashItem) && (
          <p className="px-2 py-6 text-center text-xs font-bold text-white/50" data-testid="admin-nav-search-empty">
            {t("بخشی با این نام یافت نشد")}
          </p>
        )}
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
  const [counts, setCounts] = useState<PendingCounts>({});

  /* صفحهٔ ورود بدون شِل — قبل از هر هوک دیگری early-return نباید ترتیب هوک‌ها را بشکند */
  const isLoginPage = pathname === "/admin/login";

  /* واکشی شمارش‌های «در انتظار» برای بج‌های منو — هر ۶۰ ثانیه */
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/counts", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && data.counts) {
        setCounts({
          verifications: Number(data.counts.verifications) || 0,
          onboarding: Number(data.counts.onboarding) || 0,
          tickets: Number(data.counts.tickets) || 0,
          qa: Number(data.counts.qa) || 0,
          errors: Number(data.counts.errors) || 0,
        });
      }
    } catch {
      /* بی‌صدا — بج‌ها حیاتی نیستند */
    }
  }, []);

  useEffect(() => {
    if (isLoginPage) return;
    /* واکشی اولیه با setTimeout — setState مستقیم در بدنهٔ افکت ممنوع است (react-hooks/set-state-in-effect) */
    const initial = window.setTimeout(fetchCounts, 0);
    const timer = window.setInterval(fetchCounts, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [isLoginPage, fetchCounts]);

  /* بستن کشو با Escape */
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      {/* سایدبار دسکتاپ — ثابت در سمت راست، زیر هدر عمومی (h-18 = 72px) */}
      <aside
        className={`fixed bottom-0 right-0 top-[72px] z-40 hidden w-60 border-l border-border ${SIDEBAR_BG} lg:block`}
        data-testid="admin-sidebar"
      >
        <SidebarBody groups={groups} items={items} userName={userName} role={role} counts={counts} />
      </aside>

      {/* محتوای صفحه — در دسکتاپ کنار سایدبار */}
      <div className="lg:pr-60">{children}</div>

      {/* دکمه شناور منو — موبایل/تبلت */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label={t("منوی پنل مدیریت")}
        aria-expanded={drawerOpen}
        className="fixed bottom-24 right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-[#15365d] px-4 text-xs font-black text-white shadow-[var(--shadow-lift)] transition-transform hover:scale-105 lg:hidden"
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
              counts={counts}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
