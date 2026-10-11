"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LOCATIONS, faNum } from "@/lib/data";
import { MoneyInput } from "@/components/money-input";
import { LawyerPhoto } from "@/components/lawyer-photo";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * فرم «درخواست همکاری / ارجاع پرونده» — وکیل از پروفایل همکار به اینجا می‌آید.
 * پس از ارسال، درخواست در کارتابل «همکاری و ارجاع» پنل همکار می‌نشیند و
 * او پذیرش/رد می‌کند؛ نتیجه در «ارجاع‌های من» فرستنده دیده می‌شود.
 */

export interface TargetLawyer {
  id: number;
  name: string;
  slug: string;
  title: string;
  city: string;
  specialties: string[];
  avatarColor: string;
  photoUrl: string | null;
  verified: boolean;
  experienceYears: number;
}

const KINDS = [
  {
    value: "referral",
    title: "ارجاع کامل پرونده",
    desc: "پرونده از ابتدا در دست همکار؛ شما از فرآیند مطلع می‌مانید",
    icon: "folder" as const,
  },
  {
    value: "consult",
    title: "مشورت تخصصی",
    desc: "خودتان پرونده را دارید؛ فقط نظر تخصصی همکار را می‌خواهید",
    icon: "scale" as const,
  },
  {
    value: "joint",
    title: "همکاری مشترک",
    desc: "پرونده مشترکاً پیش می‌رود؛ تقسیم کار بر پایهٔ تخصص",
    icon: "link" as const,
  },
];

const KIND_FA: Record<string, string> = {
  referral: "ارجاع کامل پرونده",
  consult: "مشورت تخصصی",
  joint: "همکاری مشترک",
};

const fieldCls =
  "w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";
const labelCls = "mb-1.5 block text-xs font-bold text-foreground-soft";

