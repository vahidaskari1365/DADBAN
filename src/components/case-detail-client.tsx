"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { MoneyInput } from "@/components/money-input";
import { relativeTimeJalali } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * صفحهٔ جزئیات یک پروژه از «بازار پروژه‌های حقوقی» (سمت کلاینت):
 * اطلاعات کامل پروژه + دکمهٔ «ثبت پیشنهاد روی پروژه» که وقتی وکیل می‌زند،
 * فرم پیشنهاد (باکس توضیحات + باکس قیمت پیشنهادی + دکمهٔ ارسال) باز می‌شود
 * و پیشنهاد مستقیم برای موکلِ صاحب پروژه ارسال می‌شود.
 * منبع داده: GET /api/cases/board?id= — ثبت: POST /api/cases/offers
 * (حریم خصوصی: پیشنهادها فقط برای موکل؛ وکلا پیشنهادهای یکدیگر را نمی‌بینند).
 */

interface CaseDetail {
  id: number;
  subject: string;
  description: string;
  city: string;
  stage: string;
  budget: string | null;
  createdAt: string;
  closed: boolean;
}

interface MyOffer {
  id: number;
  message: string;
  price: number;
  status: string;
  createdAt: string;
}

interface Actor {
  name: string | null;
  city: string | null;
}

const normalize = (s: string) => s.replace(/\s+/g, " ").trim().replace(/\u200c/g, " ");

