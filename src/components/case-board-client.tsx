"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { relativeTimeJalali } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * برد زندهٔ «بازار پرونده‌های دادبان» — سمت کلاینت:
 * آمار کلان، فیلتر و جستجو، کارت پرونده‌های باز و مودال جزئیات با
 * فرم ثبت/به‌روزرسانی پیشنهاد قیمت برای وکیلِ واردشده.
 * حریم خصوصی: تعداد و محتوای پیشنهادهای هر پرونده فقط برای موکلِ صاحب پرونده
 * دیده می‌شود — وکیل فقط پیشنهادِ خودش را می‌بیند.
 * روند کار و توضیح فرآیند (نسخهٔ SEO) در صفحهٔ سرور /case-board است.
 */

interface BoardCase {
  id: number;
  subject: string;
  description: string;
  city: string;
  stage: string;
  budget: string | null;
  createdAt: string;
  inMyProvince: boolean | null;
}

interface BoardStats {
  openCases: number;
  totalOffers: number;
  lawyers: number;
}

interface Actor {
  name: string | null;
  city: string | null;
}

interface MyOffer {
  id: number;
  message: string;
  price: number;
  status: string;
  createdAt: string;
}

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

const normalize = (s: string) => s.replace(/\s+/g, " ").trim().replace(/\u200c/g, " ");