export function ReferForm({
  target,
  senderName,
}: {
  target: TargetLawyer;
  senderName: string;
}) {
  const t = useT();
  const tf = templateT(t);
  const [kind, setKind] = useState("referral");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const cities = useMemo(
    () => LOCATIONS.find((l) => l.province === province)?.cities ?? [],
    [province],
  );

  const descLen = description.trim().length;
  const canSubmit =
    subject.trim().length >= 3 && descLen >= 20 && message.trim().length >= 2 && !sending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError(
        descLen < 20
          ? t("شرح پرونده باید دست‌کم ۲۰ نویسه باشد تا همکار بتواند ارزیابی کند.")
          : t("موضوع، شرح پرونده و پیام به همکار را کامل کنید."),
      );
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/lawyer/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toLawyerId: target.id,
          kind,
          subject: subject.trim(),
          description: description.trim(),
          city: city || province || "",
          budget: budget ? Number(budget.replace(/[^\d]/g, "")) : undefined,
          message: message.trim(),
        }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || t("ارسال درخواست انجام نشد."));
      setDone(d.message as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ارسال درخواست انجام نشد."));
    } finally {
      setSending(false);
    }
  };

  /* ── حالت موفقیت — مسیرهای بعدی روشن ── */
  if (done) {
    return (
      <Card hover={false} className="mx-auto max-w-2xl p-8 text-center card-shadow" data-testid="refer-success">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-foreground">{t("درخواست همکاری ارسال شد")}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">{t(done)}</p>
        <p className="mx-auto mt-1 text-xs text-muted">
          {t("وضعیت درخواست هر زمان در پنل شما، بخش «همکاری و ارجاع» قابل پیگیری است.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/dashboard/lawyer#collab" icon="briefcase">
            {t("ارجاع‌های من در پنل")}
          </Button>
          <Button href={`/lawyers/${target.slug}`} variant="outline" icon="user">
            {tf("پروفایل {n}", { n: target.name })}
          </Button>
          <Button href="/lawyers" variant="ghost" icon="search">
            {t("دایرکتوری همکاران")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_300px]">
      {/* فرم */}
      <Card hover={false} className="p-6 card-shadow" data-testid="refer-form">
        <h1 className="text-xl font-extrabold text-foreground">
          {t("درخواست همکاری / ارجاع پرونده")}
        </h1>
        <p className="mt-1 text-xs leading-6 text-muted">
          {tf("درخواست شما در کارتابل «همکاری و ارجاع» {n} ثبت می‌شود؛ پس از پذیرش یا رد، وضعیت آن در پنل شما نمایش داده می‌شود.", { n: target.name })}
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs font-bold text-danger" role="alert">
            {t(error)}
          </p>
        )}

        <form onSubmit={submit} className="mt-5 space-y-5">
          {/* نوع همکاری */}
          <fieldset>
            <legend className={labelCls}>{t("نوع همکاری")}</legend>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("نوع همکاری")}>
              {KINDS.map((k) => {
                const active = kind === k.value;
                return (
                  <label
                    key={k.value}
                    className={`cursor-pointer rounded-2xl border p-3 transition-all ${
                      active
                        ? "border-primary bg-primary-soft/50 shadow-sm"
                        : "border-border bg-surface-2/50 hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="kind"
                      value={k.value}
                      checked={active}
                      onChange={() => setKind(k.value)}
                      className="sr-only"
                    />
                    <span className="flex items-center gap-2">
                      <Icon name={k.icon} className={`h-4 w-4 ${active ? "text-primary" : "text-muted"}`} />
                      <span className={`text-xs font-bold ${active ? "text-primary" : "text-foreground"}`}>
                        {t(k.title)}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-[10px] leading-4 text-muted">{t(k.desc)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* موضوع */}
          <div>
            <label htmlFor="ref-subject" className={labelCls}>{t("موضوع پرونده *")}</label>
            <input
              id="ref-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("مثال: دعوای مطالبهٔ وجه با سند رسمی")}
              className={fieldCls}
              maxLength={160}
            />
          </div>

          {/* شرح پرونده */}
          <div>
            <label htmlFor="ref-desc" className={labelCls}>
              {t("شرح پرونده *")}
              <span className="ms-2 font-normal text-muted">
                {tf("({n} نویسه — حداقل ۲۰)", { n: faNum(descLen) })}
              </span>
            </label>
            <textarea
              id="ref-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder={t("خلاصهٔ موضوع، مرحلهٔ رسیدگی، مستندات اصلی و آنچه از همکار انتظار دارید…")}
              className={`${fieldCls} resize-y leading-7`}
            />
          </div>

          {/* شهر + بودجه */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ref-prov" className={labelCls}>{t("استان پرونده")}</label>
              <select
                id="ref-prov"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setCity("");
                }}
                className={fieldCls}
              >
                <option value="">{t("انتخاب استان…")}</option>
                {LOCATIONS.map((l) => (
                  <option key={l.province} value={l.province}>{l.province}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ref-city" className={labelCls}>{t("شهر (اختیاری)")}</label>
              <select
                id="ref-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={fieldCls}
                disabled={!province}
              >
                <option value="">{province ? t("همهٔ شهرهای استان") : t("ابتدا استان را انتخاب کنید")}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ref-budget" className={labelCls}>
              {t("بودجهٔ مورد انتظار (تومان — اختیاری)")}
            </label>
            <MoneyInput
              id="ref-budget"
              value={budget}
              onValueChange={setBudget}
              placeholder={t("مثال: 50,000,000")}
              className={`${fieldCls} tnum`}
            />
          </div>

          {/* پیام به همکار */}
          <div>
            <label htmlFor="ref-msg" className={labelCls}>{t("پیام به همکار *")}</label>
            <textarea
              id="ref-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={t("چرا این پرونده به تخصص ایشان مرتبط است؟ پیشنهاد شما برای تقسیم کار و حق‌الزحمه چیست؟")}
              className={`${fieldCls} resize-y leading-7`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={!canSubmit} icon="send" data-testid="refer-submit">
              {sending ? t("در حال ارسال…") : t("ارسال درخواست همکاری")}
            </Button>
            <Link
              href={`/lawyers/${target.slug}`}
              className="text-xs font-bold text-muted transition-colors hover:text-primary"
            >
              {t("انصراف و بازگشت به پروفایل")}
            </Link>
          </div>
        </form>
      </Card>

      {/* سایدبار — همکار مقصد */}
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card hover={false} className="p-5 text-center card-shadow">
          <div className="mx-auto w-fit rounded-2xl ring-4 ring-background">
            <LawyerPhoto
              name={target.name}
              color={target.avatarColor}
              photoUrl={target.photoUrl}
              size="lg"
            />
          </div>
          <h2 className="mt-3 flex items-center justify-center gap-1.5 text-base font-extrabold text-foreground">
            {target.name}
            {target.verified && <Icon name="badge" className="h-4 w-4 text-primary" />}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{target.title}</p>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted">
            <Icon name="location" className="h-3.5 w-3.5" />
            {target.city}
            <span aria-hidden>•</span>
            {tf("{n} سال سابقه", { n: faNum(target.experienceYears) })}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {target.specialties.slice(0, 4).map((s) => (
              <Badge key={s} tone="primary">{t(s)}</Badge>
            ))}
          </div>
        </Card>

        <Card hover={false} className="bg-primary-soft/40 p-5">
          <p className="flex items-start gap-2 text-[11px] leading-6 text-foreground-soft">
            <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            {t("فرآیند ارجاع در دادبان: درخواست در کارتابل همکار ثبت می‌شود؛ پس از پذیرش، هماهنگی نهایی حق‌الزحمه و مستندات بین شما انجام می‌گیرد و پشتیبانی دادبان ناظر جریان است.")}
          </p>
        </Card>

        <Card hover={false} className="p-5">
          <p className="text-[11px] text-muted">{t("فرستنده")}</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon name="user" className="h-4 w-4 text-primary" />
            {senderName}
          </p>
          <p className="mt-1 text-[10px] leading-5 text-muted">
            {t("نوع همکاری انتخابی: ")}<b className="text-foreground-soft">{t(KIND_FA[kind])}</b>
          </p>
        </Card>
      </aside>
    </div>
  );
}
