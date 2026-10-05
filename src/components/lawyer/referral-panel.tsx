"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import { relativeTimeJalali } from "@/lib/jalali";
import { LawyerPhoto } from "@/components/lawyer-photo";

/**
 * کارتابل «همکاری و ارجاع» — دو سوی جریان در یک کارت‌بوم:
 *  • درخواست‌های همکاریِ دریافتی از همکاران (پذیرش / رد با یادداشت)
 *  • ارجاع‌های ارسالی خودم (پیگیری وضعیت + پاسخ همکار)
 * مسیر ورود درخواست: پروفایل همکار ← «درخواست همکاری / ارجاع پرونده».
 */

interface ReferralItem {
  id: number;
  kind: string;
  kindFa: string;
  subject: string;
  description: string;
  city: string | null;
  budget: number | null;
  message: string;
  status: string;
  responseNote: string | null;
  createdAt: string;
  respondedAt: string | null;
  peer?: { id: number; name: string; slug: string; city: string | null; title: string | null; photoUrl: string | null; avatarColor: string | null; verified: boolean | null };
}

const STATUS_FA: Record<string, string> = {
  pending: "در انتظار پاسخ",
  accepted: "پذیرفته‌شده",
  declined: "ردشده",
};

const statusTone = (s: string): "accent" | "success" | "neutral" =>
  s === "accepted" ? "success" : s === "declined" ? "neutral" : "accent";

const KIND_ICON: Record<string, "folder" | "scale" | "link"> = {
  referral: "folder",
  consult: "scale",
  joint: "link",
};

