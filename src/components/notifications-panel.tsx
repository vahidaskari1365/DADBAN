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
 *
 * تحویل زنده با SSE (/api/notifications/stream):
 *  event notification → پیش‌گویی ردیف تازه | event unread → badge دقیق
 *  خطای اتصال → بازگشت شفاف به polling ۳۰ ثانیه‌ای (و تلاش مجدد SSE پس از ۶۰ ثانیه)
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
  const [unreadN, setUnreadN] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (d?.ok) {
          setItems(d.items as NotifItem[]);
          setUnreadN(Number(d.unread ?? 0));
        } else {
          setItems([]);
        }
      })
      .catch(() => setItems([]));
  }, []);

  /* SSE زنده + fallback شفاف به polling قدیمی (۳۰ ثانیه) */
  useEffect(() => {
    load();
    let es: EventSource | null = null;
    let pollIv: ReturnType<typeof setInterval> | null = null;
    let retryT: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const startPolling = () => {
      if (disposed || pollIv) return;
      setLive(false);
      pollIv = setInterval(load, 30_000);
    };
    const stopPolling = () => {
      if (pollIv) {
        clearInterval(pollIv);
        pollIv = null;
      }
    };
    const startSse = () => {
      if (disposed) return;
      try {
        es = new EventSource("/api/notifications/stream");
      } catch {
        startPolling();
        return;
      }
      es.addEventListener("notification", (ev) => {
        try {
          const row = JSON.parse((ev as MessageEvent<string>).data) as NotifItem;
          if (!row || typeof row.id !== "number") return;
          setItems((prev) => {
            const base = prev ?? [];
            if (base.some((n) => n.id === row.id)) return base;
            return [row, ...base].slice(0, 20);
          });
          if (row.read === false) setUnreadN((n) => (n == null ? null : n + 1));
        } catch {
          /* ردیف نامعتبر — نادیده */
        }
      });
      es.addEventListener("unread", (ev) => {
        try {
          const d = JSON.parse((ev as MessageEvent<string>).data) as { n?: number };
          if (typeof d?.n === "number") setUnreadN(d.n);
        } catch {
          /* نادیده */
        }
      });
      es.onopen = () => {
        if (!disposed) {
          setLive(true);
          stopPolling();
        }
      };
      es.onerror = () => {
        // CLOSED → خطای قطعی (مثلاً 401/429) → polling + تلاش مجدد SSE بعداً
        // CONNECTING → مرورگر خودش reconnect می‌کند؛ دست نمی‌زنیم
        if (es && es.readyState === EventSource.CLOSED) {
          es = null;
          startPolling();
          retryT = setTimeout(() => {
            if (disposed) return;
            stopPolling();
            startSse();
          }, 60_000);
        }
      };
    };

    startSse();
    return () => {
      disposed = true;
      es?.close();
      stopPolling();
      if (retryT) clearTimeout(retryT);
    };
  }, [load]);

  const unreadCount = unreadN ?? (items ?? []).filter((n) => !n.read).length;

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
          {live && (
            <span
              data-testid="notif-live"
              title={t("اعلان‌ها به‌صورت زنده دریافت می‌شوند")}
              className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)] px-2 py-0.5 text-[10px] font-bold text-success"
            >
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              {t("زنده")}
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