export function CaseBoardClient() {
  const t = useT();
  const tf = templateT(t);
  const [data, setData] = useState<{ stats: BoardStats; actor: Actor | null; cities: string[]; cases: BoardCase[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<"new" | "old">("new");

  /* مودال جزئیات */
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ case: CaseDetail; myOffer: MyOffer | null; actor: Actor | null } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  /* فرم پیشنهاد */
  const [bidMsg, setBidMsg] = useState("");
  const [bidPrice, setBidPrice] = useState("");
  const [bidBusy, setBidBusy] = useState(false);
  const [bidFlash, setBidFlash] = useState<string | null>(null);
  const [bidError, setBidError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/cases/board", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          setFailed(true);
          return;
        }
        setFailed(false);
        setData(d);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const loadDetail = useCallback((id: number) => {
    setDetailLoading(true);
    setDetailError(null);
    fetch(`/api/cases/board?id=${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok || !d.case) {
          setDetailError(d.error ?? t("دریافت جزئیات پرونده ناموفق بود."));
          return;
        }
        setDetail({ case: d.case, myOffer: d.myOffer ?? null, actor: d.actor ?? null });
        setBidMsg(d.myOffer?.message ?? "");
        setBidPrice(d.myOffer?.price ? String(d.myOffer.price) : "");
      })
      .catch(() => setDetailError(t("ارتباط برقرار نشد؛ اتصال اینترنت را بررسی کنید.")))
      .finally(() => setDetailLoading(false));
  }, []);

  const openDetail = (id: number) => {
    setOpenId(id);
    setDetail(null);
    setBidFlash(null);
    setBidError(null);
    loadDetail(id);
  };

  const submitBid = async () => {
    if (!detail) return;
    setBidError(null);
    setBidFlash(null);
    const msg = bidMsg.trim();
    const price = Math.max(0, Math.round(Number(bidPrice) || 0));
    if (!msg) {
      setBidError(t("نظر و راهکار خود را دربارهٔ پرونده بنویسید."));
      return;
    }
    setBidBusy(true);
    try {
      const res = await fetch("/api/cases/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: detail.case.id, message: msg, price }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setBidFlash(d.message ?? t("پیشنهاد شما ثبت شد."));
      load();
      loadDetail(detail.case.id);
    } catch (e) {
      setBidError(e instanceof Error ? e.message : t("ثبت پیشنهاد انجام نشد."));
    } finally {
      setBidBusy(false);
    }
  };

  const closeDetail = () => {
    setOpenId(null);
    setDetail(null);
  };

  /* قفل اسکرول بدنه هنگام باز بودن مودال + بستن با Escape */
  useEffect(() => {
    if (openId == null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = [...data.cases];
    const needle = q.trim();
    if (needle) {
      list = list.filter((c) => c.subject.includes(needle) || c.description.includes(needle));
    }
    if (city) {
      list = list.filter((c) => normalize(c.city) === normalize(city));
    }
    if (sort === "old") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return list;
  }, [data, q, city, sort]);

  const actor = data?.actor ?? null;
  const isLawyer = Boolean(actor);
  const provinceMismatch = Boolean(actor?.city && detail?.case && normalize(detail.case.city) !== normalize(actor.city));
  const fieldCls =
    "w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <section aria-label="برد پرونده‌های باز" id="board-top" className="scroll-mt-24">
      <Container>
        {/* آمار زندهٔ بازار */}
        <div className="grid gap-3 sm:grid-cols-3" data-testid="board-stats">
          {[
            { icon: "folder" as const, label: t("پروندهٔ باز در بازار"), value: data ? faNum(data.stats.openCases) : "…" },
            { icon: "money" as const, label: t("پیشنهاد قیمت ثبت‌شده"), value: data ? faNum(data.stats.totalOffers) : "…" },
            { icon: "gavel" as const, label: t("وکلای متخصص دادبان"), value: data ? faNum(data.stats.lawyers) : "…" },
          ].map((s) => (
            <Card key={s.label} hover={false} className="flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <Icon name={s.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xl font-black text-foreground tnum">{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {actor && (
          <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary-soft/50 px-3 py-2.5 text-xs font-bold text-foreground-soft" role="status">
            <Icon name="badge" className="h-4 w-4 text-primary" />
            {tf("{name} عزیز، به بازار پرونده‌ها خوش آمدید", { name: actor.name ?? t("همکار گرامی") })}
            {actor.city && tf(" — پرونده‌های استان «{city}» با نشان «استان شما» مشخص شده‌اند", { city: actor.city })}
          </p>
        )}

        {/* نوار فیلتر */}
        <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:items-center" role="search">
          <label className="relative flex-1">
            <span className="sr-only">{t("جستجوی موضوع پرونده")}</span>
            <Icon name="search" className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("جستجو در موضوع و توضیحات پرونده‌ها…")}
              className={fieldCls + " pe-10"}
              data-testid="board-search"
            />
          </label>
          <label className="sm:w-44">
            <span className="sr-only">{t("فیلتر شهر")}</span>
            <select value={city} onChange={(e) => setCity(e.target.value)} className={fieldCls} data-testid="board-city">
              <option value="">{t("همهٔ شهرها")}</option>
              {(data?.cities ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="sm:w-40">
            <span className="sr-only">{t("ترتیب نمایش")}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as "new" | "old")} className={fieldCls} data-testid="board-sort">
              <option value="new">{t("جدیدترین پرونده‌ها")}</option>
              <option value="old">{t("قدیمی‌ترین پرونده‌ها")}</option>
            </select>
          </label>
        </div>

        {/* کارت‌های پرونده‌های باز */}
        <div className="mt-5" data-testid="board-list">
          {failed && (
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-6 text-center text-xs font-bold text-danger" role="alert">
              {t("دریافت بازار پرونده‌ها ناموفق بود؛ اتصال اینترنت را بررسی کنید.")}
            </p>
          )}
          {!failed && !data && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <Card key={i} hover={false} className="animate-pulse space-y-3 p-6">
                  <div className="h-5 w-2/3 rounded bg-surface-2" />
                  <div className="h-3.5 w-full rounded bg-surface-2" />
                  <div className="h-3.5 w-4/5 rounded bg-surface-2" />
                  <div className="h-9 w-32 rounded-xl bg-surface-2" />
                </Card>
              ))}
            </div>
          )}
          {data && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
                <Icon name="folder" className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-bold text-foreground">
                {data.cases.length === 0 ? t("هنوز پروندهٔ بازی در بازار نیست") : t("پرونده‌ای با این فیلترها پیدا نشد")}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-6 text-muted">
                {data.cases.length === 0
                  ? t("اولین پرونده را ثبت کنید — وکلای متخصص دادبان به‌محض ثبت، پروندهٔ شما را می‌بینند و پیشنهاد قیمت می‌دهند.")
                  : t("فیلتر شهر یا عبارت جستجو را تغییر دهید.")}
              </p>
              {data.cases.length === 0 && (
                <Button href="/case/new" icon="plus" className="mt-4" >
                  {t("ثبت پروندهٔ جدید")}
                </Button>
              )}
            </div>
          )}
          {data && filtered.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(c.id)}
                    className="group flex h-full w-full flex-col rounded-2xl border border-border bg-surface p-5 text-start transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-lift)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-6"
                    data-testid={`board-case-${c.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-black leading-8 text-foreground transition-colors group-hover:text-primary sm:text-lg">{c.subject}</h3>
                      {c.inMyProvince != null && c.inMyProvince && <Badge tone="primary" >{t("استان شما")}</Badge>}
                    </div>
                    {c.description && <p className="mt-2 line-clamp-3 flex-1 text-xs leading-7 text-muted sm:text-sm">{c.description}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2/70 px-2.5 py-1.5">
                        <Icon name="location" className="h-3.5 w-3.5" />{c.city}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2/70 px-2.5 py-1.5">
                        <Icon name="clock" className="h-3.5 w-3.5" />{relativeTimeJalali(c.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2/70 px-2.5 py-1.5 text-muted">
                        <Icon name="lock" className="h-3.5 w-3.5" />
                        {t("پیشنهادها فقط برای موکل")}
                      </span>
                    </div>
                    {c.budget && (
                      <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-foreground-soft">
                        <Icon name="money" className="h-4 w-4 text-primary" /> {tf("بودجهٔ اعلامی موکل: {budget}", { budget: c.budget })}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary transition-all duration-300 group-hover:gap-2">
                      {t("مشاهده و ثبت پیشنهاد")}
                      <Icon name="arrow" className="h-4 w-4" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && data.cases.length > 0 && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] leading-5 text-muted">
            <Icon name="clock" className="h-3.5 w-3.5" />
            {t("این برد هر ۲۰ ثانیه خودکار به‌روز می‌شود — پرونده‌هایی که موکل وکیلش را انتخاب کرده باشد از برد حذف می‌شوند.")}
          </p>
        )}
      </Container>

      {/* ─── مودال جزئیات پرونده + فرم پیشنهاد ─── */}
      {openId != null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="جزئیات پرونده"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
          data-testid="case-modal"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-black text-foreground">
                {detail?.case.subject ?? t("در حال دریافت پرونده…")}
              </h2>
              <button
                type="button"
                onClick={closeDetail}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                aria-label={t("بستن")}
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>

            {detailLoading && <p className="mt-6 text-center text-sm text-muted">{t("در حال دریافت جزئیات…")}</p>}
            {detailError && (
              <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs font-bold text-danger" role="alert">{detailError}</p>
            )}

            {detail && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <Badge tone="neutral" ><Icon name="location" className="h-3 w-3" />{detail.case.city}</Badge>
                  <Badge tone="neutral" >{detail.case.stage}</Badge>
                  <Badge tone="neutral" ><Icon name="lock" className="h-3 w-3" />{t("پیشنهادها فقط برای موکل")}</Badge>
                  <span className="text-muted">{relativeTimeJalali(detail.case.createdAt)}</span>
                </div>

                {detail.case.budget && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-primary-soft/50 px-3 py-2.5 text-xs font-bold text-foreground-soft">
                    <Icon name="money" className="h-4 w-4 shrink-0 text-primary" />
                    {tf("بودجهٔ اعلامی موکل: {budget}", { budget: detail.case.budget })}
                  </p>
                )}

                <div className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-4">
                  <h3 className="text-xs font-black text-foreground">{t("توضیحات پرونده")}</h3>
                  <p className="mt-2 whitespace-pre-line text-xs leading-7 text-foreground-soft">
                    {detail.case.description || t("موکل توضیحات تکمیلی ثبت نکرده است.")}
                  </p>
                </div>

                <p className="mt-3 flex items-start gap-2 rounded-xl border border-success/25 bg-success/5 px-3 py-2.5 text-[11px] leading-5 text-foreground-soft">
                  <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {t("نام و شمارهٔ تماس موکل، و نیز پیشنهاد قیمت و گفتگوی همهٔ وکلا کاملاً محرمانه است و فقط موکلِ صاحب پرونده آن‌ها را می‌بیند — وکلا پیشنهادهای یکدیگر را نمی‌بینند.")}
                </p>

                {detail.case.closed ? (
                  <p className="mt-4 rounded-xl border border-border bg-surface-2/60 px-3 py-3 text-center text-xs font-bold text-muted">
                    {t("این پرونده موکلش وکیل را انتخاب کرده و از بازار خارج شده است.")}
                  </p>
                ) : isLawyer ? (
                  /* ─── فرم پیشنهاد وکیل ─── */
                  <div className="mt-4 rounded-2xl border border-border p-4" data-testid="bid-form">
                    {detail.myOffer && (
                      <p className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-[11px] font-bold text-accent-text">
                        <Icon name="check" className="h-3.5 w-3.5" />
                        {t("پیشنهاد شما قبلاً ثبت شده — می‌توانید آن را به‌روزرسانی کنید")}
                      </p>
                    )}
                    {provinceMismatch && (
                      <p className="mb-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] leading-5 text-danger" role="alert">
                        <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {tf("این پرونده در استان شما ({city}) ثبت نشده است؛ پیشنهاد فقط برای پرونده‌های استان خودتان پذیرفته می‌شود.", { city: actor?.city ?? "" })}
                      </p>
                    )}
                    {bidFlash && (
                      <p className="mb-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-xs font-bold text-success" role="status">{bidFlash}</p>
                    )}
                    {bidError && (
                      <p className="mb-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-bold text-danger" role="alert">{bidError}</p>
                    )}
                    <label className="block">
                      <span className="text-xs font-bold text-foreground">{t("نظر و راهکار شما برای این پرونده *")}</span>
                      <textarea
                        value={bidMsg}
                        onChange={(e) => setBidMsg(e.target.value)}
                        rows={3}
                        placeholder={t("چطور این پرونده را پیش می‌برید؟ شانس موفقیت و مسیر پیشنهادی خود را بنویسید…")}
                        className={fieldCls + " mt-1.5 min-h-[80px] resize-y"}
                        aria-label={t("نظر و راهکار شما برای این پرونده *")}
                        data-testid="bid-message"
                      />
                    </label>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <label className="flex-1">
                        <span className="text-xs font-bold text-foreground">{t("پیشنهاد قیمت (تومان) *")}</span>
                        <input
                          value={bidPrice}
                          onChange={(e) => setBidPrice(e.target.value.replace(/[^\d]/g, ""))}
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          placeholder={t("مثلاً 5000000")}
                          className={fieldCls + " mt-1.5 text-end"}
                          aria-label={t("پیشنهاد قیمت (تومان) *")}
                          data-testid="bid-price"
                        />
                        {bidPrice && <span className="mt-1 block text-[10px] text-muted">{tf("{price} تومان", { price: faNum(Number(bidPrice).toLocaleString("en-US")) })}</span>}
                      </label>
                      <Button
                        onClick={submitBid}
                        disabled={bidBusy || provinceMismatch}
                        icon="send"
                        className="shrink-0 self-end"
                        data-testid="bid-submit"
                      >
                        {bidBusy ? t("در حال ثبت…") : detail.myOffer ? t("به‌روزرسانی پیشنهاد") : t("ثبت پیشنهاد قیمت")}
                      </Button>
                    </div>
                    <p className="mt-2 text-[10px] leading-5 text-muted">
                      {t("ثبت پیشنهاد برای وکیل رایگان است؛ پس از انتخاب موکل، گفتگو و توافق مالی مستقیم بین شما و موکل انجام می‌شود.")}
                    </p>
                  </div>
                ) : (
                  /* ─── مهمان / موکل ─── */
                  <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-primary-soft/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black text-foreground">{t("وکیل هستید؟ همین‌جا پیشنهاد قیمت بدهید")}</p>
                      <p className="mt-0.5 text-[11px] leading-5 text-muted">
                        {t("با حساب وکیل وارد شوید و روی پرونده‌های استان خودتان نظر و قیمت ثبت کنید.")}
                      </p>
                    </div>
                    <Button href="/login" size="sm" icon="user" className="shrink-0" data-testid="lawyer-login-cta">
                      {t("ورود وکیل")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
