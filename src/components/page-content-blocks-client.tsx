"use client";

import { useEffect, useState } from "react";
import { Container, Card, Button } from "@/components/ui";
import { useT } from "@/lib/i18n/provider";

/**
 * نسخهٔ کلاینت بلوک‌های محتوایی CMS — برای صفحات «use client» (مثل /contact)
 * که کامپوننت سرور PageContentBlocks را نمی‌پذیرند.
 * داده از GET /api/site-content?page=… می‌آید (فقط بلوک‌های فعال).
 * امنیت: متن‌ها متن ساده رندر می‌شوند (بدون dangerouslySetInnerHTML) — ضد XSS.
 */
type Block = {
  id: number;
  kind: string;
  section: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string | null;
  link: string | null;
  linkLabel: string | null;
};

export function PageContentBlocksClient({ page, position = "top", className = "" }: { page: string; position?: "top" | "bottom"; className?: string }) {
  const t = useT();
  const [blocks, setBlocks] = useState<Block[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/site-content?page=${encodeURIComponent(page)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const all: Block[] = d.ok ? d.blocks : [];
        setBlocks(all.filter((b) => (position === "bottom" ? (b.section || "").trim().toLowerCase() === "bottom" : (b.section || "").trim().toLowerCase() !== "bottom")));
      })
      .catch(() => { if (alive) setBlocks([]); });
    return () => { alive = false; };
  }, [page, position]);

  if (!blocks || blocks.length === 0) return null;

  return (
    <Container className={position === "top" ? `py-6 ${className}` : `py-10 ${className}`} data-testid={`page-content-${page}-${position}`}>
      <div className="flex flex-col gap-4">
        {blocks.map((b) => {
          if (b.kind === "announcement") {
            return (
              <div key={b.id} className="flex flex-col gap-2 rounded-2xl border border-accent/40 bg-accent-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {b.title && <p className="text-sm font-black text-accent-text">{b.title}</p>}
                  {b.subtitle && <p className="mt-0.5 text-xs font-medium text-accent-text/80">{b.subtitle}</p>}
                  {b.body && <p className="mt-1 whitespace-pre-line text-sm leading-7 text-foreground-soft">{b.body}</p>}
                </div>
                {b.link && (
                  <Button href={b.link} size="sm" variant="accent" icon="arrow" className="shrink-0">
                    {b.linkLabel || t("مشاهده")}
                  </Button>
                )}
              </div>
            );
          }
          return (
            <Card key={b.id} hover={false}>
              {b.imageUrl && (
                <div className="mb-3 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element -- رسانهٔ همان دامنه از پنل ادمین */}
                  <img src={b.imageUrl} alt={b.title || t("تصویر")} className="h-auto max-h-96 w-full object-cover" loading="lazy" />
                </div>
              )}
              {b.title && <h2 className="text-base font-black text-foreground">{b.title}</h2>}
              {b.subtitle && <p className="mt-0.5 text-sm font-bold text-primary">{b.subtitle}</p>}
              {b.body && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground-soft">{b.body}</p>}
              {b.link && (
                <div className="mt-3">
                  <Button href={b.link} size="sm" variant="soft" icon="arrow">
                    {b.linkLabel || t("مشاهده")}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