export function CaseDetailClient({ caseId }: { caseId: number }) {
  const t = useT();
  const tf = templateT(t);

  const [data, setData] = useState<{ case: CaseDetail; myOffer: MyOffer | null; actor: Actor | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* فرم پیشنهاد — با کلیک روی «ثبت پیشنهاد روی پروژه» باز می‌شود */
  const [formOpen, setFormOpen] = useState(false);
  const [bidMsg, setBidMsg] = useState("");
  const [bidPrice, setBidPrice] = useState("");
  const [bidBusy, setBidBusy] = useState(false);
  const [bidFlash, setBidFlash] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    fetch(`/api/cases/board?id=${caseId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok || !d.case) {
          setLoadError(d.error ?? t("دریافت جزئیات پروژه ناموفق بود."));
          return;
        }
        setLoadError(null);
        setData({ case: d.case, myOffer: d.myOffer ?? null, actor: d.actor ?? null });
      })
      .catch(() => setLoadError(t("ارتباط برقرار نشد؛ اتصال اینترنت را بررسی کنید.")))
      .finally(() => setLoading(false));
  }, [caseId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = () => {
    setBidFlash(null);
    setBidError(null);
    setBidMsg(data?.myOffer?.message ?? "");
    setBidPrice(data?.myOffer?.price ? String(data.myOffer.price) : "");
    setFormOpen(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const submitBid = async () => {
    if (!data) return;
    setBidError(null);
    setBidFlash(null);
    const msg = bidMsg.trim();
    const price = Math.max(0, Math.round(Number(bidPrice) || 0));
    if (!msg) {
      setBidError(t("توضیحات پیشنهاد خود را بنویسید."));
      return;
    }
    if (price <= 0) {
      setBidError(t("قیمت پیشنهادی را به تومان وارد کنید."));
      return;
    }
    setBidBusy(true);
    try {
      const res = await fetch("/api/cases/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: data.case.id, message: msg, price }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setBidFlash(d.message ?? t("پیشنهاد شما برای موکل ارسال شد."));
      load();
    } catch (e) {
      setBidError(e instanceof Error ? e.message : t("ثبت پیشنهاد انجام نشد."));
    } finally {
      setBidBusy(false);
    }
  };

  const actor = data?.actor ?? null;
  const isLawyer = Boolean(actor);
  const c = data?.case ?? null;
  const provinceMismatch = Boolean(actor?.city && c && normalize(c.city) !== normalize(actor.city));
  const fieldCls =
    "w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <div className="page-wash">
      <Container className="py-6 sm:py-10">
        {/* مسیر صفحه */}
        <nav aria-label={t("مسیر صفحه")} className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link href="/" className="rounded px-0.5 py-1 transition-colors hover:text-primary">{t("خانه")}</Link>
          <Icon name="chevron" className="h-3 w-3 rotate-180" aria-hidden />
          <Link href="/case-board" className="rounded px-0.5 py-1 transition-colors hover:text-primary">{t("پروژه‌ها")}</Link>
          <Icon name="chevron" className="h-3 w-3 rotate-180" aria-hidden />
          <span className="px-0.5 py-1 font-bold text-foreground">{t("جزئیات پروژه")}</span>
        </nav>

        {/* حالت بارگذاری */}
        {loading && !data && (
          <Card hover={false} className="mt-4 animate-pulse space-y-4 p-6" data-testid="case-detail-loading">
            <div className="h-6 w-2/3 rounded bg-surface-2" />
            <div className="flex gap-2">
              <div className="h-7 w-24 rounded-full bg-surface-2" />
              <div className="h-7 w-20 rounded-full bg-surface-2" />
              <div className="h-7 w-28 rounded-full bg-surface-2" />
            </div>
            <div className="h-3.5 w-full rounded bg-surface-2" />
            <div className="h-3.5 w-full rounded bg-surface-2" />
            <div className="h-3.5 w-4/5 rounded bg-surface-2" />
            <div className="h-11 w-full rounded-xl bg-surface-2 sm:w-64" />
          </Card>
        )}

        {/* خطا / پروژه‌ای که دیگر در بازار باز نیست */}
        {!loading && loadError && (
          <Card hover={false} className="mt-4 p-8 text-center" data-testid="case-detail-error">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
              <Icon name="folder" className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-lg font-black text-foreground">{loadError}</h1>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted">
              {t("این پرونده یا از بازار خارج شده (موکل وکیلش را انتخاب کرده) یا وجود ندارد. می‌توانید پروژه‌های باز دیگر را ببینید.")}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <Button href="/case-board" icon="folder">{t("بازگشت به پروژه‌ها")}</Button>
              <Button href="/case/new" variant="outline" icon="plus">{t("ثبت پروندهٔ جدید")}</Button>
            </div>
          </Card>
        )}

        {/* محتوای اصلی */}
        {c && (
          <div className="mt-4 grid gap-4 lg:grid-cols-5" data-testid="case-detail">
            {/* ستون اطلاعات پروژه */}
            <Card hover={false} className="p-5 sm:p-6 lg:col-span-3">
              <h1 className="text-xl font-black leading-9 text-foreground sm:text-2xl" data-testid="case-subject">
                {c.subject}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                <Badge tone="primary" icon="location">{t(c.city)}</Badge>
                <Badge tone="neutral">{c.stage}</Badge>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2/70 px-2.5 py-1.5 text-muted">
                  <Icon name="clock" className="h-3.5 w-3.5" />
                  {relativeTimeJalali(c.createdAt)}
                </span>
                {c.closed && <Badge tone="success" icon="check">{t("وکیل انتخاب شده")}</Badge>}
              </div>

              {c.budget && (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-primary-soft/50 px-3 py-2.5 text-xs font-bold text-foreground-soft">
                  <Icon name="money" className="h-4 w-4 shrink-0 text-primary" />
                  {tf("بودجهٔ اعلامی موکل: {budget}", { budget: c.budget })}
                </p>
              )}

              <div className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-4">
                <h2 className="text-xs font-black text-foreground">{t("توضیحات پروژه")}</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-8 text-foreground-soft">
                  {c.description || t("موکل توضیحات تکمیلی ثبت نکرده است.")}
                </p>
              </div>

              <p className="mt-4 flex items-start gap-2 rounded-xl border border-success/25 bg-success/5 px-3 py-2.5 text-[11px] leading-5 text-foreground-soft">
                <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                {t("نام و شمارهٔ تماس موکل و نیز پیشنهاد قیمت و گفتگوی وکلا کاملاً محرمانه است و فقط موکلِ صاحب پروژه آن‌ها را می‌بیند — وکلا پیشنهادهای یکدیگر را نمی‌بینند.")}
              </p>
            </Card>

            {/* ستون اقدام — ثبت پیشنهاد */}
            <div className="lg:col-span-2" ref={formRef}>
              <Card hover={false} className="p-5 sm:p-6" data-testid="proposal-panel">
                {c.closed ? (
                  /* پروژه بسته شده */
                  <div className="text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
                      <Icon name="check" className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-black text-foreground">{t("این پروژه موکلش وکیل را انتخاب کرده است")}</p>
                    <p className="mt-1.5 text-xs leading-6 text-muted">{t("پروژه‌های باز دیگر را ببینید یا پروندهٔ جدیدی ثبت کنید.")}</p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button href="/case-board" icon="folder">{t("دیدن پروژه‌های باز")}</Button>
                      <Button href="/case/new" variant="outline" icon="plus">{t("ثبت پروندهٔ جدید")}</Button>
                    </div>
                  </div>
                ) : !isLawyer ? (
                  /* مهمان یا موکل */
                  <div className="text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Icon name="gavel" className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-black text-foreground">{t("وکیل هستید؟ روی این پروژه پیشنهاد بدهید")}</p>
                    <p className="mt-1.5 text-xs leading-6 text-muted">
                      {t("با حساب وکیل وارد شوید تا دکمهٔ «ثبت پیشنهاد» فعال شود؛ ثبت پیشنهاد برای وکیل رایگان است.")}
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button href="/login" icon="user" data-testid="lawyer-login-cta">{t("ورود وکیل")}</Button>
                      <Button href="/case/new" variant="outline" icon="plus">{t("ثبت پروندهٔ جدید (موکل)")}</Button>
                    </div>
                  </div>
                ) : !formOpen ? (
                  /* دکمهٔ اصلی — هنوز فرم باز نشده */
                  <div className="text-center">
                    {data?.myOffer && (
                      <p className="mb-3 flex flex-wrap items-center justify-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-[11px] font-bold text-accent-text">
                        <Icon name="check" className="h-3.5 w-3.5" />
                        {t("پیشنهاد شما قبلاً روی این پروژه ثبت شده است")}
                      </p>
                    )}
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <Icon name="send" className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-sm font-black text-foreground">{t("پیشنهاد خود را برای این پروژه ثبت کنید")}</p>
                    <p className="mt-1.5 text-xs leading-6 text-muted">
                      {t("راهکار و قیمت پیشنهادی خود را بنویسید؛ پیشنهاد مستقیماً برای موکل ارسال می‌شود.")}
                    </p>
                    <Button onClick={openForm} size="lg" icon="send" className="mt-4 w-full" data-testid="proposal-cta">
                      {t("پیشنهاد روی پروژه")}
                    </Button>
                    <p className="mt-3 text-[10px] leading-5 text-muted">{t("ثبت و به‌روزرسانی پیشنهاد برای وکیل رایگان است.")}</p>
                  </div>
                ) : (
                  /* ─── فرم پیشنهاد: توضیحات + قیمت + ارسال ─── */
                  <div data-testid="proposal-form">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <Icon name="send" className="h-4 w-4" />
                      </span>
                      <h2 className="text-sm font-black text-foreground">{t("ثبت پیشنهاد روی پروژه")}</h2>
                    </div>

                    {data?.myOffer && (
                      <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-[11px] font-bold text-accent-text">
                        <Icon name="check" className="h-3.5 w-3.5" />
                        {t("پیشنهاد شما قبلاً ثبت شده — می‌توانید آن را به‌روزرسانی کنید")}
                      </p>
                    )}

                    {provinceMismatch && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] leading-5 text-danger" role="alert">
                        <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {tf("این پروژه در استان شما ({city}) ثبت نشده است؛ پیشنهاد فقط برای پروژه‌های استان خودتان پذیرفته می‌شود.", { city: actor?.city ?? "" })}
                      </p>
                    )}

                    {bidFlash && (
                      <p className="mt-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 text-xs font-bold text-success" role="status" data-testid="proposal-flash">
                        <Icon name="check" className="me-1 inline h-3.5 w-3.5" />
                        {bidFlash}
                      </p>
                    )}
                    {bidError && (
                      <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-bold text-danger" role="alert">{bidError}</p>
                    )}

                    <label className="mt-4 block">
                      <span className="text-xs font-bold text-foreground">{t("توضیحات پیشنهاد *")}</span>
                      <textarea
                        value={bidMsg}
                        onChange={(e) => setBidMsg(e.target.value)}
                        rows={4}
                        placeholder={t("راهکار و مسیر پیشنهادی خود برای این پروژه، شانس موفقیت و تجربهٔ مرتبط خود را بنویسید…")}
                        className={fieldCls + " mt-1.5 min-h-[96px] resize-y"}
                        aria-label={t("توضیحات پیشنهاد *")}
                        data-testid="proposal-message"
                      />
                    </label>

                    <label className="mt-3 block">
                      <span className="text-xs font-bold text-foreground">{t("قیمت پیشنهادی (تومان) *")}</span>
                      <MoneyInput
                        value={bidPrice}
                        onValueChange={setBidPrice}
                        placeholder={t("مثلاً 5,000,000")}
                        className={fieldCls + " mt-1.5 text-end"}
                        aria-label={t("قیمت پیشنهادی (تومان) *")}
                        data-testid="proposal-price"
                      />
                      {bidPrice && (
                        <span className="mt-1 block text-[10px] text-muted">
                          {tf("{price} تومان", { price: faNum(Number(bidPrice).toLocaleString("en-US")) })}
                        </span>
                      )}
                    </label>

                    <Button
                      onClick={submitBid}
                      disabled={bidBusy || provinceMismatch}
                      icon="send"
                      className="mt-4 w-full"
                      data-testid="proposal-submit"
                    >
                      {bidBusy ? t("در حال ارسال…") : data?.myOffer ? t("به‌روزرسانی و ارسال مجدد به موکل") : t("ارسال پیشنهاد به موکل")}
                    </Button>

                    <p className="mt-3 text-[10px] leading-5 text-muted">
                      {t("پس از ارسال، پیشنهاد شما در صندوق «پیام‌های پروژه‌ها»ی موکل ظاهر می‌شود؛ اگر موکل شما را انتخاب کند، گفتگوی مستقیم آغاز می‌شود.")}
                    </p>
                  </div>
                )}
              </Card>

              {/* میان‌برهای مرتبط */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                <Link href="/case-board" className="inline-flex min-h-11 items-center gap-1 font-bold text-primary transition-colors hover:text-primary-hover">
                  <Icon name="arrow" className="h-4 w-4 rotate-180" aria-hidden />
                  {t("بازگشت به پروژه‌ها")}
                </Link>
                <Link href="/track-case" className="inline-flex min-h-11 items-center gap-1 text-muted transition-colors hover:text-foreground">
                  <Icon name="clock" className="h-3.5 w-3.5" aria-hidden />
                  {t("پیگیری پروندهٔ خودم")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
