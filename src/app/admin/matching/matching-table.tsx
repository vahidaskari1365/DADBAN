"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge, Progress } from "@/components/panel-widgets";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { labelStatus, toFa, formatJalali } from "@/lib/money";

export type MatchingRow = {
  id: number;
  caseNumber: string;
  subject: string;
  description: string;
  specialty: string;
  city: string;
  status: string;
  progress: number;
  urgency: string;
  aiCategory: string;
  aiConfidence: number;
  aiEstimate: string;
  contractStatus: string;
  createdAt: Date;
};

type MatchResult = {
  category: string;
  confidence: number;
  feeRange: string;
  urgency: string;
  summary: string;
  lawyerCount: number;
};

/**
 * جدول مانیتور تطبیق هوشمند — دکمهٔ «تحلیل مجدد» هر ردیف
 * مصرف‌کنندهٔ API موجود: POST /api/ai/match (تحلیل) و PUT /api/ai/match (ذخیرهٔ نتیجه)
 */
export default function MatchingTable({ rows }: { rows: MatchingRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [results, setResults] = useState<Record<number, MatchResult | { error: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  async function reanalyze(row: MatchingRow) {
    setBusyId(row.id);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: row.description, city: row.city }),
      });
      if (res.status === 429) {
        setResults((prev) => ({ ...prev, [row.id]: { error: "سقف تحلیل هوشمند این ساعت پر شد (۱۲ درخواست) — کمی بعد تلاش کنید." } }));
        return;
      }
      if (!res.ok) {
        setResults((prev) => ({ ...prev, [row.id]: { error: "تحلیل ناموفق بود؛ دوباره تلاش کنید." } }));
        return;
      }
      const data = (await res.json()) as {
        analysis?: { category?: string; confidence?: number; feeRange?: string; urgency?: string; summary?: string };
        lawyers?: unknown[];
      };
      setResults((prev) => ({
        ...prev,
        [row.id]: {
          category: String(data.analysis?.category ?? "—"),
          confidence: Math.round(Number(data.analysis?.confidence ?? 0)),
          feeRange: String(data.analysis?.feeRange ?? "—"),
          urgency: String(data.analysis?.urgency ?? "normal"),
          summary: String(data.analysis?.summary ?? ""),
          lawyerCount: Array.isArray(data.lawyers) ? data.lawyers.length : 0,
        },
      }));
    } catch {
      setResults((prev) => ({ ...prev, [row.id]: { error: "خطای شبکه در ارتباط با موتور تحلیل." } }));
    } finally {
      setBusyId(null);
    }
  }

  async function saveResult(row: MatchingRow) {
    const r = results[row.id];
    if (!r || "error" in r) return;
    setSavingId(row.id);
    try {
      const res = await fetch("/api/ai/match", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: row.id,
          category: r.category,
          confidence: r.confidence,
          estimate: r.feeRange,
        }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      /* silent — refresh state remains */
    } finally {
      setSavingId(null);
    }
  }

  const th = "p-3 text-xs font-bold text-muted whitespace-nowrap";
  const td = "p-3 text-sm align-top";

  return (
    <Card hover={false}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
        <Icon name="folder" className="h-4.5 w-4.5 text-accent" />
        پرونده‌های بازار و تحلیل AI
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-right">
          <thead>
            <tr className="border-b border-border">
              <th className={th}>#</th>
              <th className={th}>پرونده</th>
              <th className={th}>تخصص</th>
              <th className={th}>دستهٔ AI</th>
              <th className={th}>اطمینان</th>
              <th className={th}>تخمین هزینه</th>
              <th className={th}>پیشرفت</th>
              <th className={th}>وضعیت</th>
              <th className={th}>تحلیل مجدد</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-sm text-muted">
                  پرونده‌ای ثبت نشده است.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const st = labelStatus("case", row.status);
              const result = results[row.id];
              return (
                <tr key={row.id} className="border-b border-border/60 align-top last:border-0 hover:bg-surface-2/40">
                  <td className={`${td} text-muted`}>{toFa(row.id)}</td>
                  <td className={td}>
                    <b className="block max-w-[200px] truncate text-foreground">{row.subject}</b>
                    <small className="text-[11px] text-muted">
                      {row.caseNumber} · {row.city} · {formatJalali(row.createdAt)}
                    </small>
                  </td>
                  <td className={`${td} whitespace-nowrap text-foreground-soft`}>{row.specialty}</td>
                  <td className={td}>
                    {row.aiCategory ? (
                      <StatusBadge tone="cyan">{row.aiCategory}</StatusBadge>
                    ) : (
                      <span className="text-xs text-muted">تحلیل نشده</span>
                    )}
                  </td>
                  <td className={td}>
                    {row.aiCategory ? (
                      <span className="font-bold text-accent">{toFa(row.aiConfidence)}٪</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} max-w-[160px] text-xs text-muted`}>{row.aiEstimate || "—"}</td>
                  <td className={`${td} min-w-[120px]`}>
                    <Progress value={row.progress} />
                    <small className="mt-1 block text-[10px] text-muted">{toFa(row.progress)}٪</small>
                  </td>
                  <td className={td}>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    {row.urgency === "high" && (
                      <div className="mt-1">
                        <StatusBadge tone="red">فوری</StatusBadge>
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      onClick={() => reanalyze(row)}
                      disabled={busyId === row.id}
                      className="min-h-11 rounded-lg bg-primary-soft px-3 text-xs font-bold text-primary transition-colors hover:bg-primary-soft/70 disabled:opacity-50"
                    >
                      {busyId === row.id ? "در حال تحلیل…" : "تحلیل مجدد"}
                    </button>
                    {result && (
                      <div className="mt-2 max-w-[260px] rounded-xl border border-border bg-background p-3">
                        {"error" in result ? (
                          <p className="text-xs font-bold leading-6 text-danger">{result.error}</p>
                        ) : (
                          <>
                            <p className="text-xs font-bold text-foreground">
                              دسته: <span className="text-accent">{result.category}</span> · اطمینان {toFa(result.confidence)}٪
                            </p>
                            <p className="mt-1 text-[11px] leading-6 text-muted">
                              {result.summary || "—"} — هزینه: {result.feeRange} — {toFa(result.lawyerCount)} وکیل پیشنهادی
                            </p>
                            <button
                              type="button"
                              onClick={() => saveResult(row)}
                              disabled={savingId === row.id}
                              className="mt-2 min-h-11 w-full rounded-lg bg-success/10 px-3 text-[11px] font-bold text-success transition-colors hover:bg-success/20 disabled:opacity-50"
                            >
                              {savingId === row.id ? "در حال ذخیره…" : "ذخیرهٔ نتیجه روی پرونده"}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
