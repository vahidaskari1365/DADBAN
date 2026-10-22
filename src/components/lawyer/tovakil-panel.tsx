"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { LEGAL_TOPICS } from "@/lib/data";
import { formatJalali } from "@/lib/jalali";

/* ================= شکل داده‌ها (هماهنگ با GET /api/tovakil) ================= */
type MarketCase = {
  id: number;
  caseNumber: string;
  subject: string;
  description: string;
  topic: string;
  city: string;
  budget: string;
  status: string;
  createdAt: string;
  ownerId: number;
  ownerName: string;
  ownerSlug: string;
  ownerTitle: string;
  ownerCity: string;
  requests: number;
};
type MyCase = Omit<MarketCase, "ownerId" | "ownerName" | "ownerSlug" | "ownerTitle" | "ownerCity"> & {
  assignedLawyerId: number | null;
};
type MyRequest = {
  id: number;
  caseId: number;
  status: string;
  message: string;
  price: string;
  createdAt: string;
  subject: string;
  caseNumber: string;
  caseStatus: string;
};
type Incoming = {
  id: number;
  caseId: number;
  message: string;
  price: string;
  status: string;
  createdAt: string;
  lawyerId: number;
  lawyerName: string;
  lawyerSlug: string;
  lawyerCity: string;
  lawyerTitle: string;
  lawyerVerified: boolean;
};

const faDate = (d: string) => formatJalali(d);

const STATUS_FA: Record<string, { label: string; cls: string }> = {
  open: { label: "باز — منتظر وکیل", cls: "bg-success/15 text-success" },
  assigned: { label: "واگذار شده", cls: "bg-primary-soft text-primary" },
  closed: { label: "بسته", cls: "bg-surface-2 text-muted" },
};

