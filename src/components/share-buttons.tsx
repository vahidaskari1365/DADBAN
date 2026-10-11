"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/** دکمه‌های اشتراک‌گذاری مقاله — پیام‌رسان‌های داخلی + کپی لینک (تشویق بک‌لینک طبیعی) */
export function ShareButtons({ title, path }: { title: string; path: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const enc = encodeURIComponent(`${title} — ${url}`);

  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
  const whatsapp = `https://wa.me/?text=${enc}`;
  const x = `https://twitter.com/intent/tweet?text=${enc}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard ناموجود */
    }
  };

  const cls =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-foreground-soft transition-all hover:border-primary/40 hover:bg-primary-soft hover:text-primary";
  const label = (s: string) => <span className="sr-only">{s}</span>;

  return (
    <div className="flex items-center gap-2" aria-label={t("اشتراک‌گذاری مقاله")}>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Icon name="share" className="h-4 w-4" /> {t("اشتراک‌گذاری:")}
      </span>
      <a href={telegram} target="_blank" rel="noopener noreferrer" className={cls}>{label(t("اشتراک در تلگرام"))}<Icon name="send" className="h-4 w-4" /></a>
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cls}>{label(t("اشتراک در واتساپ"))}<Icon name="chat" className="h-4 w-4" /></a>
      <a href={x} target="_blank" rel="noopener noreferrer" className={cls}>{label(t("اشتراک در ایکس"))}<Icon name="quote" className="h-4 w-4" /></a>
      <button type="button" onClick={copy} className={cls} aria-live="polite">{label(t("کپی لینک"))}<Icon name={copied ? "check" : "link"} className="h-4 w-4" /></button>
      {copied && <span className="text-xs font-semibold text-primary">{t("کپی شد ✓")}</span>}
    </div>
  );
}
