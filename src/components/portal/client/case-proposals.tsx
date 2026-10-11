"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { StatusBadge } from "@/components/panel-widgets";
import { formatToman, labelStatus, timeAgo, toFa } from "@/lib/money";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import type { LawyerLite, ProposalItem } from "./types";

/**
 * مقایسه و پذیرش/رد پیشنهاد قیمت وکلا — فقط تا پیش از تعیین وکیل منتخب نمایش داده می‌شود.
 */
export default function CaseProposals({
  caseId,
  initialProposals,
  lawyers,
}: {
  caseId: number;
  initialProposals: ProposalItem[];
  lawyers: LawyerLite[];
}) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [proposals, setProposals] = useState<ProposalItem[]>(initialProposals);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const nameOf = (p: ProposalItem) => p.lawyerName || lawyers.find((l) => l.id === p.lawyerId)?.name || tf("وکیل دادپیو (#{n})", { n: toFa(p.lawyerId) });
  const ratingOf = (p: ProposalItem) => lawyers.find((l) => l.id === p.lawyerId)?.rating ?? 0;

  const minAmount = Math.min(
    ...proposals.map((p) => Number(String(p.amount).replace(/\D/g, "") || Number.MAX_SAFE_INTEGER)),
  );
  const maxScore = Math.max(...proposals.map((p) => p.aiMatchScore ?? 0), 0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/proposals`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; proposals?: ProposalItem[] };
      if (data?.ok && Array.isArray(data.proposals)) setProposals(data.proposals);
    } catch {
      /* دادهٔ اولیهٔ سرور باقی می‌ماند */
    }
  }, [caseId]);

  useEffect(() => {
    if (initialProposals.length === 0) queueMicrotask(() => void load());
  }, [initialProposals.length, load]);

  const act = async (p: ProposalItem, action: "accept" | "reject") => {
    setBusyId(p.id);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/proposals/${p.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error ?? t("انجام عملیات ناموفق بود."));
        return;
      }
      if (action === "accept") {
        setMsg(t("پیشنهاد پذیرفته شد؛ کارشناسان دادپیو برای نهایی‌سازی قرارداد و معرفی وکیل با شما تماس می‌گیرند."));
      } else {
        setMsg(t("پیشنهاد رد شد."));
      }
      await load();
      router.refresh();
    } catch {
      setErr(t("خطا در ارتباط با سرور."));
    } finally {
      setBusyId(null);
    }
  };

  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
        <Icon name="mail" className="mx-auto mb-2 h-6 w-6" />
        {t("هنوز پیشنهاد قیمتی ثبت نشده است. وکلای متخصص با بررسی پرونده، پیشنهاد خود را برای شما ارسال می‌کنند.")}
      </div>
    );
  }

  const sorted = [...proposals].sort((a, b) => {
    const rank = (s: string) => (s === "pending" ? 0 : s === "negotiating" ? 1 : s === "accepted" ? 2 : 3);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return b.aiMatchScore - a.aiMatchScore;
  });

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-xs text-muted">
        <Icon name="sparkles" className="h-4 w-4 text-accent" />
        {tf("{n} پیشنهاد برای پروندهٔ شما ثبت شده است؛ پیشنهادها را از نظر مبلغ، مدت و امتیاز تطبیق مقایسه کنید.", { n: toFa(proposals.length) })}
      </p>

      {msg && (
        <p className="flex items-center gap-1.5 rounded-xl bg-success/10 p-3 text-xs font-semibold text-success">
          <Icon name="check" className="h-4 w-4" /> {msg}
        </p>
      )}
      {err && (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-danger">
          <Icon name="alert" className="h-4 w-4" /> {err}
        </p>
      )}

      <div className="max-h-96 space-y-3 overflow-y-auto pl-1">
        {sorted.map((p) => {
          const s = labelStatus("proposal", p.status);
          const isPending = p.status === "pending" || p.status === "negotiating";
          const lowest = Number(String(p.amount).replace(/\D/g, "")) === minAmount && proposals.length > 1;
          const bestMatch = p.aiMatchScore === maxScore && maxScore > 0;
          return (
            <article key={p.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-2 text-sm font-bold text-cyan" style={{ background: "#17264a", color: "#7fd8ee" }}>
                    <Icon name="gavel" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{nameOf(p)}</p>
                    <p className="flex items-center gap-2 text-[11px] text-muted">
                      <span className="flex items-center gap-0.5">
                        <Icon name="star" className="h-3 w-3 text-accent" />
                        {toFa(ratingOf(p).toFixed(1))}
                      </span>
                      <span>·</span>
                      <span>{timeAgo(p.createdAt)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {bestMatch && (
                    <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] font-bold text-accent">
                      {tf("تطبیق هوشمند {n}٪", { n: toFa(p.aiMatchScore) })}
                    </span>
                  )}
                  {lowest && isPending && (
                    <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">{t("کمترین مبلغ")}</span>
                  )}
                  <StatusBadge tone={s.tone}>{t(s.label)}</StatusBadge>
                </div>
              </div>

              <div className="mt-3 grid gap-2 rounded-xl bg-surface-2/50 p-3 text-xs sm:grid-cols-3">
                <div>
                  <p className="text-muted">{t("حق‌الوکالهٔ پیشنهادی")}</p>
                  <p className="dp-money mt-0.5 text-sm">{formatToman(p.amount)}</p>
                </div>
                <div>
                  <p className="text-muted">{t("مدت پیشنهادی رسیدگی")}</p>
                  <p className="mt-0.5 font-bold text-foreground">
                    {p.durationMonths > 0 ? tf("{n} ماه", { n: toFa(p.durationMonths) }) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted">{t("امتیاز تطبیق پرونده")}</p>
                  <p className="mt-0.5 font-bold text-foreground">{toFa(p.aiMatchScore)}٪</p>
                </div>
              </div>

              {p.note && (
                <p className="mt-3 text-[13px] leading-6 text-foreground-soft">
                  <span className="font-semibold text-foreground">{t("یادداشت وکیل: ")}</span>
                  {p.note}
                </p>
              )}

              {isPending && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void act(p, "accept")}
                    disabled={busyId !== null}
                    className="btn-gold inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all disabled:opacity-50"
                  >
                    <Icon name="check" className="h-4 w-4" />
                    {busyId === p.id ? t("در حال ثبت…") : t("پذیرش پیشنهاد")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(p, "reject")}
                    disabled={busyId !== null}
                    className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-danger/40 bg-surface px-5 text-sm font-bold text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
                  >
                    <Icon name="x" className="h-4 w-4" />
                    {t("رد")}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
