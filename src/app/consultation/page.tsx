"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Container, Button, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CONSULTATION_TYPES, faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";

const DURATIONS: Record<string, { min: number; price: number }[]> = {
  chat: [{ min: 15, price: 120000 }, { min: 30, price: 200000 }],
  voice: [{ min: 15, price: 250000 }, { min: 30, price: 350000 }, { min: 60, price: 600000 }],
  video: [{ min: 30, price: 500000 }, { min: 60, price: 800000 }],
};

interface LawyerOpt { slug: string; name: string; city: string }
interface Slot { start: string; label: string }

function ConsultationContent() {
  const search = useSearchParams();
  const [type, setType] = useState<"chat" | "voice" | "video">(
    (search.get("type") as "chat" | "voice" | "video") || "chat",
  );
  const [duration, setDuration] = useState(() => {
    const byType = DURATIONS[(search.get("type") as "chat" | "voice" | "video") || "chat"][0].min;
    return byType;
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

  if (result) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-foreground">
            {result.slotLabel ? "نوبت شما ثبت شد" : "درخواست مشاوره ثبت شد"}
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted">{result.message}</p>
          <Card hover={false} className="mt-6 text-right">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm text-muted">شماره پیگیری</span>
              <span className="font-mono text-base font-bold text-primary" dir="ltr">{result.ticketNo}</span>
            </div>
            {result.slotLabel && (
              <div className="mt-3 flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted">زمان نوبت</span>
                <span className="font-bold text-foreground">{result.slotLabel}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted">مبلغ مشاوره</span>
              <span className="font-bold text-foreground">{result.priceLabel}</span>
            </div>
          </Card>

          {/* Payment — must never fake a "paid" state */}
          {result.paymentMode === "sandbox" ? (
            <Card hover={false} className="mt-4 border-accent/40 bg-accent-soft/40 text-right">
              <p className="flex items-center gap-2 text-xs font-bold text-accent">
                <Icon name="bolt" className="h-4 w-4" /> حالت آزمایکی (SANDBOX)
              </p>
              <p className="mt-1.5 text-xs leading-6 text-foreground-soft">
                درگاه واقعی هنوز متصل نشده است. این پرداخت شبیه‌سازی است و هیچ مبلغ واقعی جابه‌جا نمی‌شود.
              </p>
              {paidSandbox ? (
                <p className="mt-3 rounded-xl bg-success/10 px-3 py-2.5 text-xs font-bold text-success">
                  پرداخت آزمایکی تأیید شد (Sandbox — تراکنش واقعی نیست)
                </p>
              ) : (
                <Button onClick={sandboxPay} variant="accent" icon="money" className="mt-3 w-full">
                  پرداخت آزمایکی (Sandbox)
                </Button>
              )}
            </Card>
          ) : (
            <p className="mt-4 rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs leading-6 text-muted">
              وضعیت پرداخت: <span className="font-bold text-foreground">در انتظار تأیید کارشناسان</span> — پس از
              تماس، جزئیات پرداخت شفاف اعلام می‌شود و پیش از آن هیچ مبلغی کسر نخواهد شد.
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/track-case">پیگیری درخواست‌ها</Button>
            <Button href="/lawyers" variant="outline">مشاهده وکلای دیگر</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">رزرو مشاوره</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">رزرو مشاوره حقوقی آنلاین</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            نوع مشاوره، وکیل و زمان واقعی را انتخاب کنید؛ در کمتر از ۲ دقیقه ثبت کنید.
          </p>
        </Container>
      </section>

      <div id="booking-form" className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="space-y-6">
          {/* Type */}
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">۱</span>
              نوع مشاوره را انتخاب کنید
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
                  <span className="text-sm font-bold text-foreground">{c.title}</span>
                  <span className="text-xs text-muted">{c.desc}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Duration + schedule */}
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">۲</span>
              مدت و زمان موردنظر
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
                  <p className="text-sm font-bold text-foreground">{faNum(d.min)} دقیقه</p>
                  <p className="mt-0.5 text-xs text-muted">{faNum(d.price.toLocaleString("en-US"))} ت</p>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">تاریخ</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
              </label>
              {!lawyerSlug ? (
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">ساعت پیشنهادی (اختیاری)</span>
                  <select value={time} onChange={(e) => setTime(e.target.value)} className={fieldCls}>
                    <option value="">ساعت ترجیحی</option>
                    {["۰۹:۰۰ تا ۱۱:۰۰", "۱۱:۰۰ تا ۱۳:۰۰", "۱۴:۰۰ تا ۱۶:۰۰", "۱۶:۰۰ تا ۱۸:۰۰", "۱۸:۰۰ تا ۲۰:۰۰"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">نوبت‌های آزاد (واقعی)</span>
                  <div className="rounded-xl border border-border bg-surface-2/60 p-2.5">
                    {!date ? (
                      <p className="px-1 py-1.5 text-[11px] text-muted">ابتدا تاریخ را انتخاب کنید.</p>
                    ) : !slotsLoaded ? (
                      <p className="px-1 py-1.5 text-[11px] text-muted">در حال بررسی نوبت‌ها…</p>
                    ) : slots.length === 0 ? (
                      <p className="px-1 py-1.5 text-[11px] leading-5 text-muted">
                        برای این روز نوبتی خالی نیست؛ تاریخ دیگری را امتحان کنید.
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
                      نوبت انتخاب‌شده: {selectedSlot?.label}
                    </p>
                  )}
                </div>
              )}
            </div>
            {lawyerSlug && (
              <p className="mt-2 text-[11px] leading-5 text-muted">
                نوبت‌ها از برنامه واقعی وکیل (به وقت تهران) محاسبه می‌شوند و همین‌جا قطعی ثبت می‌شوند.
                اگر نوبتی انتخاب نکنید، زمان توسط کارشناسان با شما هماهنگ می‌شود.
              </p>
            )}
          </Card>

          {/* Contact */}
          <Card hover={false}>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">۳</span>
              اطلاعات تماس و وکیل
            </h2>
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">وکیل موردنظر (اختیاری)</span>
              <select value={lawyerSlug} onChange={(e) => setLawyerSlug(e.target.value)} className={fieldCls}>
                <option value="">بدون وکیل مشخص — معرفی بهترین وکیل توسط کارشناسان</option>
                {lawyers.map((lw) => (
                  <option key={lw.slug} value={lw.slug}>{lw.name} — {lw.city}</option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">نام و نام خانوادگی</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً علی رضایی" className={fieldCls} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">شماره موبایل</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09123456789" dir="ltr" className={fieldCls + " text-right"} />
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">شرح موضوع / سؤال شما</span>
              <textarea value={subject} onChange={(e) => setSubject(e.target.value)} rows={3} placeholder="موضوع مشاوره را به اختصار بنویسید…" className={fieldCls + " h-auto resize-y py-2.5"} />
            </label>
            {error && (
              <div className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{error}</div>
            )}
            <Button onClick={submit} disabled={loading} icon="calendar" className="mt-4 w-full">
              {loading ? "در حال ثبت…" : slot ? "ثبت نهایی نوبت" : "ثبت درخواست مشاوره"}
            </Button>
            <p className="mt-2 text-center text-[11px] text-muted">
              با ثبت، شرایط استفاده دادبان را می‌پذیرید. اطلاعات شما محرمانه است و هیچ مبلغی پیش از تأیید کسر نمی‌شود.
            </p>
          </Card>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card hover={false} className="space-y-4">
            <h3 className="font-bold text-foreground">خلاصه رزرو</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">نوع مشاوره</span>
                <span className="font-medium text-foreground">{CONSULTATION_TYPES.find((c) => c.key === type)?.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">مدت</span>
                <span className="font-medium text-foreground">{faNum(duration)} دقیقه</span>
              </div>
              {lawyerSlug && (
                <div className="flex items-center justify-between">
                  <span className="text-muted">وکیل</span>
                  <span className="font-medium text-foreground">{lawyers.find((l) => l.slug === lawyerSlug)?.name ?? "—"}</span>
                </div>
              )}
              {selectedSlot && (
                <div className="flex items-center justify-between">
                  <span className="text-muted">زمان</span>
                  <span className="font-medium text-success">{selectedSlot.label}</span>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground">مبلغ قابل پرداخت</span>
                <span className="text-lg font-extrabold text-primary">{faNum(price.toLocaleString("en-US"))} <span className="text-xs font-normal">تومان</span></span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-muted">مبلغ نهایی است و هزینه پنهانی وجود ندارد.</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="flex items-start gap-2 text-xs leading-5 text-muted">
                <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                پرداخت پس از تأیید نوبت انجام می‌شود؛ بازگشت وجه طبق سیاست شفاف.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success" icon="shield">بازگشت وجه طبق سیاست شفاف</Badge>
              <Badge tone="primary" icon="lock">محرمانگی</Badge>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function ConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
          در حال بارگذاری…
        </div>
      }
    >
      <ConsultationContent />
    </Suspense>
  );
}
