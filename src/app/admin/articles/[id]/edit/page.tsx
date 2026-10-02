"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container, Card, Button } from "@/components/ui";

const fieldCls =
  "w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    slug: "",
    title: "",
    category: "آموزش",
    excerpt: "",
    content: "",
    readTime: "5",
    author: "",
    authorRole: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/articles")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d.ok) return router.replace("/admin/login");
        const a = d.articles.find((x: { id: number }) => String(x.id) === id);
        if (a) {
          setForm({
            slug: a.slug,
            title: a.title,
            category: a.category,
            excerpt: a.excerpt,
            content: a.content,
            readTime: String(a.readTime ?? 5),
            author: a.author,
            authorRole: a.authorRole,
          });
        }
        setLoading(false);
      })
      .catch(() => router.replace("/admin/login"));
  }, [id, router]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, readTime: Number(form.readTime) }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.ok) {
      router.push("/admin/articles");
      router.refresh();
    } else {
      setError(data.error ?? "خطا در ذخیره مقاله");
    }
  };

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl font-black text-foreground">ویرایش مقاله</h1>
          <p className="mt-1 text-sm text-foreground-soft">تغییرات را اعمال و ذخیره کنید.</p>
        </div>
        {loading ? (
          <p className="text-sm text-foreground-soft">در حال بارگذاری...</p>
        ) : (
          <Card hover={false}>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-foreground">عنوان مقاله *</span>
                  <input className={`${fieldCls} mt-1.5`} value={form.title} onChange={set("title")} required />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-foreground">اسلاگ (آدرس) *</span>
                  <input className={`${fieldCls} mt-1.5`} dir="ltr" value={form.slug} onChange={set("slug")} required />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-foreground">دسته‌بندی</span>
                  <select className={`${fieldCls} mt-1.5`} value={form.category} onChange={set("category")}>
                    {["آموزش", "خانواده", "ملک", "کیفری", "چک و اسناد", "شرکت‌ها", "کار", "ارث", "مالیات", "مهاجرت"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-foreground">زمان مطالعه (دقیقه)</span>
                  <input type="number" min={1} className={`${fieldCls} mt-1.5`} value={form.readTime} onChange={set("readTime")} />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-bold text-foreground">خلاصه مقاله</span>
                <textarea rows={2} className={`${fieldCls} mt-1.5`} value={form.excerpt} onChange={set("excerpt")} required />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-foreground">متن مقاله *</span>
                <textarea rows={12} className={`${fieldCls} mt-1.5 leading-7`} value={form.content} onChange={set("content")} required />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-foreground">نویسنده</span>
                  <input className={`${fieldCls} mt-1.5`} value={form.author} onChange={set("author")} />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-foreground">عنوان نویسنده</span>
                  <input className={`${fieldCls} mt-1.5`} value={form.authorRole} onChange={set("authorRole")} />
                </label>
              </div>
              {error && <p className="text-sm font-semibold text-danger">{error}</p>}
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</Button>
                <Button type="button" variant="ghost" onClick={() => router.push("/admin/articles")}>انصراف</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </Container>
  );
}
