"use client";

import { useState } from "react";
import { Container, Button, Card } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { PageContentBlocksClient } from "@/components/page-content-blocks-client";
import { useT } from "@/lib/i18n/provider";

const CATS = ["پرداخت", "حساب کاربری", "وکیل", "پرونده", "مشاوره", "مشکل فنی", "شکایت", "سایر"];

export default function ContactPage() {
  const t = useT();
  const [form, setForm] = useState({ name: "", phone: "", category: "سایر", message: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.name || !form.phone || !form.message) {
      setError(t("لطفاً همه فیلدها را پر کنید."));
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
      setError(e instanceof Error ? e.message : t("خطا در ثبت تیکت"));
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-contact.png"
        title={t("تماس و پشتیبانی")}
        desc={t("سؤال یا مشکلی دارید؟ تیکت ثبت کنید یا از راه‌های ارتباطی ما استفاده نمایید. تیم پشتیبانی ۲۴ ساعته در خدمت شماست.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("تماس و پشتیبانی") }]}
      />

      <PageContentBlocksClient page="contact" position="top" />

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <Card hover={false}>
          {ticket ? (
            <div className="text-center">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success"><Icon name="check" className="h-7 w-7" /></span>
              <h2 className="mt-4 text-xl font-bold text-foreground">{t("تیکت ثبت شد!")}</h2>
              <p className="mt-1 text-sm text-muted">{t("شماره تیکت شما:")}</p>
              <p className="mt-1 font-mono text-lg font-bold text-primary" dir="ltr">{ticket}</p>
              <p className="mt-3 text-xs text-muted">{t("به‌زودی توسط تیم پشتیبانی بررسی می‌شود.")}</p>
              <button onClick={() => setTicket(null)} className="mt-4 text-sm font-medium text-primary hover:text-primary-hover">{t("ثبت تیکت جدید")}</button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 font-bold text-foreground"><Icon name="chat" className="h-5 w-5 text-primary" /> {t("ثبت تیکت پشتیبانی")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">{t("نام و نام خانوادگی")}</span>
                  <input value={form.name} onChange={(e) => set("name", e.target.value)} className={fieldCls} placeholder={t("نام شما")} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">{t("شماره تماس")}</span>
                  <input value={form.phone} onChange={(e) => set("phone", e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={fieldCls + " text-right"} placeholder="09123456789" />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{t("دسته‌بندی")}</span>
                <div className="flex flex-wrap gap-2">
                  {CATS.map((c) => (
                    <button key={c} type="button" onClick={() => set("category", c)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${form.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground-soft hover:bg-surface-2"}`}>
                      {t(c)}
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">{t("متن پیام")}</span>
                <textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={5} className={fieldCls + " h-auto resize-y py-2.5"} placeholder={t("مشکل یا سؤال خود را شرح دهید…")} />
              </label>
              {error && <div className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>}
              <Button onClick={submit} disabled={loading} icon="send" className="w-full">{loading ? t("در حال ارسال…") : t("ثبت تیکت")}</Button>
            </div>
          )}
        </Card>

        <aside className="space-y-4">
          <Card hover={false}>
            <h3 className="font-bold text-foreground">{t("راه‌های ارتباطی")}</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name="phone" className="h-4 w-4" /></span><div><p className="text-xs text-muted">{t("تلفن پشتیبانی")}</p><p className="font-bold text-foreground" dir="ltr">۰۲۱-۹۱۰۰۲۰۳۰</p></div></div>
              <div className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name="mail" className="h-4 w-4" /></span><div><p className="text-xs text-muted">{t("ایمیل")}</p><p className="font-bold text-foreground" dir="ltr">support@dadvarzan.com</p></div></div>
              <div className="flex items-center gap-3"><span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon name="clock" className="h-4 w-4" /></span><div><p className="text-xs text-muted">{t("ساعات پاسخگویی")}</p><p className="font-bold text-foreground">{t("۲۴ ساعته، ۷ روز هفته")}</p></div></div>
            </div>
          </Card>
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {t("تمامی گفتگوها و اطلاعات شما در دادورزان محرمانه و رمزنگاری‌شده نگهداری می‌شوند.")}</p>
          </Card>
        </aside>
      </Container>
    </>
  );
}
