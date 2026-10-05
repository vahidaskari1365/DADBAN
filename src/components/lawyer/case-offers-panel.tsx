"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import { relativeTimeJalali, formatJalaliDateTime } from "@/lib/jalali";

/**
 * پیشنهادهای پروندهٔ استان — وکیل پرونده‌های جدید استان خودش را می‌بیند،
 * نظر + قیمت اعلامی ثبت می‌کند و پاسخ‌های موکل را همان‌جا می‌خواند.
 */

interface Reply { id: number; sender: string; body: string; createdAt: string }
interface MyOffer { id: number; message: string; price: number; status: string; createdAt: string; replies: Reply[] }
interface NewCase {
  id: number;
  caseNumber: string;
  subject: string;
  description: string;
  city: string;
  stage: string;
  status: string;
  createdAt: string;
  myOffer: MyOffer | null;
}

const STATUS_FA: Record<string, string> = {
  sent: "ارسال‌شده",
  accepted: "انتخاب‌شده توسط موکل",
  declined: "ردشده",
};

export function CaseOffersPanel() {
  const [cases, setCases] = useState<NewCase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unauthed, setUnauthed] = useState(false);
  const [message, setMessage] = useState<Record<number, string>>({});
  const [price, setPrice] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});
  const [replyBusy, setReplyBusy] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch("/api/cases/offers", { cache: "no-store" })
      .then(async (r) => ({ status: r.status, data: await r.json() }))
      .then(({ status, data: d }) => {
        if (!d.ok) {
          if (status === 401) setUnauthed(true);
          return;
        }
        setUnauthed(false);
        setCases(d.newCases ?? []);
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const submit = async (caseId: number) => {
    setError(null);
    setFlash(null);
    const msg = (message[caseId] ?? "").trim();
    const pr = Number(price[caseId]) || 0;
    if (!msg) {
      setError("نظر خود را دربارهٔ پرونده بنویسید.");
      return;
    }
    setSending(caseId);
    try {
      const res = await fetch("/api/cases/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, message: msg, price: pr }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setFlash(d.message);
      setMessage((m) => ({ ...m, [caseId]: "" }));
      setPrice((p) => ({ ...p, [caseId]: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت پیشنهاد انجام نشد.");
    } finally {
      setSending(null);
    }
  };

  const sendReply = async (offerId: number) => {
    const body = (replyDraft[offerId] ?? "").trim();
    if (!body) return;
    setReplyBusy(offerId);
    setError(null);
    try {
      const res = await fetch("/api/cases/offers/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, body }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setReplyDraft((r) => ({ ...r, [offerId]: "" }));
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ارسال پاسخ انجام نشد.");
    } finally {
      setReplyBusy(null);
    }
  };

  if (unauthed) return null;

  return (
    <Card hover={false} id="offers" className="scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="mail" className="h-5 w-5 text-accent-text" /> درخواست پرونده‌های استان شما
        </h2>
        {cases.length > 0 && <Badge tone="accent">{faNum(cases.length)} پرونده</Badge>}
      </div>
      <p className="mt-1 text-xs leading-6 text-muted">
        پرونده‌های تازه در استان شما — نظر و قیمت خود را اعلام کنید؛ موکل بهترین گزینه را انتخاب می‌کند و گفتگو رایگان ادامه می‌یابد.
      </p>

      {flash && <p className="mt-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-xs font-bold text-success" role="status">{flash}</p>}
      {error && <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-bold text-danger" role="alert">{error}</p>}

      {!loaded ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">در حال دریافت درخواست‌ها…</p>
      ) : cases.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          در حال حاضر پروندهٔ جدیدی در استان شما ثبت نشده است.
        </p>
      ) : (
        <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pl-1" data-testid="offers-panel">
          {cases.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-surface-2/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{c.subject}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                    <span dir="ltr" className="font-mono">{c.caseNumber}</span>
                    <span className="inline-flex items-center gap-0.5"><Icon name="location" className="h-3 w-3" />{c.city}</span>
                    <Badge tone="neutral">{c.stage}</Badge>
                    <span>{relativeTimeJalali(c.createdAt)}</span>
                  </p>
                  {c.description && <p className="mt-1 line-clamp-2 text-xs leading-6 text-foreground-soft">{c.description}</p>}
                </div>
                {c.myOffer && (
                  <Badge tone={c.myOffer.status === "accepted" ? "success" : c.myOffer.status === "declined" ? "neutral" : "primary"}>
                    {STATUS_FA[c.myOffer.status] ?? c.myOffer.status}
                  </Badge>
                )}
              </div>

              {c.myOffer ? (
                <div className="mt-2 rounded-xl border border-border bg-surface p-2.5">
                  <p className="text-[11px] text-muted">
                    پیشنهاد شما: {c.myOffer.message} — <span className="font-bold text-foreground">{c.myOffer.price > 0 ? faPrice(c.myOffer.price) : "توافقی"}</span>
                  </p>
                  {c.myOffer.replies.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {c.myOffer.replies.map((r) => (
                        <p
                          key={r.id}
                          className={`rounded-lg px-2.5 py-1.5 text-[11px] leading-5 ${
                            r.sender === "client" ? "bg-primary-soft text-foreground" : "bg-surface-2 text-muted"
                          }`}
                        >
                          <span className="font-bold">{r.sender === "client" ? "موکل" : "شما"}:</span> {r.body}
                          <span className="ms-1 text-[9px] text-muted">{formatJalaliDateTime(r.createdAt)}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {c.myOffer.status === "accepted" && (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={replyDraft[c.myOffer.id] ?? ""}
                        onChange={(e) => setReplyDraft((r) => ({ ...r, [c.myOffer!.id]: e.target.value }))}
                        placeholder="پاسخ به موکل…"
                        className="h-10 w-full rounded-xl border border-border-strong bg-background px-3 text-xs outline-none focus:border-primary"
                        aria-label="پاسخ به موکل"
                      />
                      <Button size="sm" onClick={() => sendReply(c.myOffer!.id)} disabled={replyBusy === c.myOffer!.id} className="shrink-0">
                        ارسال
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={message[c.id] ?? ""}
                    onChange={(e) => setMessage((m) => ({ ...m, [c.id]: e.target.value }))}
                    rows={2}
                    placeholder="نظر شما دربارهٔ این پرونده و راه پیشنهادی شما…"
                    className="w-full resize-y rounded-xl border border-border-strong bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                    aria-label={`نظر شما دربارهٔ پرونده ${c.caseNumber}`}
                  />
                  <div className="flex gap-2">
                    <input
                      value={price[c.id] ?? ""}
                      onChange={(e) => setPrice((p) => ({ ...p, [c.id]: e.target.value }))}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="قیمت اعلامی (تومان)"
                      className="h-10 w-full rounded-xl border border-border-strong bg-background px-3 text-xs outline-none focus:border-primary"
                      aria-label="قیمت اعلامی به تومان"
                    />
                    <Button size="sm" onClick={() => submit(c.id)} disabled={sending === c.id} icon="check" className="shrink-0">
                      {sending === c.id ? "…" : "ثبت پیشنهاد"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
