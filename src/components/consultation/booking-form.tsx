"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container, Button, Card, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { CONSULTATION_TYPES, faNum, faPrice } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { trackEvent } from "@/lib/analytics";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import { FaqAccordion } from "@/components/amazon/faq-accordion";
import { TrustLine } from "@/components/amazon/trust-line";

const DURATIONS: Record<string, { min: number; price: number }[]> = {
  chat: [{ min: 15, price: 120000 }, { min: 30, price: 200000 }],
  voice: [{ min: 15, price: 250000 }, { min: 30, price: 350000 }, { min: 60, price: 600000 }],
  video: [{ min: 30, price: 500000 }, { min: 60, price: 800000 }],
};

interface LawyerOpt {
  slug: string;
  name: string;
  title?: string;
  city: string;
  specialties?: string[];
  rating?: number;
  reviewCount?: number;
  caseCount?: number;
  priceChat?: number;
  responseTime?: string;
  photoUrl: string | null;
  avatarColor: string;
  verified?: boolean;
  experienceYears?: number;
}
/** وکیل انتخاب‌شده — هم‌شکل فیلدهای API /api/lawyers */
type DirectoryLawyer = LawyerOpt;
interface Slot { start: string; label: string }

/**
 * فرم رزرو مشاوره — صفحهٔ اختصاصی /consultation/book
 * از صفحهٔ مشاوره به اینجا منتقل شد تا آن صفحه فقط فهرست وکلا را نشان دهد.
 * دیپ‌لینک‌ها: ?lawyer= &type= &subject= &date= &slot= (+ انکر #booking-form)
 * «وکیل مورد نظر» فقط از فهرست وکلای صفحهٔ مشاوره انتخاب می‌شود و در این فرم غیرقابل تغییر است.
 * فیلد «نوع مورد نیاز مشاوره» حذف شد — موضوع در «شرح موضوع» نوشته می‌شود.
 */
