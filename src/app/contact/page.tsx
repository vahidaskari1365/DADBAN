"use client";

import { useState } from "react";
import { Container, Button, Card } from "@/components/ui";
import { Icon } from "@/components/icons";

const CATS = ["پرداخت", "حساب کاربری", "وکیل", "پرونده", "مشاوره", "مشکل فنی", "شکایت", "سایر"];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", category: "سایر", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.name || !form.phone || !form.message) {
      setError("لطفاً همه فیلدها را پر کنید.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setTicket(data.ticketNo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت تیکت");
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">تماس و پشتیبانی</h1>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
            سؤال یا مشکلی دارید؟ تیکت ثبت کنید یا از راه‌های ارتباطی ما استفاده نمایید. تیم پشتیبانی ۲۴ ساعته در خدمت شماست.
          </p>
        </Container>
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <Card hover={false}>
          {ticket ? (
            <div className="text-center">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success"><Icon name="check" className="h-7 w-7" /></span>
              <h2 className="mt-4 text-xl font-bold text-foreground">تیکت ثبت شد!</h2>
              <p className="mt-1 text-sm text-muted">شماره تیکت شما:</p>
              <p className="mt-1 font-mono text-lg font-bold text-primary" dir="ltr">{ticket}</p>
              <p className="mt-3 text-xs text-muted">به‌زودی توسط تیم پشتیبانی بررسی می‌شود.</p>
              <button onClick={() => setTicket(null)} className="mt-4 text-sm font-medium text-primary hover:text-primary-hover">ثبت تیکت جدید</button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="chat" className="h-5 w-5 text-primary" /> ثبت تیکت پشتیبانی</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">نام و نام خانوادگی</span>
                  <input value={form.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} placeholder="نام شما" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">شماره تماس</span>
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" className={fieldCls + " text-right"} placeholder="09123456789" />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">دسته‌بندی</span>
                <div className="flex flex-wrap gap-2">
                  {CATS.map((c) => (
                    <button key={c} type="button" onClick={() => set("category", c)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${form.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground-soft hover:bg-surface-2"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">متن پیام</span>
                <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={5} className={fieldCls + " h-auto resize-y py-2.5"} placeholder="مشکل یا سؤال خود را شرح دهید…" />
              </label>
              {error && <div className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>}
              <Button onClick={submit} disabled={loading} icon="send" className="w-full">{loading ? "در حال ارسال…" : "ثبت تیکت"}</Button>
            </div>
          )}
        </Card>

        <aside className="space-y-4">
          <Card hover={false}>
            <h3 className="font-bold text-foreground">راه‌های ارتباطی</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name="phone" className="h-4 w-4" /></span><div><p className="text-xs text-muted">تلفن پشتیبانی</p><p className="font-bold text-foreground" dir="ltr">۰۲۱-۹۱۰۰۲۰۳۰</p></div></div>
              <div className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name="mail" className="h-4 w-4" /></span><div><p className="text-xs text-muted">ایمیل</p><p className="font-bold text-foreground" dir="ltr">support@dadpay.io</p></div></div>
              <div className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name="clock" className="h-4 w-4" /></span><div><p className="text-xs text-muted">ساعات پاسخگویی</p><p className="font-bold text-foreground">۲۴ ساعته، ۷ روز هفته</p></div></div>
            </div>
          </Card>
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> تمامی گفتگوها و اطلاعات شما در دادپیو محرمانه و رمزنگاری‌شده نگهداری می‌شوند.</p>
          </Card>
        </aside>
      </Container>
    </>
  );
}