export function TovakilPanel({ verified }: { verified: boolean }) {
  const [tab, setTab] = useState<"market" | "mine">("market");
  const [market, setMarket] = useState<MarketCase[]>([]);
  const [mine, setMine] = useState<MyCase[]>([]);
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", topic: "", city: "", budget: "" });
  const [busy, setBusy] = useState(false);

  const [reqFor, setReqFor] = useState<MarketCase | null>(null);
  const [reqMsg, setReqMsg] = useState("");
  const [reqPrice, setReqPrice] = useState("");

  const load = useCallback(async () => {
    // بدون setState همگام در ابتدای اثر — همهٔ آپدیت‌ها بعد از await انجام می‌شود
    try {
      const res = await fetch("/api/tovakil", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setMarket(data.market ?? []);
        setMine(data.mine ?? []);
        setMyRequests(data.myRequests ?? []);
        setIncoming(data.incoming ?? []);
      } else {
        setNotice({ type: "err", text: data?.error ?? "بارگیری توکیل ممکن نشد." });
      }
    } catch {
      setNotice({ type: "err", text: "خطای شبکه؛ دوباره تلاش کنید." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tovakil", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.ok) {
          setMarket(data.market ?? []);
          setMine(data.mine ?? []);
          setMyRequests(data.myRequests ?? []);
          setIncoming(data.incoming ?? []);
        } else {
          setNotice({ type: "err", text: data?.error ?? "بارگیری توکیل ممکن نشد." });
        }
      } catch {
        if (!cancelled) setNotice({ type: "err", text: "خطای شبکه؛ دوباره تلاش کنید." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const createCase = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/tovakil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setNotice({ type: "err", text: data?.error ?? "ثبت پرونده ممکن نشد." });
        return;
      }
      setNotice({ type: "ok", text: "پرونده در توکیل ثبت شد؛ همکاران درخواست می‌دهند و شما انتخاب می‌کنید." });
      setForm({ subject: "", description: "", topic: "", city: "", budget: "" });
      setShowForm(false);
      void load();
    } finally {
      setBusy(false);
    }
  };

  const sendRequest = async () => {
    if (!reqFor) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/tovakil/${reqFor.id}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reqMsg, price: reqPrice }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setNotice({ type: "err", text: data?.error ?? "ثبت درخواست ممکن نشد." });
        return;
      }
      setNotice({ type: "ok", text: "درخواست شما ثبت شد؛ نتیجه را در «درخواست‌های من» می‌بینید." });
      setReqFor(null);
      setReqMsg("");
      setReqPrice("");
      void load();
    } finally {
      setBusy(false);
    }
  };

  const assign = async (caseId: number, requestId: number) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/tovakil/${caseId}/requests`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setNotice({ type: "err", text: data?.error ?? "واگذاری ممکن نشد." });
        return;
      }
      setNotice({ type: "ok", text: "پرونده واگذار شد؛ به همکار و موکل اطلاع داده می‌شود." });
      void load();
    } finally {
      setBusy(false);
    }
  };

  const act = async (caseId: number, action: "close" | "reopen" | "unassign") => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/tovakil/${caseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setNotice({ type: "err", text: data?.error ?? "اقدام ممکن نشد." });
        return;
      }
      void load();
    } finally {
      setBusy(false);
    }
  };

  const cityInput = (
    <input
      value={form.city}
      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
      placeholder="مثلاً تهران"
      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
    />
  );

  return (
    <div data-testid="tovakil-panel">
      {/* هدر + تب‌ها */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
            <Icon name="link" className="h-5 w-5 text-primary" /> توکیل — واگذاری پرونده بین وکلا
          </h2>
          <p className="mt-1 text-xs leading-6 text-muted">
            پرونده‌ای که وقت یا شعبه‌ای در آن شهر ندارید را در توکیل ثبت کنید؛ همکاران درخواست می‌دهند و شما بهترین را انتخاب می‌کنید. این بخش فقط برای وکلاست.
          </p>
        </div>
        <button
          type="button"
          data-testid="tovakil-new"
          onClick={() => setShowForm((v) => !v)}
          disabled={!verified}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          <Icon name="plus" className="h-4 w-4" /> ثبت پرونده در توکیل
        </button>
      </div>

      {!verified && (
        <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs font-semibold leading-6 text-warning">
          تا زمان تأیید شماره پروانه، ثبت پرونده در توکیل غیرفعال است.
        </p>
      )}

      {/* تب‌ها */}
      <div className="mt-4 flex gap-2" role="tablist" aria-label="بخش‌های توکیل">
        {[
          { key: "market" as const, label: `پرونده‌های باز (${new Intl.NumberFormat("fa-IR").format(market.length)})` },
          { key: "mine" as const, label: `پرونده‌های من (${new Intl.NumberFormat("fa-IR").format(mine.length)})` },
        ].map((x) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={tab === x.key}
            onClick={() => setTab(x.key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              tab === x.key ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground-soft hover:text-foreground"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {notice && (
        <p
          role="status"
          className={`mt-3 rounded-xl border px-4 py-3 text-xs font-semibold leading-6 ${
            notice.type === "ok" ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning"
          }`}
        >
          {notice.text}
        </p>
      )}

      {/* فرم ثبت پرونده */}
      {showForm && (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h3 className="text-sm font-black text-foreground">ثبت پرونده برای واگذاری</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-foreground">موضوع پرونده *</span>
              <input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="مثلاً دعوای مطالبه مهریه — دادگاه خانواده کرج"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-foreground">موضوع حقوقی</span>
              <select
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              >
                <option value="">— انتخاب کنید —</option>
                {LEGAL_TOPICS.map((t) => (
                  <option key={t.label} value={t.label}>{t.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-foreground">شهر دادگاه</span>
              {cityInput}
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-foreground">بودجه/حق‌الوکاله (اختیاری)</span>
              <input
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                placeholder="مثلاً ۳۰ میلیون تومان یا توافقی"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-bold text-foreground">شرح پرونده * (بدون نام موکل)</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="خلاصه پرونده، مرحله رسیدگی، اسناد موجود و هر نکته‌ای که همکار لازم دارد — حریم خصوصی: نام موکل و شماره تماس را ننویسید."
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-7 text-foreground outline-none focus:border-primary/50"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={createCase}
              disabled={busy}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {busy ? "در حال ثبت…" : "ثبت در توکیل"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground-soft hover:text-foreground"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* درخواست‌های دریافتی (روی پرونده‌های من) */}
      {incoming.length > 0 && (
        <div className="mt-5 rounded-2xl border border-accent/40 bg-accent-soft/30 p-4">
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <Icon name="mail" className="h-4 w-4 text-accent-text" />
            درخواست‌های دریافتی ({new Intl.NumberFormat("fa-IR").format(incoming.length)})
          </h3>
          <div className="mt-3 space-y-2">
            {incoming.map((r) => {
              const ownerCase = mine.find((m) => m.id === r.caseId);
              return (
                <div key={r.id} data-testid="tovakil-incoming" className="rounded-xl border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">
                      {r.lawyerName} <span className="text-xs font-normal text-muted">— {r.lawyerTitle}، {r.lawyerCity}</span>
                    </p>
                    <span className="text-[11px] text-muted">{faDate(r.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-foreground-soft">{r.message}</p>
                  {r.price && <p className="mt-1 text-xs font-bold text-primary">حق‌الوکاله پیشنهادی: {r.price}</p>}
                  {ownerCase && (
                    <p className="mt-1 text-[11px] text-muted">
                      برای پرونده: {ownerCase.subject}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => assign(r.caseId, r.id)}
                    disabled={busy || !ownerCase || ownerCase.status !== "open"}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <Icon name="handshake" className="h-3.5 w-3.5" /> واگذاری پرونده به این وکیل
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* لیست‌ها */}
      {loading ? (
        <div className="mt-5 space-y-2" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      ) : tab === "market" ? (
        <div className="mt-4 space-y-3">
          {market.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
              فعلاً پروندهٔ بازی در توکیل نیست — اولین نفر باشید؛ دکمهٔ «ثبت پرونده در توکیل» را بزنید.
            </p>
          ) : (
            market.map((c) => (
              <article key={c.id} data-testid="tovakil-market-item" className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-foreground">{c.subject}</h4>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_FA[c.status]?.cls ?? "bg-surface-2 text-muted"}`}>
                    {STATUS_FA[c.status]?.label ?? c.status}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-3 text-xs leading-6 text-foreground-soft">{c.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                  {c.topic && <span className="inline-flex items-center gap-1"><Icon name="scale" className="h-3 w-3" /> {c.topic}</span>}
                  {c.city && <span className="inline-flex items-center gap-1"><Icon name="location" className="h-3 w-3" /> {c.city}</span>}
                  {c.budget && <span className="inline-flex items-center gap-1"><Icon name="coins" className="h-3 w-3" /> {c.budget}</span>}
                  <span className="inline-flex items-center gap-1"><Icon name="user" className="h-3 w-3" /> معرفی‌کننده: {c.ownerName} — {c.ownerCity}</span>
                  <span>{faDate(c.createdAt)}</span>
                </div>
                {c.status === "open" && (
                  <button
                    type="button"
                    onClick={() => setReqFor(c)}
                    disabled={!verified}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  >
                    <Icon name="send" className="h-3.5 w-3.5" /> درخواست توکیل این پرونده
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {/* درخواست‌های خودم */}
          {myRequests.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-4">
              <h3 className="text-sm font-black text-foreground">درخواست‌های من از همکاران</h3>
              <div className="mt-2 space-y-2">
                {myRequests.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-xs">
                    <span className="font-bold text-foreground">{r.subject}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === "accepted" ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`}>
                      {r.status === "accepted" ? "پذیرفته شد ✓" : "در انتظار پاسخ"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mine.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
              هنوز پرونده‌ای در توکیل ثبت نکرده‌اید.
            </p>
          ) : (
            mine.map((c) => (
              <article key={c.id} data-testid="tovakil-my-item" className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-foreground">{c.subject}</h4>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_FA[c.status]?.cls ?? "bg-surface-2 text-muted"}`}>
                    {STATUS_FA[c.status]?.label ?? c.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1"><Icon name="mail" className="h-3 w-3" /> {c.requests} درخواست فعال</span>
                  <span className="font-mono">{c.caseNumber}</span>
                  <span>{faDate(c.createdAt)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.status === "open" && (
                    <button
                      type="button"
                      onClick={() => act(c.id, "close")}
                      disabled={busy}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground-soft hover:text-foreground"
                    >
                      بستن پرونده
                    </button>
                  )}
                  {c.status === "assigned" && (
                    <>
                      <button
                        type="button"
                        onClick={() => act(c.id, "unassign")}
                        disabled={busy}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground-soft hover:text-foreground"
                      >
                        لغو واگذاری
                      </button>
                      <button
                        type="button"
                        onClick={() => act(c.id, "close")}
                        disabled={busy}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground-soft hover:text-foreground"
                      >
                        بستن پرونده
                      </button>
                    </>
                  )}
                  {c.status === "closed" && (
                    <button
                      type="button"
                      onClick={() => act(c.id, "reopen")}
                      disabled={busy}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground-soft hover:text-foreground"
                    >
                      بازگشایی
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* دیالوگ درخواست توکیل */}
      {reqFor && (
        <div role="dialog" aria-modal="true" aria-label="درخواست توکیل" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-black text-foreground">درخواست توکیل: {reqFor.subject}</h3>
              <button type="button" onClick={() => setReqFor(null)} aria-label="بستن" className="rounded-lg p-1 text-muted hover:bg-surface">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-6 text-muted">
              درخواست شما مستقیم برای وکیل معرفی‌کننده ارسال می‌شود. اگر انتخاب شوید، پرونده به شما واگذار می‌شود و هماهنگی هزینه و مدارک را مستقیم با همکار انجام می‌دهید.
            </p>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-bold text-foreground">چرا شما مناسب این پرونده هستید؟ *</span>
              <textarea
                value={reqMsg}
                onChange={(e) => setReqMsg(e.target.value)}
                rows={4}
                placeholder="سابقه در همین نوع پرونده، سابقه دادگاه همان شهر، آمادگی زمانی…"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-7 text-foreground outline-none focus:border-primary/50"
              />
            </label>
            <label className="mt-2 block">
              <span className="mb-1 block text-xs font-bold text-foreground">حق‌الوکاله پیشنهادی (اختیاری)</span>
              <input
                value={reqPrice}
                onChange={(e) => setReqPrice(e.target.value)}
                placeholder="مثلاً ۲۵ میلیون تومان"
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={sendRequest}
                disabled={busy || reqMsg.trim().length < 15}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {busy ? "در حال ارسال…" : "ارسال درخواست"}
              </button>
              <button
                type="button"
                onClick={() => setReqFor(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground-soft hover:text-foreground"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