function BookingFormContent() {
  const t = useT();
  const tf = templateT(t);
  const search = useSearchParams();
  const [type, setType] = useState<"chat" | "voice" | "video">(() => {
    const t = search.get("type");
    return t === "voice" || t === "video" || t === "chat" ? t : "chat";
  });
  const [duration, setDuration] = useState(() => {
    const t = search.get("type");
    const key = t === "voice" || t === "video" ? t : "chat";
    return DURATIONS[key][0].min;
  });
  const [lawyerSlug, setLawyerSlug] = useState(search.get("lawyer") ?? "");
  const [lawyers, setLawyers] = useState<LawyerOpt[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(search.get("subject") ?? "");
  const [date, setDate] = useState(search.get("date") ?? "");
  const [time, setTime] = useState("");
  const [slot, setSlot] = useState<string | null>(null); // real ISO slot (when lawyer chosen)
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [onlineSlugs, setOnlineSlugs] = useState<string[]>([]);
  const [barImgFailed, setBarImgFailed] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<{
    ticketNo: string;
    priceLabel: string;
    message: string;
    slotLabel: string | null;
    paymentMode: string;
    paymentStatus: string;
    paymentMessage: string;
  } | null>(null);
  const [paidSandbox, setPaidSandbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("consultation_started");
    fetch("/api/lawyers").then((r) => r.json()).then((d) => {
      if (d.ok) setLawyers(d.lawyers);
    }).catch(() => {});
  }, []);

  /* حضور زندهٔ وکیل انتخاب‌شده — poll سبک هر ۳۰ ثانیه */
  useEffect(() => {
    let alive = true;
    const check = () => {
      fetch("/api/lawyers/presence")
        .then((r) => r.json())
        .then((d) => { if (alive && d.ok) setOnlineSlugs(d.online ?? []); })
        .catch(() => {});
    };
    check();
    const t = setInterval(check, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const changeType = (next: "chat" | "voice" | "video") => {
    setType(next);
    setDuration(DURATIONS[next][0].min);
  };

  // Real slot loading whenever a lawyer + date are chosen
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setSlot(null);
      setSlotsLoaded(false);
      setSlots([]);
    });
    if (!lawyerSlug || !date) return;
    fetch(`/api/availability?lawyer=${encodeURIComponent(lawyerSlug)}&date=${date}&duration=${duration}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.ok) return;
        const newSlots: Slot[] = d.slots ?? [];
        const wanted = search.get("slot");
        const wantedOk = Boolean(wanted && newSlots.some((s) => s.start === wanted));
        setSlots(newSlots);
        setSlotsLoaded(true);
        if (wantedOk && wanted) setSlot(wanted);
      })
      .catch(() => { if (!cancelled) setSlotsLoaded(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawyerSlug, date, duration]);

  const price = DURATIONS[type].find((d) => d.min === duration)?.price ?? DURATIONS[type][0].price;
  const selectedSlot = slots.find((s) => s.start === slot) ?? null;

  // وکیل انتخاب‌شده (از دیپ‌لینک یا select فرم) + وضعیت آنلاین زنده
  const selectedLawyer = lawyers.find((l) => l.slug === lawyerSlug) ?? null;
  const selectedOnline = selectedLawyer ? onlineSlugs.includes(selectedLawyer.slug) : false;

  const submit = async () => {
    setError(null);
    if (!name || !phone || !subject) {
      setError("لطفاً نام، شماره تماس و موضوع را وارد کنید.");
      return;
    }
    trackEvent("booking_started");
    setLoading(true);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyer: lawyerSlug || undefined,
          type,
          duration,
          name,
          phone,
          subject,
          date: date || undefined,
          time: time || undefined,
          startsAt: slot ?? undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        if (data.slotTaken) {
          // refresh the slot list so the user can pick another one
          setSlot(null);
          setSlotsLoaded(false);
          if (lawyerSlug && date) {
            fetch(`/api/availability?lawyer=${encodeURIComponent(lawyerSlug)}&date=${date}&duration=${duration}`)
              .then((r) => r.json())
              .then((d2) => { if (d2.ok) { setSlots(d2.slots ?? []); setSlotsLoaded(true); } })
              .catch(() => setSlotsLoaded(true));
          }
        }
        throw new Error(data.error);
      }
      setResult({
        ticketNo: data.ticketNo,
        priceLabel: data.priceLabel,
        message: data.message,
        slotLabel: selectedSlot?.label ?? null,
        paymentMode: data.payment?.mode ?? "manual",
        paymentStatus: data.payment?.status ?? "pending",
        paymentMessage: data.payment?.message ?? "",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت درخواست");
    } finally {
      setLoading(false);
    }
  };

  /* «وکیل مورد نظر» غیرقابل تغییر است — انتخاب وکیل فقط از فهرست وکلای صفحهٔ مشاوره انجام می‌شود */
  const sandboxPay = async () => {
    if (!result) return;
    trackEvent("payment_started");
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: result.ticketNo }),
    });
    const data = await res.json();
    if (data.ok && data.verified) {
      trackEvent("payment_completed");
      setPaidSandbox(true);
    } else {
      setError(data.error ?? data.message ?? "تأیید پرداخت انجام نشد.");
    }
  };

  const fieldCls =
    "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  /* ───────────── فیلدهای مشترک (هم‌حالت موبایل و دسکتاپ از همین JSX استفاده می‌کنند) ───────────── */

  // «وکیل مورد نظر» — قفل‌شده؛ انتخاب وکیل فقط از فهرست وکلای صفحهٔ مشاوره انجام می‌شود
  const lawyerField = (
    <div className="flex flex-col gap-1.5" data-testid="lawyer-field">
      <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
        {t("وکیل مورد نظر")}
        <Icon name="lock" className="h-3.5 w-3.5 text-muted" aria-hidden />
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">{t("غیرقابل تغییر")}</span>
      </span>
      <div
        data-testid="lawyer-locked"
        aria-readonly="true"
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border-strong bg-surface-2 px-3 text-sm"
      >
        {selectedLawyer ? (
          <span className="truncate font-bold text-foreground">
            {selectedLawyer.name}
            {selectedLawyer.city ? <span className="font-medium text-muted"> — {selectedLawyer.city}</span> : null}
          </span>
        ) : (
          <span className="truncate text-muted">{t("معرفی بهترین وکیل توسط کارشناسان دادورزان")}</span>
        )}
        {selectedLawyer && selectedOnline && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-success">
            <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> {t("آنلاین")}
          </span>
        )}
      </div>
      <span className="text-[11px] leading-5 text-muted">
        {selectedLawyer ? (
          t("وکیل شما از فهرست وکلای صفحهٔ مشاوره انتخاب شده و در این فرم قابل تغییر نیست.")
        ) : (
          <>
            {t("برای انتخاب وکیل، از")}{" "}
            <Link href="/consultation" className="font-bold text-primary underline underline-offset-4">
              {t("فهرست وکلای صفحهٔ مشاوره")}
            </Link>{" "}
            {t("استفاده کنید.")}
          </>
        )}
      </span>
    </div>
  );

  /* ───────────── کارت‌های فرم ───────────── */

  // گام ۱ — نوع مشاوره (متنی/صوتی/تصویری)
  const typeCard = (
    <Card hover={false}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">۱</span>
        {t("نوع مشاوره را انتخاب کنید")}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {CONSULTATION_TYPES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => changeType(c.key)}
            className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-right transition-all cursor-pointer ${
              type === c.key ? "border-primary bg-primary-soft ring-1 ring-primary" : "border-border hover:border-primary/40 hover:bg-surface-2"
            }`}
          >
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${type === c.key ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
              <Icon name={c.icon as IconKey} className="h-5 w-5" />
            </span>
            <span className="text-sm font-bold text-foreground">{t(c.title)}</span>
            <span className="text-xs text-muted">{t(c.desc)}</span>
          </button>
        ))}
      </div>
    </Card>
  );

  // گام ۲ — مدت و زمان موردنظر (در دسکتاپ ستون چپ، بالای خلاصه رزرو)
  const scheduleCard = (
    <Card hover={false} data-testid="schedule-card">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">۲</span>
        {t("مدت و زمان موردنظر")}
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {DURATIONS[type].map((d) => (
          <button
            key={d.min}
            type="button"
            onClick={() => setDuration(d.min)}
            className={`rounded-xl border px-3 py-3 text-center transition-all cursor-pointer ${
              duration === d.min ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"
            }`}
          >
            <p className="text-sm font-bold text-foreground">{tf("{n} دقیقه", { n: faNum(d.min) })}</p>
            <p className="mt-0.5 text-xs text-muted">{faNum(d.price.toLocaleString("en-US"))} ت</p>
          </button>
        ))}
      </div>
      {/* تاریخ تمام‌عرض (تقویم جا می‌شود) و ساعت زیر آن — طبق درخواست کاربر */}
      <div className="mt-4 grid gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">{t("تاریخ (شمسی)")}</span>
          <JalaliDatePicker value={date} onChange={setDate} />
        </div>
        {!lawyerSlug ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">{t("ساعت پیشنهادی (اختیاری)")}</span>
            <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls}>
              <option value="">{t("ساعت ترجیحی")}</option>
              {["۰۹:۰۰ تا ۱۱:۰۰", "۱۱:۰۰ تا ۱۳:۰۰", "۱۴:۰۰ تا ۱۶:۰۰", "۱۶:۰۰ تا ۱۸:۰۰", "۱۸:۰۰ تا ۲۰:۰۰"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">{t("نوبت‌های آزاد (واقعی)")}</span>
            <div className="rounded-xl border border-border bg-surface-2/60 p-2.5">
              {!date ? (
                <p className="px-1 py-1.5 text-[11px] text-muted">{t("ابتدا تاریخ را انتخاب کنید.")}</p>
              ) : !slotsLoaded ? (
                <p className="px-1 py-1.5 text-[11px] text-muted">{t("در حال بررسی نوبت‌ها…")}</p>
              ) : slots.length === 0 ? (
                <p className="px-1 py-1.5 text-[11px] leading-5 text-muted">
                  {t("برای این روز نوبتی خالی نیست؛ تاریخ دیگری را امتحان کنید.")}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => { setSlot(s.start); trackEvent("slot_selected"); }}
                      className={`rounded-lg border px-1 py-2 text-center text-[11px] font-bold transition-colors cursor-pointer ${
                        slot === s.start
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-success/30 bg-success/5 text-success hover:bg-success/10"
                      }`}
                    >
                      {faNum(s.label.split("— ")[1] ?? s.label)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {slot && (
              <p className="text-[11px] font-bold text-success">
                {tf("نوبت انتخاب‌شده: {label}", { label: selectedSlot?.label ?? "" })}
              </p>
            )}
          </div>
        )}
      </div>
      {lawyerSlug && (
        <p className="mt-2 text-[11px] leading-5 text-muted">
          {t("نوبت‌ها از برنامه واقعی وکیل (به وقت تهران) محاسبه می‌شوند و همین‌جا قطعی ثبت می‌شوند.")}{" "}
          {t("اگر نوبتی انتخاب نکنید، زمان توسط کارشناسان با شما هماهنگ می‌شود.")}
        </p>
      )}
    </Card>
  );

  // گام ۳ — اطلاعات تماس و وکیل
  const contactCard = (
    <Card hover={false} data-testid="contact-card">
      <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">۳</span>
        {t("اطلاعات تماس و وکیل")}
      </h2>
      <div className="mt-4">
        {lawyerField}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">{t("نام و نام خانوادگی")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("مثلاً علی رضایی")} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-muted">{t("شماره موبایل")}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className={fieldCls + " text-right"} placeholder="09123456789" />
        </label>
      </div>
      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted">{t("شرح موضوع / سؤال شما")}</span>
        <textarea value={subject} onChange={(e) => setSubject(e.target.value)} rows={3} placeholder={t("موضوع مشاوره را به اختصار بنویسید…")} className={fieldCls + " h-auto resize-y py-2.5"} />
      </label>
      {error && (
        <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{t(error)}</div>
      )}
      <Button onClick={submit} disabled={loading} icon="calendar" className="mt-4 w-full">
        {loading ? t("در حال ثبت…") : slot ? t("ثبت نهایی نوبت") : t("ثبت درخواست مشاوره")}
      </Button>
      <TrustLine compact className="mt-3" />
      <p className="mt-2 text-center text-[11px] text-muted">
        {t("با ثبت، شرایط استفاده دادورزان را می‌پذیرید. اطلاعات شما محرمانه است و هیچ مبلغی پیش از تأیید کسر نمی‌شود.")}
      </p>
    </Card>
  );

  // خلاصه رزرو (در دسکتاپ ستون چپ، زیر مدت‌وزمان)
  const summaryCard = (
    <Card hover={false} className="space-y-4" data-testid="summary-card">
      <h3 className="font-bold text-foreground">{t("خلاصه رزرو")}</h3>
      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">{t("نوع مشاوره")}</span>
          <span className="font-medium text-foreground">{t(CONSULTATION_TYPES.find((c) => c.key === type)?.title ?? "")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted">{t("مدت")}</span>
          <span className="font-medium text-foreground">{tf("{n} دقیقه", { n: faNum(duration) })}</span>
        </div>
        {lawyerSlug && (
          <div className="flex items-center justify-between">
            <span className="text-muted">{t("وکیل")}</span>
            <span className="font-medium text-foreground">{lawyers.find((l) => l.slug === lawyerSlug)?.name ?? "—"}</span>
          </div>
        )}
        {selectedSlot && (
          <div className="flex items-center justify-between">
            <span className="text-muted">{t("زمان")}</span>
            <span className="font-medium text-success">{selectedSlot.label}</span>
          </div>
        )}
      </div>
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">{t("مبلغ قابل پرداخت")}</span>
          <span className="text-lg font-extrabold text-primary">{faNum(price.toLocaleString("en-US"))} <span className="text-xs font-normal">{t("تومان")}</span></span>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-muted">{t("مبلغ نهایی است و هزینه پنهانی وجود ندارد.")}</p>
      </div>
      <div className="rounded-xl bg-surface-2 p-3">
        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          {t("پرداخت پس از تأیید نوبت انجام می‌شود؛ بازگشت وجه طبق سیاست شفاف.")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="success" icon="shield">{t("بازگشت وجه طبق سیاست شفاف")}</Badge>
        <Badge tone="primary" icon="lock">{t("محرمانگی")}</Badge>
      </div>
    </Card>
  );

  // نوار وکیل منتخب — بالای فرم؛ با دیپ‌لینک از فهرست وکلا یا پروفایل وکیل پر می‌شود
  const selectedLawyerBar = selectedLawyer ? (() => {
    const initials = selectedLawyer.name.trim().split(" ").slice(-2).map((w) => w[0]).join("");
    const hasPhoto = !!selectedLawyer.photoUrl && !barImgFailed[selectedLawyer.slug];
    return (
      <div
        data-testid="selected-lawyer-bar"
        className="mb-6 rounded-2xl border border-primary/40 bg-primary-soft p-4"
      >
        <div className="flex flex-wrap items-start gap-3">
          <span className="relative shrink-0">
            {hasPhoto ? (
              <Image
                src={selectedLawyer.photoUrl as string}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-2xl object-cover"
                onError={() => setBarImgFailed((f) => ({ ...f, [selectedLawyer.slug]: true }))}
              />
            ) : (
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${selectedLawyer.avatarColor}, color-mix(in oklab, ${selectedLawyer.avatarColor} 55%, #000))` }}
                aria-hidden
              >
                {initials}
              </span>
            )}
            <span
              title={selectedOnline ? t("آنلاین") : t("آفلاین")}
              className={`absolute -bottom-0.5 -start-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${selectedOnline ? "bg-success" : "bg-border-strong"}`}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-primary">{t("رزرو مشاوره با وکیل منتخب")}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-extrabold text-foreground">
              {selectedLawyer.name}
              {selectedLawyer.verified && (
                <Icon name="badge" className="h-4 w-4 shrink-0 text-primary" aria-label={t("احراز هویت‌شده")} />
              )}
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-muted">
              {[
                t(selectedLawyer.title ?? "وکیل پایه یک دادگستری"),
                selectedLawyer.city,
                selectedLawyer.experienceYears ? tf("{n} سال سابقه", { n: faNum(selectedLawyer.experienceYears) }) : null,
              ].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-end">
            {selectedOnline ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_oklab,var(--success)_14%,transparent)] px-2.5 py-1 text-[11px] font-bold text-success">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> {t("آنلاین")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
                <span className="h-2 w-2 rounded-full bg-border-strong" /> {t("آفلاین")}
              </span>
            )}
            {/* وکیل غیرقابل تغییر است — تغییر فقط با انتخاب وکیل دیگر از فهرست صفحهٔ مشاوره */}
            <Button size="sm" variant="outline" href="/consultation" data-testid="change-lawyer-link">
              {t("تغییر وکیل")}
            </Button>
          </div>
        </div>
        {((selectedLawyer.specialties?.length ?? 0) > 0 || !!selectedLawyer.priceChat) && (
          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-primary/15 pt-3">
            {(selectedLawyer.specialties ?? []).slice(0, 4).map((s) => (
              <Badge key={s} tone="primary">{s}</Badge>
            ))}
            {(selectedLawyer.specialties?.length ?? 0) > 4 && (
              <Badge tone="neutral">+{faNum(selectedLawyer.specialties!.length - 4)}</Badge>
            )}
            {!!selectedLawyer.priceChat && (
              <span className="ms-auto text-[11px] font-bold text-foreground tnum">
                {tf("مشاوره متنی از {price}", { price: faPrice(selectedLawyer.priceChat) })}
              </span>
            )}
          </div>
        )}
      </div>
    );
  })() : null;

  if (result) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-foreground">
            {result.slotLabel ? t("نوبت شما ثبت شد") : t("درخواست مشاوره ثبت شد")}
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted">{t(result.message)}</p>
          <Card hover={false} className="mt-6 text-right">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted">{t("شماره پیگیری")}</span>
              <span className="font-mono text-base font-bold text-primary" dir="ltr">{result.ticketNo}</span>
            </div>
            {result.slotLabel && (
              <div className="mt-3 flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted">{t("زمان نوبت")}</span>
                <span className="font-bold text-foreground">{result.slotLabel}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted">{t("مبلغ مشاوره")}</span>
              <span className="font-bold text-foreground">{result.priceLabel}</span>
            </div>
          </Card>

          {/* Payment — must never fake a "paid" state */}
          {result.paymentMode === "sandbox" ? (
            <Card hover={false} className="mt-4 border-accent/40 bg-accent-soft/40 text-right">
              <p className="flex items-center gap-2 text-xs font-bold text-accent-text">
                <Icon name="bolt" className="h-4 w-4" /> {t("حالت آزمایکی (SANDBOX)")}
              </p>
              <p className="mt-1.5 text-xs leading-6 text-foreground-soft">
                {t("درگاه واقعی هنوز متصل نشده است. این پرداخت شبیه‌سازی است و هیچ مبلغ واقعی جابه‌جا نمی‌شود.")}
              </p>
              {paidSandbox ? (
                <p className="mt-3 rounded-xl bg-success/10 px-3 py-2.5 text-xs font-bold text-success">
                  {t("پرداخت آزمایکی تأیید شد (Sandbox — تراکنش واقعی نیست)")}
                </p>
              ) : (
                <Button onClick={sandboxPay} variant="accent" icon="money" className="mt-3 w-full">
                  {t("پرداخت آزمایکی (Sandbox)")}
                </Button>
              )}
            </Card>
          ) : (
            <p className="mt-4 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs leading-6 text-muted">
              {t("وضعیت پرداخت:")} <span className="font-bold text-foreground">{t("در انتظار تأیید کارشناسان")}</span>{t(" — پس از تماس، جزئیات پرداخت شفاف اعلام می‌شود و پیش از آن هیچ مبلغی کسر نخواهد شد.")}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/track-case">{t("پیگیری درخواست‌ها")}</Button>
            <Button href="/consultation" variant="outline">{t("مشاهده وکلای دیگر")}</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-booking.png"
        title={t("تکمیل رزرو مشاوره")}
        desc={t("نوع مشاوره و زمان را انتخاب کنید؛ در کمتر از ۲ دقیقه ثبت می‌شود.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("مشاوره"), href: "/consultation" }, { label: t("رزرو مشاوره") }]}
      />

      <div id="booking-form" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6 lg:scroll-mt-22 lg:px-8">
        {selectedLawyerBar}
        {/* موبایل/تبلت — ترتیب طبیعی: ۱ نوع مشاوره → ۲ مدت‌وزمان → ۳ تماس → خلاصه */}
        <div className="grid gap-6 lg:hidden" data-testid="mobile-flow">
          {typeCard}
          {scheduleCard}
          {contactCard}
          {summaryCard}
        </div>

        {/* دسکتاپ — راست: نوع مشاوره + اطلاعات تماس | چپ: مدت‌وزمان + خلاصه رزرو (چسبان) */}
        <div className="hidden gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start" data-testid="desktop-grid">
          <div className="grid gap-6">
            {typeCard}
            {contactCard}
          </div>
          <div className="grid gap-6">
            {scheduleCard}
            <div className="self-start lg:sticky lg:top-20">
              {summaryCard}
            </div>
          </div>
        </div>
      </div>

      {/* پرسش‌های متداول — کاهش تردید لحظه آخر (سبک Customer Q&A آمازون) */}
      <div className="mt-10">
        <FaqAccordion
          items={[
            { q: t("چطور وکیل مناسب را انتخاب کنم؟"), a: t("امتیاز واقعی، تعداد پرونده‌ها، سابقه و تعرفه شفاف هر وکیل در پروفایلش نمایش داده می‌شود؛ می‌توانید چند وکیل را مقایسه کنید و بهترین را انتخاب کنید.") },
            { q: t("پرداخت چه زمانی انجام می‌شود؟"), a: t("هیچ مبلغی قبل از تأیید نوبت کسر نمی‌شود. پرداخت امن داخل سایت انجام می‌گیرد و طبق سیاست شفاف، در صورت ارائه‌نشدن خدمت، وجه بازگردانده می‌شود.") },
            { q: t("اطلاعات من محرمانه می‌ماند؟"), a: t("بله. اطلاعات شما طبق سیاست حریم خصوصی فقط برای انجام همان مشاوره استفاده می‌شود و در اختیار هیچ شخص ثالثی قرار نمی‌گیرد.") },
            { q: t("اگر از مشاوره راضی نبودم چه کنم؟"), a: t("تیم پشتیبانی دادورزان در صورت بروز اختلاف، رسیدگی بی‌طرفانه انجام می‌دهد و مطابق سیاست بازگشت وجه عمل می‌کند.") },
          ]}
        />
      </div>
    </>
  );
}

export default function BookingForm() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
          <SuspenseFallbackText />
        </div>
      }
    >
      <BookingFormContent />
    </Suspense>
  );
}

function SuspenseFallbackText() {
  const t = useT();
  return <>{t("در حال بارگذاری…")}</>;
}
