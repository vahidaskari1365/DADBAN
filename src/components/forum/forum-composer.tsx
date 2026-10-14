"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/**
 * فرم «موضوع جدید» تالار گفتگو — برای همه:
 * کاربر لاگین‌شده با نام حساب می‌نویسد؛ مهمان هم می‌تواند (نام دلخواه اختیاری).
 */
export function ForumComposer({ categories, me }: { categories: string[]; me: { name: string; role: string } | null }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "گفتگوی آزاد");
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  /* وضعیت ورود — همان الگوی هدر (یک fetch به /api/auth/me) */
  const [meState, setMeState] = useState<{ name: string; role: string } | null>(me ?? null);
  const [meLoaded, setMeLoaded] = useState(!!me);
  useEffect(() => {
    if (me) return;
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setMeState(d?.ok ? { name: d.user?.name ?? "", role: d.user?.role ?? "client" } : null);
        setMeLoaded(true);
      })
      .catch(() => { if (alive) setMeLoaded(true); });
    return () => { alive = false; };
  }, [me]);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/forum/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, category, name: guestName }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError(t("تعداد نوشته‌های شما زیاد است؛ کمی بعد دوباره تلاش کنید."));
        return;
      }
      if (!data.ok) {
        setError(data.error || t("ثبت موضوع ناموفق بود"));
        return;
      }
      setDone(true);
      setTitle("");
      setBody("");
      setGuestName("");
      setOpen(false);
      router.refresh();
      /* پرش به موضوع ساخته‌شده */
      if (data.id) router.push(`/forum/${data.id}`);
    } catch {
      setError(t("خطای ارتباط با سرور"));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = title.trim().length >= 5 && !busy;

  return (
    <Card hover={false} className="border-primary/25" data-testid="forum-composer">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-black text-foreground">
              <Icon name="chat" className="h-4 w-4 text-primary" />
              {t("دست شما هم خالی نیست!")}
            </p>
            <p className="mt-1 text-xs leading-6 text-muted">
              {meState
                ? t("با نام حساب خودتان بنویسید — همه می‌بینند و می‌توانند پاسخ بدهند.")
                : t("لازم نیست عضو باشید؛ نام دلخواه بگذارید و بنویسید. برای نمایش نام حساب، وارد شوید.")}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} icon="plus" data-testid="forum-new-topic">
            {t("موضوع جدید")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="forum-topic-form">
          <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
            <Icon name="chat" className="h-4 w-4 text-primary" />
            {t("موضوع جدید تالار گفتگو")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="forum-cat">
                {t("دسته")}
              </label>
              <select
                id="forum-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {t(c)}
                  </option>
                ))}
              </select>
            </div>
            {!meState && meLoaded && (
              <div>
                <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="forum-guest">
                  {t("نام شما (اختیاری — مهمان)")}
                </label>
                <input
                  id="forum-guest"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  maxLength={60}
                  placeholder={t("مثلاً: رضا از تهران")}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
                />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="forum-title">
              {t("عنوان موضوع")} <span className="text-destructive">*</span>
            </label>
            <input
              id="forum-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              placeholder={t("خلاصهٔ گفتگو را در یک جمله بنویسید")}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="forum-body">
              {t("متن")}
            </label>
            <textarea
              id="forum-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder={t("هرچه می‌خواهید بنویسید — پرسش، تجربه، نظر…")}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm leading-7 text-foreground outline-none transition focus:border-primary"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive" role="alert" data-testid="forum-form-error">
              {error}
            </p>
          )}
          {done && (
            <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-bold text-success" role="status">
              {t("موضوع شما ثبت شد ✓")}
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={submit} disabled={!canSubmit} data-testid="forum-submit">
              {busy ? t("در حال ارسال…") : t("ثبت موضوع")}
            </Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setError(""); }}>
              {t("انصراف")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
