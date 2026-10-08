"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container, Card, Badge, Button, StarRating } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import { formatJalaliDateTime, relativeTimeJalali } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * «پیشنهاد وکلای استان شما» — موکل با شمارهٔ پرونده + کد پیگیری محرمانه وارد می‌شود:
 * ۱) نظر و قیمت هر وکیل همان استان را می‌بیند؛
 * ۲) یکی را تأیید می‌کند؛
 * ۳) روی پیشنهادِ تأییدشده، پاسخ پیام وکیل را رایگان می‌دهد (گفتگو ادامه دارد).
 */

interface Reply {
  id: number;
  sender: string;
  body: string;
  createdAt: string;
}

interface Offer {
  id: number;
  message: string;
  price: number;
  status: string;
  createdAt: string;
  lawyerName: string;
  lawyerSlug: string;
  lawyerCity: string;
  lawyerRating: number | null;
  lawyerVerified: boolean | null;
  lawyerPhoto: string | null;
  lawyerAvatar: string;
  replies: Reply[];
}

interface Payload {
  ok: boolean;
  error?: string;
  case?: { caseNumber: string; subject: string; city: string; stage: string };
  offers?: Offer[];
}

function OffersContent() {
  const search = useSearchParams();
  const cn = search.get("cn") ?? "";
  const token = search.get("t") ?? "";
  const t = useT();
  const tf = templateT(t);

  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [sending, setSending] = useState(false);
  const seenReply = useRef<number>(-1);

  const hasParams = Boolean(cn && token);

  const load = useCallback(() => {
    if (!cn || !token) return;
    fetch(`/api/cases/offers?caseNumber=${encodeURIComponent(cn)}&token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Payload) => {
        if (!d.ok) {
          setError(d.error ?? t("دریافت پیشنهادها ناموفق بود."));
          return;
        }
        setError(null);
        setData(d);
      })
      .catch(() => setError(t("ارتباط برقرار نشد؛ اتصال اینترنت را بررسی کنید.")));
  }, [cn, token]);

  useEffect(() => {
    if (!hasParams) return;
    queueMicrotask(load);
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load, hasParams]);

  const accept = async (offerId: number) => {
    setAccepting(offerId);
    try {
      const res = await fetch("/api/cases/offers/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNumber: cn, token, offerId }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setAccepted(true);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("انتخاب انجام نشد."));
    } finally {
      setAccepting(null);
    }
  };

  const sendReply = async (offerId: number) => {
    if (!replyDraft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/cases/offers/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNumber: cn, token, offerId, body: replyDraft }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setReplyDraft("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ارسال پاسخ انجام نشد."));
    } finally {
      setSending(false);
    }
  };

  if (!hasParams) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
            <Icon name="lock" className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-foreground">{t("کد پیگیری لازم است")}</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            {t("برای دیدن پیشنهاد وکلا، شمارهٔ پرونده و کد پیگیری محرمانه‌ای که هنگام ثبت پرونده گرفته‌اید لازم است.")}
            {" "}
            {t("لینک کامل را از صفحهٔ پرداخت یا پیگیری پرونده باز کنید.")}
          </p>
          <Button href="/track-case" variant="outline" className="mt-5">{t("پیگیری پرونده")}</Button>
        </div>
      </Container>
    );
  }

  const offers = data?.offers ?? [];
  const chosen = offers.find((o) => o.status === "accepted") ?? null;
  const fieldCls =
    "w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <Container className="py-10">
      <div className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-1.5 text-xs text-muted" aria-label={t("مسیر صفحه")}>
          <Link href="/" className="hover:text-primary">{t("خانه")}</Link>
          <Icon name="chevron" className="h-3 w-3 rotate-180" />
          <Link href="/track-case" className="hover:text-primary">{t("پیگیری پرونده")}</Link>
          <Icon name="chevron" className="h-3 w-3 rotate-180" />
          <span className="text-foreground-soft">{t("پیشنهاد وکلا")}</span>
        </nav>
        <h1 className="mt-3 text-2xl font-extrabold text-foreground">{t("پیشنهاد وکلای استان شما")}</h1>
        {data?.case && (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="font-bold text-foreground">{data.case.subject}</span>
            <span className="inline-flex items-center gap-1"><Icon name="location" className="h-3.5 w-3.5" />{data.case.city}</span>
            <span dir="ltr" className="font-mono text-xs">{data.case.caseNumber}</span>
          </p>
        )}

        {accepted && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 px-3 py-2.5 text-xs font-bold text-success" role="status">
            <Icon name="check" className="h-4 w-4" /> {t("وکیل انتخاب شد — حالا می‌توانید پاسخ پیام او را رایگان بدهید.")}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs font-bold text-danger" role="alert">{error}</p>
        )}

        {/* پیشنهاد انتخاب‌شده — گفتگوی رایگان */}
        {chosen && (
          <Card hover={false} className="mt-6 border-success/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon name="chat" className="h-4 w-4 text-success" /> {tf("گفتگو با {n}", { n: chosen.lawyerName })}
              </h2>
              <Badge tone="success" icon="check">{t("انتخاب شما")}</Badge>
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {chosen.replies.length === 0 && (
                <p className="rounded-xl bg-surface-2/60 px-3 py-2.5 text-xs leading-6 text-muted">
                  {t("پیام وکیل در کارت زیر است؛ پاسخ شما همان‌جا ثبت می‌شود و وکیل متوجه می‌شود.")}
                </p>
              )}
              {chosen.replies.map((r) => (
                <div
                  key={r.id}
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-6 ${
                    r.sender === "client"
                      ? "ms-auto bg-primary text-primary-foreground"
                      : "bg-surface-2 text-foreground"
                  }`}
                >
                  <span className="block font-bold">{r.sender === "client" ? t("شما") : chosen.lawyerName}</span>
                  {r.body}
                  <span className={`mt-1 block text-[10px] ${r.sender === "client" ? "text-primary-foreground/70" : "text-muted"}`}>
                    {formatJalaliDateTime(r.createdAt)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(chosen.id); } }}
                placeholder={t("پاسخ شما به وکیل — رایگان…")}
                className={fieldCls}
                aria-label={t("پاسخ شما به وکیل")}
              />
              <Button onClick={() => sendReply(chosen.id)} disabled={sending || !replyDraft.trim()} icon="chat" className="shrink-0">
                {sending ? "…" : t("ارسال")}
              </Button>
            </div>
          </Card>
        )}

        {/* همهٔ پیشنهادها */}
        <h2 className="mt-8 text-sm font-bold text-foreground">
          {t("نظر و قیمت وکلا")} {offers.length > 0 && <span className="text-muted">({tf("{n} پیشنهاد", { n: faNum(offers.length) })})</span>}
        </h2>
        <div className="mt-3 space-y-3" data-testid="offers-list">
          {!data && !error && <p className="rounded-xl border border-border bg-surface-2/40 px-4 py-6 text-center text-xs text-muted">{t("در حال دریافت پیشنهادها…")}</p>}
          {data && offers.length === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs leading-6 text-muted">
              {tf("هنوز وکیلی برای این پرونده پیشنهاد ثبت نکرده است. وکلای «{city}» به‌محض بررسی پرونده، نظر و قیمت خود را همین‌جا ثبت می‌کنند — این صفحه را بعداً دوباره باز کنید.", { city: data.case?.city ?? "" })}
            </p>
          )}
          {offers.filter((o) => o.status !== "accepted").map((o) => {
            const isDeclined = o.status === "declined";
            return (
              <Card key={o.id} hover={false} className={isDeclined ? "opacity-60" : ""}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ background: o.lawyerAvatar }}
                      aria-hidden
                    >
                      {o.lawyerName.trim().split(" ").slice(-1)[0]?.[0] ?? "؟"}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        {o.lawyerName}
                        {o.lawyerVerified && <Icon name="badge" className="h-3.5 w-3.5 text-primary" aria-label={t("احراز هویت‌شده")} />}
                        {isDeclined && <Badge tone="neutral">{t("ردشده")}</Badge>}
                      </p>
                      <p className="text-[11px] text-muted">{o.lawyerCity}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-extrabold text-primary tnum">{o.price > 0 ? faPrice(o.price) : t("توافقی")}</p>
                    <p className="text-[10px] text-muted">{relativeTimeJalali(o.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-3 rounded-xl bg-surface-2/60 px-3 py-2.5 text-xs leading-6 text-foreground-soft">{o.message}</p>
                {o.lawyerRating != null && <div className="mt-2"><StarRating rating={o.lawyerRating} /></div>}
                {!isDeclined && !chosen && (
                  <Button
                    onClick={() => accept(o.id)}
                    disabled={accepting !== null}
                    icon="check"
                    size="sm"
                    className="mt-3"
                    data-testid={`accept-${o.id}`}
                  >
                    {accepting === o.id ? t("در حال انتخاب…") : t("انتخاب این وکیل")}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] leading-5 text-muted">
          {t("انتخاب وکیل هیچ هزینه‌ای ندارد و پاسخ دادن به پیام وکیلِ انتخابی هم رایگان است؛ پرداخت فقط طبق توافق با همان وکیل انجام می‌شود.")}
        </p>
      </div>
    </Container>
  );
}

export default function CaseOffersPage() {
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">{t("در حال بارگذاری…")}</div>
      }
    >
      <OffersContent />
    </Suspense>
  );
}
