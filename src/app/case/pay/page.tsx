"use client";

/**
 * صفحه پرداخت پرونده — انتخاب درگاه پرداخت توسط موکل.
 * جریان: ثبت پرونده → این صفحه (انتخاب درگاه) → ثبت انتخاب → پیگیری در پنل موکل + دعوت به ثبت‌نام.
 * صادقانه: درگاه واقعی هنوز متصل نیست؛ انتخاب ثبت می‌شود و لینک پرداخت پس از تعیین هزینه ارسال می‌شود.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container, Button, Card } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";
import { useT } from "@/lib/i18n/provider";
import Link from "next/link";

const STAGES = [
  "ثبت اولیه",
  "بررسی مدارک",
  "تنظیم دادخواست",
  "ثبت در دادگاه",
  "تعیین شعبه",
  "جلسه اول",
  "صدور رأی",
  "تجدیدنظر",
];

const GATEWAYS: { key: string; title: string; desc: string; badge?: string }[] = [
  { key: "zarinpal", title: "زرین‌پال", desc: "درگاه بانکی پرکاربرد — پرداخت با همه کارت‌های عضو شتاب", badge: "پیشنهاد دادبان" },
  { key: "idpay", title: "آیدی‌پی", desc: "درگاه بانکی، پرداخت سریع با تأیید دو مرحله‌ای" },
  { key: "manual", title: "هماهنگی با کارشناس", desc: "کارشناسان دادبان هزینه نهایی را تعیین و راهنمایی پرداخت می‌کنند" },
];

interface PayCtx {
  caseNumber: string;
  trackingToken?: string;
  subject?: string;
  city?: string;
  stage?: string;
}

function PayContent() {
  const search = useSearchParams();
  const router = useRouter();
  const t = useT();
  const [ctx, setCtx] = useState<PayCtx | null>(null);
  const [gateway, setGateway] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ gateway: string; message: string } | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // زمینه‌ی پرونده از مرحله‌ی قبل (ثبت پرونده)
    queueMicrotask(() => {
      try {
        const raw = window.sessionStorage.getItem("dadban_pay_ctx");
        if (raw) {
          const parsed = JSON.parse(raw) as PayCtx;
          const cn = search.get("cn");
          setCtx(cn ? { ...parsed, caseNumber: cn } : parsed);
          return;
        }
      } catch {
        /* حافظه در دسترس نیست */
      }
      const cn = search.get("cn");
      if (cn) setCtx({ caseNumber: cn });
    });
  }, [search]);

  useEffect(() => {
    // وضعیت ورود — برای دعوت به ثبت‌نام
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; user?: { phone?: string | null } | null };
        setAuthed(!!(data?.ok && data?.user));
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  const confirm = async () => {
    if (!ctx?.caseNumber || !gateway || loading) return;
    setLoading(true);
    setError(null);
    trackEvent("payment_started");
    try {
      const res = await fetch("/api/cases/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNumber: ctx.caseNumber, gateway }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      trackEvent("payment_completed");
      setDone({ gateway, message: data.message });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ثبت درگاه پرداخت انجام نشد."));
    } finally {
      setLoading(false);
    }
  };

  const fieldCard = "w-full cursor-pointer rounded-2xl border p-4 text-right transition-all";

  if (done) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
              <Icon name="check" className="h-8 w-8" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold text-foreground">{t("پرونده شما ثبت شد")}</h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              {t("شماره پرونده:")} <span className="font-bold text-primary" dir="ltr">{ctx?.caseNumber ?? "—"}</span>
              {ctx?.trackingToken && (
                <>
                  <br />{t("کد پیگیری محرمانه:")} <span className="font-mono font-bold text-primary" dir="ltr">{ctx.trackingToken}</span>
                </>
              )}
            </p>
            <p className="mx-auto mt-3 max-w-md rounded-xl border border-accent/30 bg-accent-soft/40 px-4 py-3 text-xs leading-6 text-foreground-soft">
              {done.message}
            </p>
          </div>

          <Card hover={false} className="mt-8">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Icon name="folder" className="h-4 w-4 text-primary" /> {t("مراحل پرونده")}
            </h2>
            <ol className="mt-4 space-y-0">
              {STAGES.map((s, i) => {
                const current = i === 0;
                return (
                  <li key={s} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${current ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted"}`}>
                        {current ? <Icon name="check" className="h-3.5 w-3.5" /> : faNum(i + 1)}
                      </span>
                      {i < STAGES.length - 1 && <span className={`my-1 w-0.5 flex-1 ${current ? "bg-primary" : "bg-border"}`} style={{ minHeight: 18 }} />}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-semibold ${current ? "text-primary" : "text-muted"}`}>
                        {t(s)} {current && t("• مرحله فعلی")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* پیشنهاد وکلای استان — موکل با کد پیگیری نظر و قیمت وکلا را می‌بیند */}
          {ctx?.trackingToken && ctx?.caseNumber && (
            <Card hover={false} className="mt-6 border-success/30 bg-success/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{t("نظر و قیمت وکلای استان شما")}</p>
                  <p className="mt-1 text-xs leading-6 text-muted">
                    {t("وکلای همان استان پروندهٔ شما را می‌بینند و نظر و قیمت خود را ثبت می‌کنند؛ هر وقت خواستید یکی را انتخاب کنید — انتخاب و پاسخ به پیام وکیل رایگان است.")}
                  </p>
                </div>
                <Button
                  href={`/case/offers?cn=${encodeURIComponent(ctx.caseNumber)}&t=${encodeURIComponent(ctx.trackingToken)}`}
                  icon="mail"
                  className="shrink-0"
                  data-testid="offers-cta"
                >
                  {t("دیدن پیشنهاد وکلا")}
                </Button>
              </div>
            </Card>
          )}

          {/* دعوت به ثبت‌نام — پرونده با شماره موبایل به پنل موکل متصل می‌شود */}
          {authed === false ? (
            <Card hover={false} className="mt-6 border-primary/30 bg-primary-soft/40">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon name="user" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{t("برای پیگیری آنلاین پرونده، ثبت‌نام کنید")}</p>
                  <p className="mt-1 text-xs leading-6 text-muted">
                    {t("با همان شماره موبایلی که پرونده با آن ثبت شده است ثبت‌نام کنید تا پرونده و روند آن در پنل موکل شما نمایش داده شود.")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button href="/register" icon="user">{t("ثبت‌نام رایگان")}</Button>
                    <Button href="/track-case" variant="outline" icon="document">{t("پیگیری با کد")}</Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button href="/dashboard/client" icon="folder">{t("مشاهده پرونده در پنل موکل")}</Button>
              <Button href="/track-case" variant="outline">{t("پیگیری درخواست‌ها")}</Button>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted">
            {t("سوالی دارید؟")} <Link href="/contact" className="font-medium text-primary hover:underline">{t("با پشتیبانی دادبان")}</Link> {t("در تماس باشید.")}
          </p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-payment.png"
        title={t("انتخاب درگاه پرداخت")}
        desc={t("پرونده شما با شماره") + " " + (ctx?.caseNumber ?? "…") + " " + t("ثبت شد.") + " " + t("حالا مشخص کنید پرداخت را از کدام درگاه انجام می‌دهید.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پرداخت پرونده") }]}
      />

      <Container className="py-10">
        <div className="mx-auto max-w-2xl space-y-4">
          {ctx && (
            <Card hover={false} className="text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <span className="text-muted">{t("موضوع پرونده")}</span>
                <span className="font-bold text-foreground">{ctx.subject ?? "—"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted">{t("استان / شهر")}</span>
                <span className="font-bold text-foreground">{ctx.city ?? "—"}</span>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {GATEWAYS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGateway(g.key)}
                className={`${fieldCard} ${
                  gateway === g.key
                    ? "border-primary bg-primary-soft/50 ring-1 ring-primary/40"
                    : "border-border hover:border-primary/40 hover:bg-surface-2/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${gateway === g.key ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
                      <Icon name="money" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                        {t(g.title)}
                        {g.badge && (
                          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-text">{t(g.badge)}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{t(g.desc)}</p>
                    </div>
                  </div>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${gateway === g.key ? "border-primary bg-primary text-primary-foreground" : "border-border-strong"}`}>
                    {gateway === g.key && <Icon name="check" className="h-3 w-3" />}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <p className="rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-[11px] leading-6 text-muted">
            {t("هزینه نهایی پرونده پس از بررسی کارشناسان و بر اساس تعرفه مصوب اعلام می‌شود؛ پیش از آن هیچ مبلغی از شما کسر نخواهد شد.")}
          </p>

          {error && <div className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/case/new")}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {t("→ بازگشت به فرم پرونده")}
            </button>
            <Button onClick={confirm} disabled={!gateway || loading} icon="money" className="min-w-44">
              {loading ? t("در حال ثبت…") : t("تأیید و ادامه")}
            </Button>
          </div>
        </div>
      </Container>
    </>
  );
}

export default function CasePayPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
          {t("در حال بارگذاری…")}
        </div>
      }
    >
      <PayContent />
    </Suspense>
  );
}
