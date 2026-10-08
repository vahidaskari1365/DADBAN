import type { Metadata } from "next";
import { getKeywordUniverse, getKeywordLengthDistribution } from "@/lib/keyword-universe";
import { Container } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Keyword Universe — استراتژی سئو دادبان"),
    description: t("نقشه‌ی جامع کلمات کلیدی پلتفرم حقوقی دادبان: ده‌ها هزار کلمه‌ی long-tail در حوزه‌ی وکالت، مشاوره حقوقی، قرارداد و دعاوی."),
    alternates: { canonical: "/keywords" },
    robots: { index: false, follow: false }, // صفحه‌ی داخلی
  };
}

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const all = getKeywordUniverse();
  const query = q?.trim() || "";
  const filtered = query
    ? all.filter((kw) => kw.toLowerCase().includes(query.toLowerCase()))
    : all;
  const pageNum = Math.max(1, parseInt(page || "1", 10));
  const start = (pageNum - 1) * PAGE_SIZE;
  const slice = filtered.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const distribution = getKeywordLengthDistribution();
  const t = await getT();
  const tt = templateT(t);

  return (
    <Container className="py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Keyword Universe</h1>
        <p className="mt-2 text-sm text-muted">
          {tt("نقشه‌ی جامع کلمات کلیدی پلتفرم حقوقی دادبان — {count} کلمه‌ی long-tail.", { count: all.length.toLocaleString("fa-IR") })}
        </p>
      </header>

      {/* آمار */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-2xl font-bold text-primary">{all.length.toLocaleString("fa-IR")}</div>
          <div className="text-xs text-muted">{t("کل کلمات")}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-2xl font-bold text-accent-text">{filtered.length.toLocaleString("fa-IR")}</div>
          <div className="text-xs text-muted">{t("کلمات فیلترشده")}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-2xl font-bold text-success">{totalPages.toLocaleString("fa-IR")}</div>
          <div className="text-xs text-muted">{t("صفحه")}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-2xl font-bold text-foreground">{Object.keys(distribution).length}</div>
          <div className="text-xs text-muted">{t("دسته‌ی طول")}</div>
        </div>
      </div>

      {/* توزیع طول */}
      <details className="mb-6 rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm font-bold text-foreground">
          {t("توزیع بر اساس طول کلمه")}
        </summary>
        <div className="mt-3 space-y-2">
          {Object.entries(distribution)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([k, v]) => {
              const pct = Math.round((v / all.length) * 100);
              return (
                <div key={k} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-muted">{k}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-20 text-left font-medium text-foreground-soft">
                    {v.toLocaleString("fa-IR")} ({pct.toLocaleString("fa-IR")}٪)
                  </span>
                </div>
              );
            })}
        </div>
      </details>

      {/* جستجو */}
      <form className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder={t("جستجو در کلمات... (مثلاً: وکیل خانواده)")}
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
        >
          {t("جستجو")}
        </button>
      </form>

      {/* لیست کلمات */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span>
            {tt("نمایش {from} تا {to} از {total}", {
              from: (start + 1).toLocaleString("fa-IR"),
              to: (start + slice.length).toLocaleString("fa-IR"),
              total: filtered.length.toLocaleString("fa-IR"),
            })}
          </span>
          <span>{tt("صفحه {page} از {total}", { page: pageNum.toLocaleString("fa-IR"), total: totalPages.toLocaleString("fa-IR") })}</span>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {slice.map((kw, i) => (
            <div
              key={kw + i}
              className="truncate rounded-lg bg-surface-2 px-3 py-2 text-xs text-foreground-soft"
              title={kw}
            >
              {kw}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {pageNum > 1 && (
            <a
              href={`?q=${encodeURIComponent(query)}&page=${pageNum - 1}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-2"
            >
              {t("قبلی")}
            </a>
          )}
          <span className="text-xs text-muted">
            {pageNum.toLocaleString("fa-IR")} / {totalPages.toLocaleString("fa-IR")}
          </span>
          {pageNum < totalPages && (
            <a
              href={`?q=${encodeURIComponent(query)}&page=${pageNum + 1}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-2"
            >
              {t("بعدی")}
            </a>
          )}
        </div>
      )}

      {/* خروجی */}
      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href="/api/keywords?export=json"
          className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground-soft hover:bg-surface-2"
        >
          {t("⬇ خروجی JSON")}
        </a>
        <a
          href="/api/keywords"
          className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground-soft hover:bg-surface-2"
        >
          {t("API آمار")}
        </a>
      </div>
    </Container>
  );
}
