"use client";

import { useMemo } from "react";
import { INTERNAL_LINK_MAP } from "@/lib/keywords";
import { useT } from "@/lib/i18n/provider";

/**
 * Internal Linking خودکار — یک بلوک «لینک‌های مرتبط» تولید می‌کند.
 *
 * این کامپوننت بر اساس مسیر فعلی، لینک‌های داخلی مرتبط را به‌صورت
 * contextual suggestions نمایش می‌دهد. این کار هم SEO را تقویت می‌کند
 * (PageRank distribution) و هم UX را بهبود می‌بخشد (کشف محتوای مرتبط).
 */

interface LinkItem {
  anchor: string;
  href: string;
  group?: string;
}

/** گروه‌بندی لینک‌ها برای نمایش بهتر. */
function groupLinks(links: LinkItem[]): { title: string; items: LinkItem[] }[] {
  const groups: Record<string, LinkItem[]> = {};
  for (const link of links) {
    const g = link.group || "لینک‌های مرتبط";
    if (!groups[g]) groups[g] = [];
    groups[g].push(link);
  }
  return Object.entries(groups).map(([title, items]) => ({ title, items }));
}

function inferGroup(href: string): string {
  if (href.startsWith("/lawyers")) return "وکیل‌یابی";
  if (href.startsWith("/consultation")) return "مشاوره";
  if (href.startsWith("/contracts")) return "قراردادها";
  if (href.startsWith("/services")) return "خدمات";
  if (href.startsWith("/knowledge")) return "پایگاه دانش";
  if (href.startsWith("/laws") || href.startsWith("/judgments") || href.startsWith("/glossary")) return "منابع حقوقی";
  if (href.startsWith("/ai-assistant")) return "هوش مصنوعی";
  if (href.startsWith("/business")) return "کسب‌وکار";
  return "لینک‌های مرتبط";
}

export function RelatedLinks({ pathname }: { pathname: string }) {
  const t = useT();
  const links = useMemo<LinkItem[]>(() => {
    const matches = INTERNAL_LINK_MAP.filter((l) => l.from === pathname);
    // برای مسیرهای داینامیک (مثل /lawyers/[slug])، تطبیق prefix
    const dynamicMatches = INTERNAL_LINK_MAP.filter((l) => {
      if (!l.from.includes("[")) return false;
      const base = l.from.replace(/\[.*?\].*$/, "");
      return pathname.startsWith(base) && !matches.find((m) => m.to === l.to);
    });
    const all = [...matches, ...dynamicMatches].map((l) => ({
      anchor: l.anchor,
      href: l.to,
      group: inferGroup(l.to),
    }));
    // حذف تکرارها
    const seen = new Set<string>();
    return all.filter((l) => {
      if (seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    });
  }, [pathname]);

  if (links.length === 0) return null;

  const groups = groupLinks(links);

  return (
    <nav aria-label={t("لینک‌های مرتبط")} className="mt-12 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-base font-bold text-foreground sm:text-lg">{t("صفحات مرتبط")}</h2>
      <p className="mt-1 text-xs text-muted">
        {t("برای رفتن به بخش‌های مرتبط، روی لینک‌های زیر کلیک کنید.")}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-accent-text">{t(group.title)}</h3>
            <ul className="space-y-1.5">
              {group.items.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href.startsWith("http") ? link.href : link.href}
                    className="inline-flex items-center gap-1.5 text-sm text-foreground-soft transition-colors hover:text-primary"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-accent-text" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {link.anchor}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
