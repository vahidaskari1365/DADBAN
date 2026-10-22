"use client";
import { formatJalali } from "@/lib/jalali";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Card, Badge, Button } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { faNum } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

type Article = {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  views: number;
  publishedAt: string;
};

export default function AdminArticlesPage() {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/admin/articles", { cache: "no-store" });
        if (!alive) return;
        /* فقط ۴۰۱ به لاگین می‌رود — خطاهای دیگر (مثلاً ۵۰۰ دیتابیس) پیام می‌گیرند، نه redirect */
        if (r.status === 401) {
          router.replace("/admin/login");
          return;
        }
        const d = await r.json();
        if (!alive) return;
        if (d.ok) setArticles(d.articles);
        else setError(d.error || t("خطا در دریافت مقالات"));
      } catch {
        if (alive) setError(t("خطا در ارتباط با سرور"));
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, t]);

  const remove = async (id: number) => {
    if (!confirm(t("این مقاله حذف شود؟"))) return;
    try {
      const res = await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) {
        setArticles((a) => (a ? a.filter((x) => x.id !== id) : a));
        router.refresh();
      } else {
        setError(d?.error || t("حذف مقاله ناموفق بود"));
      }
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    }
  };

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-admin.png"
        badge={t("Admin · مقالات")}
        title={t("مدیریت مقالات")}
        desc={t("ایجاد، ویرایش و حذف مقالات دانشنامه حقوقی")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت"), href: "/admin" }, { label: t("مقالات") }]}
      >
        <Button href="/admin/articles/new" icon="plus" size="sm" variant="accent">{t("مقاله جدید")}</Button>
      </PageHero>
      <Container className="py-10">
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{error}</div>
        )}
        {!articles && <p className="text-sm text-foreground-soft">{t("در حال بارگذاری...")}</p>}
      <div className="space-y-3">
        {(articles ?? []).map((a) => (
          <Card key={a.id} hover className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{a.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground-soft">
                <Badge tone="accent">{a.category}</Badge>
                <span dir="ltr">/{a.slug}</span>
                <span>{tf("{n} بازدید", { n: faNum(a.views) })}</span>
                <span>{formatJalali(a.publishedAt)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button href={`/admin/articles/${a.id}/edit`} variant="outline" size="sm">{t("ویرایش")}</Button>
              <Button onClick={() => remove(a.id)} variant="ghost" size="sm">{t("حذف")}</Button>
            </div>
          </Card>
        ))}
        {articles && articles.length === 0 && (
          <Card hover={false}>
            <p className="text-sm text-foreground-soft">{t("مقاله‌ای ثبت نشده است. اولین مقاله را ایجاد کنید.")}</p>
          </Card>
        )}
      </div>
      </Container>
    </>
  );
}