export function ReferralPanel() {
  const [received, setReceived] = useState<ReferralItem[]>([]);
  const [sent, setSent] = useState<ReferralItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/lawyer/referrals", { cache: "no-store" })
      .then(async (r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        setReceived(d.received ?? []);
        setSent(d.sent ?? []);
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const respond = async (id: number, action: "accept" | "decline") => {
    setError(null);
    setFlash(null);
    setBusy(id);
    try {
      const res = await fetch("/api/lawyer/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, responseNote: (note[id] ?? "").trim() }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "ثبت پاسخ انجام نشد.");
      setFlash(d.message as string);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت پاسخ انجام نشد.");
    } finally {
      setBusy(null);
    }
  };

  const pendingCount = received.filter((r) => r.status === "pending").length;

  return (
    <Card hover={false} id="collab" className="scroll-mt-20" data-testid="referral-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="link" className="h-5 w-5 text-primary" /> همکاری و ارجاع پرونده
        </h2>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && <Badge tone="accent">{faNum(pendingCount)} در انتظار پاسخ شما</Badge>}
          <Link
            href="/lawyers"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary-soft"
          >
            جستجوی همکار
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
          </Link>
        </div>
      </div>
      <p className="mt-1 text-xs leading-6 text-muted">
        درخواست‌های همکاری دریافتی از همکاران و وضعیت ارجاع‌هایی که خودتان ارسال کرده‌اید — از پروفایل
        هر همکار می‌توانید درخواست جدید ثبت کنید.
      </p>

      {flash && <p className="mt-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-xs font-bold text-success" role="status">{flash}</p>}
      {error && <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-bold text-danger" role="alert">{error}</p>}

      {!loaded ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">در حال دریافت درخواست‌ها…</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          {/* ── دریافتی ── */}
          <section aria-label="درخواست‌های همکاری دریافتی" className="min-w-0">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground-soft">
              <Icon name="mail" className="h-3.5 w-3.5 text-accent-text" /> دریافتی از همکاران
              <Badge tone="neutral">{faNum(received.length)}</Badge>
            </h3>
            <div className="max-h-96 space-y-3 overflow-y-auto pl-1" data-testid="referral-received">
              {received.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs leading-6 text-muted">
                  درخواست همکاری‌ای دریافت نکرده‌اید؛ پروفایل حرفه‌ای کامل‌تر، شانس دیده‌شدن شما در
                  دایرکتوری را بیشتر می‌کند.
                </p>
              ) : (
                received.map((r) => (
                  <article key={r.id} className="rounded-xl border border-border bg-surface-2/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{r.subject}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                          <Badge tone="primary">{r.kindFa}</Badge>
                          {r.city && <span className="inline-flex items-center gap-0.5"><Icon name="location" className="h-3 w-3" />{r.city}</span>}
                          {r.budget ? <span className="font-bold text-foreground-soft">{faPrice(r.budget)}</span> : null}
                          <span>{relativeTimeJalali(r.createdAt)}</span>
                        </p>
                      </div>
                      <Badge tone={statusTone(r.status)}>{STATUS_FA[r.status] ?? r.status}</Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-6 text-foreground-soft">{r.description}</p>
                    {r.message && (
                      <p className="mt-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] leading-5 text-muted">
                        <span className="font-bold text-foreground-soft">پیام: </span>
                        {r.message}
                      </p>
                    )}

                    {r.peer && (
                      <Link
                        href={`/lawyers/${r.peer.slug}`}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 transition-colors hover:border-primary/40"
                      >
                        <LawyerPhoto
                          name={r.peer.name}
                          color={r.peer.avatarColor ?? "#15365d"}
                          photoUrl={r.peer.photoUrl}
                          size="xs"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-bold text-foreground">{r.peer.name}</span>
                          <span className="block text-[9px] text-muted">مشاهدهٔ پروفایل همکار</span>
                        </span>
                        <Icon name="chevron" className="h-3 w-3 rotate-180 text-muted" />
                      </Link>
                    )}

                    {r.status === "pending" ? (
                      <div className="mt-2 space-y-2">
                        <input
                          value={note[r.id] ?? ""}
                          onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                          placeholder="یادداشت پاسخ (اختیاری) — مثلاً پیشنهاد حق‌الزحمه"
                          className="h-10 w-full rounded-xl border border-border-strong bg-background px-3 text-xs outline-none focus:border-primary"
                          aria-label={`یادداشت پاسخ به درخواست ${r.subject}`}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => respond(r.id, "accept")} disabled={busy === r.id} icon="check" className="shrink-0">
                            پذیرش همکاری
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => respond(r.id, "decline")} disabled={busy === r.id} icon="x" className="shrink-0">
                            رد
                          </Button>
                        </div>
                      </div>
                    ) : (
                      r.responseNote && (
                        <p className="mt-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] leading-5 text-foreground-soft">
                          <span className="font-bold">پاسخ شما: </span>{r.responseNote}
                        </p>
                      )
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          {/* ── ارسالی ── */}
          <section aria-label="ارجاع‌های ارسالی من" className="min-w-0">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-foreground-soft">
              <Icon name="send" className="h-3.5 w-3.5 text-primary" /> ارجاع‌های من
              <Badge tone="neutral">{faNum(sent.length)}</Badge>
            </h3>
            <div className="max-h-96 space-y-3 overflow-y-auto pl-1" data-testid="referral-sent">
              {sent.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-5 text-center text-xs leading-6 text-muted">
                  هنوز درخواست همکاری ارسال نکرده‌اید؛ از دایرکتوری همکاران پروفایل یک همکار را باز کنید
                  و «درخواست همکاری / ارجاع پرونده» را بزنید.
                </p>
              ) : (
                sent.map((r) => (
                  <article key={r.id} className="rounded-xl border border-border bg-surface-2/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{r.subject}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                          <Icon name={KIND_ICON[r.kind] ?? "folder"} className="h-3 w-3" />
                          {r.kindFa}
                          {r.city && <span className="inline-flex items-center gap-0.5"><Icon name="location" className="h-3 w-3" />{r.city}</span>}
                          <span>{relativeTimeJalali(r.createdAt)}</span>
                        </p>
                      </div>
                      <Badge tone={statusTone(r.status)}>{STATUS_FA[r.status] ?? r.status}</Badge>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-foreground-soft">{r.description}</p>
                    {r.responseNote && (
                      <p className="mt-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-[11px] leading-5 text-muted">
                        <span className="font-bold text-foreground-soft">پاسخ همکار: </span>
                        {r.responseNote}
                      </p>
                    )}
                    {r.status === "accepted" && (
                      <p className="mt-1.5 rounded-lg bg-success/5 px-2.5 py-1.5 text-[10px] leading-5 text-success">
                        درخواست پذیرفته شد — هماهنگی نهایی حق‌الزحمه و مستندات مستقیماً با همکار انجام
                        شود؛ پشتیبانی دادبان ناظر جریان است.
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}
