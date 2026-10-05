"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { ROLE_FA, panelHomeForRole } from "@/lib/roles";
import type { IconKey } from "@/lib/data";

/**
 * منوی اکانت هدر — جایگزین دکمهٔ «ورود» برای کاربر واردشده.
 * آیکون آواتار با حرف اول نام؛ با هاور (دسکتاپ) یا کلیک (موبایل/کیبورد)
 * یک منوی کشویی باز می‌شود: داشبورد، پروفایل، پشتیبانی، خروج.
 * نقش‌محور است: مقصد داشبورد و پروفایل بر اساس role انتخاب می‌شود.
 */

export type MeUser = {
  id: number;
  name: string;
  phone?: string;
  role?: string;
  avatarColor?: string | null;
};

const initial = (name: string) => name.trim().charAt(0) || "؟";

/** آیتم منو — در سطح ماژول تعریف شده (اجازهٔ ساخت کامپوننت حین رندر نیست) */
function MenuItem({
  href,
  icon,
  label,
  testid,
  danger,
  onNavigate,
}: {
  href: string;
  icon: IconKey;
  label: string;
  testid?: string;
  danger?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      data-testid={testid}
      role="menuitem"
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        danger ? "text-danger hover:bg-danger/10" : "text-foreground-soft hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${danger ? "bg-danger/10 text-danger" : "bg-primary-soft text-primary"}`}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

export function AccountMenu({ user, loaded }: { user: MeUser | null; loaded: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedAt = useRef(0);

  // بستن با تغییر مسیر — الگوی «تنظیم state در حین رندر» با ردیابی مقدار قبلی
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  // هنوز نمی‌دانیم — لینک ورود خنثی تا رفع فلش
  if (!loaded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-foreground-soft" aria-hidden>
        <Icon name="user" className="h-4 w-4" />
        ورود
      </span>
    );
  }

  // مهمان — دکمهٔ ورود
  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground-soft transition-colors hover:bg-surface-2 hover:text-foreground"
        data-testid="header-login"
      >
        <Icon name="user" className="h-4 w-4" />
        ورود
      </Link>
    );
  }

  const color = user.avatarColor || "#15365d";
  const dashboardHref = panelHomeForRole(user.role);
  const isLawyer = user.role === "lawyer";
  const isTeam = user.role === "team";
  const profileHref =
    user.role === "client" ? "/dashboard/client/profile" : isLawyer ? "/dashboard/lawyer/profile" : null;
  const closeMenu = () => setOpen(false);

  const logout = async () => {
    setOpen(false);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.assign("/login");
  };

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    hoverOpenedAt.current = Date.now();
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };
  /** کلیک روی تریگر: اگر هاور همین حالا باز کرده، باز بماند؛ وگرنه toggle */
  const toggleFromClick = () => {
    if (open && Date.now() - hoverOpenedAt.current < 500) return;
    setOpen((v) => !v);
  };

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleFromClick}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`حساب کاربری — ${user.name}`}
        data-testid="account-trigger"
        className="group flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-3 pr-1 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.98]"
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-sm ring-2 ring-background"
          style={{ backgroundColor: color }}
          aria-hidden
        >
          {initial(user.name)}
        </span>
        <Icon name="chevron" className={`h-3.5 w-3.5 rotate-90 text-muted transition-transform duration-200 ${open ? "rotate-[-90deg]" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="منوی حساب کاربری"
          data-testid="account-menu"
          className="absolute left-0 top-full z-[80] w-64 animate-scale-in pt-2"
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-surface p-2 shadow-[var(--shadow-lift)]">
            {/* سربرگ — مشخصات کاربر */}
            <div className="mb-1 flex items-center gap-3 rounded-xl bg-surface-2/70 px-3 py-2.5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white shadow-sm"
                style={{ backgroundColor: color }}
                aria-hidden
              >
                {initial(user.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">{user.name}</span>
                <span className="block text-[11px] text-muted">{ROLE_FA[user.role ?? "client"] ?? "کاربر"}</span>
              </span>
            </div>

            <MenuItem
              href={dashboardHref}
              icon="home"
              label={isLawyer ? "پنل وکیل" : isTeam ? "پنل همکاران" : "داشبورد موکل"}
              testid="account-dashboard"
              onNavigate={closeMenu}
            />
            {profileHref && (
              <MenuItem href={profileHref} icon="badge" label="پروفایل من" testid="account-profile" onNavigate={closeMenu} />
            )}
            <MenuItem href="/track-case" icon="clock" label="پیگیری پرونده" testid="account-track" onNavigate={closeMenu} />
            <MenuItem href="/support" icon="shield" label="پشتیبانی" testid="account-support" onNavigate={closeMenu} />
            <div className="my-1 h-px bg-border" aria-hidden />
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              data-testid="account-logout"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <Icon name="x" className="h-4 w-4" />
              </span>
              خروج از حساب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
