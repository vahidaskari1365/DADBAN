import { formatJalali } from "@/lib/jalali";
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Card, Badge, Button } from "@/components/ui";
import { faNum } from "@/lib/data";

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
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/articles")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (d.ok) setArticles(d.articles);
        else router.replace("/admin/login");
      })
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  const remove = async (id: number) => {
    if (!confirm("این مقاله حذف شود؟")) return;
    const res = await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
    if (res.ok) {
      setArticles((a) => (a ? a.filter((x) => x.id !== id) : a));
      router.refresh();
    }
  };

  return (
    <Container className="py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground">مدیریت مقالات</h1>
          <p className="mt-1 text-sm text-foreground-soft">ایجاد، ویرایش و حذف مقالات دانشنامه حقوقی</p>
        </div>
        <Button href="/admin/articles/new" icon="plus" size="sm">مقاله جدید</Button>
      </div>
      {error && <p className="mb-4 text-sm font-semibold text-danger">{error}</p>}
      {!articles && <p className="text-sm text-foreground-soft">در حال بارگذاری...</p>}
      <div className="space-y-3">
        {(articles ?? []).map((a) => (
          <Card key={a.id} hover className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{a.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground-soft">
                <Badge tone="accent">{a.category}</Badge>
                <span dir="ltr">/{a.slug}</span>
                <span>{faNum(a.views)} بازدید</span>
                <span>{formatJalali(a.publishedAt)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button href={`/admin/articles/${a.id}/edit`} variant="outline" size="sm">ویرایش</Button>
              <Button onClick={() => remove(a.id)} variant="ghost" size="sm">حذف</Button>
            </div>
          </Card>
        ))}
        {articles && articles.length === 0 && (
          <Card hover={false}>
            <p className="text-sm text-foreground-soft">مقاله‌ای ثبت نشده است. اولین مقاله را ایجاد کنید.</p>
          </Card>
        )}
      </div>
    </Container>
  );
}
