"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { relativeTimeJalali } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * کارت «اعلان‌ها» پنل‌های موکل و وکیل — فرآیند بازار پرونده‌ها:
 *  • وکیل: «پروندهٔ جدید در استان شما ثبت شد» → برد بازار (/case-board)
 *  • موکل: «پیشنهاد جدیدی برای پروندهٔ شما ثبت شد» → مقایسهٔ پیشنهادها
 *  • وکیل: «موکل پیشنهاد شما را پذیرفت» → کارتابل پیشنهادها
 * عنوان/متن با t() و meta به زبان انتخابی کاربر رندر می‌شود؛ کلیک = خوانده‌شدن + پرش.
 */

interface NotifItem {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  meta: { subject?: string; city?: string; lawyer?: string; price?: number; caseNumber?: string } | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, "folder" | "mail" | "check"> = {
  new_case: "folder",
  new_offer: "mail",
  offer_accepted: "check",
};

const TYPE_TONE: Record<string, string> = {
  new_case: "bg-primary-soft text-primary",
  new_offer: "bg-accent-soft text-accent-text",
  offer_accepted: "bg-success/15 text-success",
};

export function NotificationsPanel() {
  const t = useT();
  const tf = templateT(t);
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (d?.ok) setItems(d.items as NotifItem[]);
        else setItems([]);
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  const unreadCount = (items ?? []).filter((n) => !n.read).length;

  const markRead = useCallback(
    (ids: number[]) => {
      if (!ids.length) return;
      setBusy(true);
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
        .then(() => load())
        .catch(() => {})
        .finally(() => setBusy(false));
    },
    [load],
  );

  const markAll = useCallback(() => {
    setBusy(true);
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    })
      .then(() => load())
      .catch(() => {})
      .finally(() => setBusy(false));
  }, [load]);

  /** متن محلی‌شدهٔ یک اعلان بر اساس نوع + meta */
  const render = (n: NotifItem): { title: string; sub: string } => {
    const m = n.meta ?? {};
    if (n.type === "new_case") {
      return {
        title: t("پروندهٔ جدید در استان شما ثبت شد"),
        sub: tf("موضوع: «{subject}» — در انتظار پیشنهاد قیمت شماست", { subject: m.subject ?? "" }),
      };
    }
    if (n.type === "new_offer") {
      const price = m.price ? ` • ${faNum(Number(m.price).toLocaleString("en-US"))} ${t("تومان")}` : "";
      return {
        title: t("پیشنهاد جدیدی برای پروندهٔ شما ثبت شد"),
        sub: tf("وکیل «{lawyer}» برای «{subject}» پیشنهاد قیمت داد", { lawyer: m.lawyer ?? "", subject: m.subject ?? "" }) + price,
      };
    }
    if (n.type === "offer_accepted") {
      return {
        title: t("موکل پیشنهاد شما را پذیرفت"),
        sub: tf("پروندهٔ «{subject}» به شما واگذار شد — گفتگوی رایگان فعال است", { subject: m.subject ?? "" }),
      };
    }
    return { title: n.title, sub: n.body };
  };

  /* تا اولین بارگذاری، فضای کارت با اسکلت حفظ می‌شود */
  if (items === null) {
    return (
      <Card hover={false}>
        <div className="flex items-center gap-2">
          <Icon name="mail" className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground">{t("اعلان‌ها")}</h2>
        </div>
        <div className="mt-4 space-y-2" aria-busy="true">
          <div className="h-14 animate-pulse rounded-xl bg-surface-2" />
          <div className="h-14 animate-pulse rounded-xl bg-surface-2" />
        </div>
      </Card>
    );
  }

  if (!items.length) return null;

  return (
    <Card hover={false} data-testid="notifications-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="mail" className="h-5 w-5 text-primary" />
          {t("اعلان‌ها")}
          {unreadCount > 0 && (
            <span data-testid="notif-unread-badge" className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-text">
              {faNum(unreadCount)}
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAll}
            disabled={busy}
            className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-soft/70 disabled:opacity-50"
          >
            {t("همه خوانده شد")}
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((n) => {
          const { title, sub } = render(n);
          return (
            <li key={n.id}>
              <button
                type="button"
                data-testid="notif-item"
                onClick={() => {
                  if (!n.read) markRead([n.id]);
                  if (n.link) router.push(n.link);
                }}
                className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-right transition-colors ${
                  n.read ? "border-border bg-surface" : "border-primary/25 bg-primary-soft/30 hover:border-primary/40"
                }`}
              >
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TYPE_TONE[n.type] ?? "bg-surface-2 text-foreground-soft"}`}>
                  <Icon name={TYPE_ICON[n.type] ?? "mail"} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${n.read ? "font-medium text-foreground-soft" : "font-bold text-foreground"}`}>{title}</span>
                    <span className="shrink-0 text-[10px] text-muted">{relativeTimeJalali(n.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-6 text-muted">{sub}</span>
                </span>
                {!n.read && <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
