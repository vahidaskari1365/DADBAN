"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { faNum, relativeTime } from "@/lib/data";

export interface KnowledgeItem {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  author: string;
  readTime: number;
  views: number;
  publishedAt: string | Date;
}

/** نرمال‌سازی متن فارسی برای جستجو: یکسان‌سازی ی/ک عربی، حذف نیم‌فاصله و اعراب */
function normalizeFa(s: string): string {
  return s
    .replace(/[\u064A\u0649]/g, "ی")
    .replace(/[\u0643]/g, "ک")
    .replace(/[\u0622\u0623\u0625]/g, "ا")
    .replace(/[\u0624]/g, "و")
    .replace(/[\u0626]/g, "ی")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u200c\u0640]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function KnowledgeSearch({ items }: { items: KnowledgeItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))),
    [items],
  );

  const filtered = useMemo(() => {
    const q = normalizeFa(query);
    return items.filter((a) => {
      if (category && a.category !== category) return false;
      if (!q) return true;
      const hay = normalizeFa(`${a.title} ${a.excerpt} ${a.category} ${a.author}`);
      return q.split(" ").every((w) => hay.includes(w));
    });
  }, [items, query, category]);

  return (
    <div>
      {/* باکس جستجو + فیلتر دسته‌بندی */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Icon
            name="search"
            className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="جستجوی مقاله بر اساس موضوع"
            placeholder="موضوع موردنظر را جستجو کنید؛ مثلاً مهریه، چک برگشتی، تقسیم ارث…"
            className="w-full rounded-2xl border border-border-strong bg-surface py-3.5 pl-4 pr-12 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="پاک کردن جستجو"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              category === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground-soft hover:border-primary/40"
            }`}
          >
            همه
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(category === c ? null : c)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground-soft hover:border-primary/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* نتیجه */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-surface p-10 text-center">
          <Icon name="search" className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm font-bold text-foreground">موردی یافت نشد</p>
          <p className="mt-1 text-xs text-muted">
            با عبارت دیگری جستجو کنید یا فیلتر دسته‌بندی را بردارید.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted" aria-live="polite">
            {faNum(filtered.length)} مقاله {query || category ? "یافت شد" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((a) => (
              <a
                key={a.slug}
                href={`/knowledge/${a.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-center gap-2 text-xs text-accent-text">
                  <Icon name="book" className="h-3.5 w-3.5" /> {a.category}
                </div>
                <h3 className="mt-2 flex-1 text-base font-bold leading-7 text-foreground">{a.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{a.excerpt}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="user" className="h-3.5 w-3.5" /> {a.author}
                  </span>
                  <span>{relativeTime(a.publishedAt)}</span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
