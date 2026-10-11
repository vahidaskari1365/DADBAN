"use client";

// ============================================================
// دادبان — «میز اختصاصی پرونده» (کلاینت)
// ۱) اسناد: فهرست + استخراج متن با کش
// ۲) تحلیل کل پرونده: استریم SSE → ۶ کارت ساختاریافته
// ۳) لایحهٔ دفاعیه: از دل پرونده + سبک وکیل → کپی/چاپ/Word
// ۴) تمرین دادگاه: لینک به شبیه‌سازی با همین پرونده
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import type { CaseDeskDoc } from "@/lib/case-desk";
import {
  CASE_KINDS,
  buildChecklist,
  checklistToText,
  detectCaseKind,
  getCaseKindInfo,
  type CaseKind,
} from "@/lib/case-checklist";

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const inputCls =
  "w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

export interface DeskCase {
  caseNumber: string;
  subject: string;
  city: string;
  province: string;
  stage: string;
  description: string;
}

export interface DeskAnalysis {
  overview: string;
  strengths: string;
  weaknesses: string;
  contradictions: string;
  missingDocs: string;
  nextSteps: string;
}

const SECTIONS: { key: keyof DeskAnalysis; title: string; icon: Parameters<typeof Icon>[0]["name"]; tone: string }[] = [
  { key: "overview", title: "خلاصهٔ پرونده و خط زمان", icon: "file", tone: "text-primary" },
  { key: "strengths", title: "نقاط قوت", icon: "check", tone: "text-emerald-600 dark:text-emerald-400" },
  { key: "weaknesses", title: "نقاط ضعف و ریسک‌ها", icon: "alert", tone: "text-amber-600 dark:text-amber-400" },
  { key: "contradictions", title: "تناقض‌های احتمالی بین اسناد", icon: "balance", tone: "text-red-600 dark:text-red-400" },
  { key: "missingDocs", title: "مدارک ناقص و نیازمند تکمیل", icon: "document", tone: "text-accent-text" },
  { key: "nextSteps", title: "گام‌های بعدی پیشنهادی", icon: "bolt", tone: "text-primary" },
];

export function CaseDeskClient({
  caseRow,
  initialDocs,
  initialAnalysis,
  hasStyle,
}: {
  caseRow: DeskCase;
  initialDocs: CaseDeskDoc[];
  initialAnalysis: (DeskAnalysis & { createdAt: string; docCount: number }) | null;
  hasStyle: boolean;
}) {
  const t = useT();
  const tt = templateT(t);

  const [docs, setDocs] = useState<CaseDeskDoc[]>(initialDocs);
  const [analysis, setAnalysis] = useState<(DeskAnalysis & { createdAt: string; docCount: number }) | null>(initialAnalysis);
  const [rawStream, setRawStream] = useState("");
  const [busy, setBusy] = useState<"none" | "extract" | "analyze" | "brief">("none");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [side, setSide] = useState<"خواهان" | "خوانده">("خواهان");
  const [extra, setExtra] = useState("");
  const [brief, setBrief] = useState("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  /* ---------- چک‌لیست مدارک (تشخیص خودکار نوع دعوا + ذخیرهٔ تیک‌ها در مرورگر) ---------- */
  const autoKind = useMemo(() => detectCaseKind(caseRow.subject, caseRow.description), [caseRow.subject, caseRow.description]);
  const [checklistKind, setChecklistKind] = useState<CaseKind | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [checklistCopied, setChecklistCopied] = useState(false);
  const activeKind = checklistKind ?? autoKind;
  const kindInfo = getCaseKindInfo(activeKind);
  const checklistItems = useMemo(() => buildChecklist(activeKind), [activeKind]);
  const doneCount = checklistItems.filter((i) => checked[i.key]).length;
  const progressPct = checklistItems.length ? Math.round((doneCount / checklistItems.length) * 100) : 0;
  const checklistKey = `dadban:checklist:${caseRow.caseNumber}`;

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(`dadban:checklist:${caseRow.caseNumber}`);
        if (!raw) return;
        const data = JSON.parse(raw) as { kind?: CaseKind; checked?: Record<string, boolean> };
        if (data.kind && CASE_KINDS.some((k) => k.kind === data.kind)) setChecklistKind(data.kind);
        if (data.checked && typeof data.checked === "object") setChecked(data.checked);
      } catch { /* مرورگر قدیمی یا دادهٔ خراب — بی‌صدا */ }
    });
  }, [caseRow.caseNumber]);

  function setChecklistState(nextKind: CaseKind, nextChecked: Record<string, boolean>) {
    setChecklistKind(nextKind === autoKind ? null : nextKind);
    setChecked(nextChecked);
    try {
      localStorage.setItem(checklistKey, JSON.stringify({ kind: nextKind, checked: nextChecked }));
    } catch { /* حالت ناشناس/پرمشدگی حافظه — فقط UI آپدیت می‌ماند */ }
  }

  function toggleItem(key: string) {
    setChecklistState(activeKind, { ...checked, [key]: !checked[key] });
  }

  async function copyChecklist() {
    try {
      await navigator.clipboard.writeText(checklistToText(activeKind, checked));
      setChecklistCopied(true);
      setTimeout(() => setChecklistCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  const extractedCount = docs.filter((d) => d.chars !== null).length;
  const withText = extractedCount > 0;

  /* ---------- استخراج متن اسناد ---------- */
  async function extractDocs() {
    setBusy("extract");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/case-desk/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseNumber: caseRow.caseNumber }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; results?: { name: string; ok: boolean; chars?: number; error?: string }[]; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.results) {
        setError(data?.error ?? t("استخراج متن ناموفق بود."));
        return;
      }
      // به‌روزرسانی وضعیت کاراکترها بر اساس ترتیب نام
      setDocs((prev) =>
        prev.map((d) => {
          const r = data.results?.find((x) => x.name === d.name);
          if (!r) return d;
          return r.ok ? { ...d, chars: Math.max(d.chars ?? 0, r.chars ?? d.chars ?? 0) } : d;
        }),
      );
      const failed = data.results.filter((r) => !r.ok);
      setNotice(
        failed.length
          ? tt("{n} سند استخراج شد؛ {m} سند خطا داشت (مثلاً PDF اسکن‌شدهٔ بی‌متن).", { n: String(data.results.length - failed.length), m: String(failed.length) })
          : tt("متن {n} سند آماده شد.", { n: String(data.results.length) }),
      );
    } catch {
      setError(t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید."));
    } finally {
      setBusy("none");
    }
  }

  /* ---------- خواندن استریم SSE (هم‌الگوی دادخواست‌ساز) ---------- */
  async function readSse(
    url: string,
    body: Record<string, unknown>,
    onDelta: (acc: string) => void,
    onObj: (obj: Record<string, unknown>) => "break" | void,
  ) {
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید."));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n\n")) !== -1) {
          const evt = buf.slice(0, nl);
          buf = buf.slice(nl + 2);
          for (const line of evt.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            let obj: Record<string, unknown>;
            try {
              obj = JSON.parse(payload) as Record<string, unknown>;
            } catch {
              continue;
            }
            if (typeof obj.delta === "string" && obj.delta) {
              acc += obj.delta;
              onDelta(acc);
            }
            if (onObj(obj) === "break") return;
          }
        }
      }
    } catch {
      if ((controller.signal.reason as string) !== "user-abort") setError(t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید."));
    }
  }

  /* ---------- تحلیل کل پرونده (کامل یا افزایشی) ---------- */
  async function analyze(mode: "full" | "delta" = "full") {
    setBusy("analyze");
    setError(null);
    setNotice(null);
    setAnalysis(null);
    setRawStream("");
    await readSse(
      "/api/case-desk/analyze",
      { caseNumber: caseRow.caseNumber, mode },
      (acc) => setRawStream(acc),
      (obj) => {
        if (obj.sections && typeof obj.sections === "object") {
          const s = obj.sections as DeskAnalysis;
          setAnalysis({
            ...s,
            createdAt: new Date().toISOString(),
            docCount: docs.filter((d) => d.chars !== null).length,
          });
          setRawStream("");
          return "break";
        }
        if (obj.error) {
          setError(String(obj.error));
          return "break";
        }
        return;
      },
    );
    setBusy("none");
  }

  /** تعداد سندِ با متنِ استخراج‌شده که بعد از تحلیل فعلی اضافه شده */
  const deltaCount = analysis ? Math.max(0, extractedCount - analysis.docCount) : 0;

  /* ---------- تولید لایحه ---------- */
  async function makeBrief() {
    setBusy("brief");
    setError(null);
    setBrief("");
    let acc = "";
    await readSse(
      "/api/case-desk/brief",
      { caseNumber: caseRow.caseNumber, side, extra },
      (a) => {
        acc = a;
        setBrief(a);
      },
      (obj) => {
        if (obj.error) {
          setError(String(obj.error));
          return "break";
        }
        if (obj.done) return "break";
        return;
      },
    );
    setBusy("none");
  }

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  function downloadBrief() {
    const html = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="utf-8"><title>' + escapeHtml("لایحهٔ دفاعیه — " + caseRow.subject) + "</title>",
      '<style>body{direction:rtl;font-family:"B Nazanin","Vazirmatn",Tahoma,serif;font-size:14pt;line-height:2;padding:24px;text-align:justify;}</style>',
      "</head>",
      '<body dir="rtl"><div>' + escapeHtml(brief).replace(/\n/g, "<br/>") + "</div></body></html>",
    ].join("");
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `لایحه-${caseRow.caseNumber}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function stop() {
    abortRef.current?.abort();
    setBusy("none");
  }

  return (
    <div className="space-y-6" data-testid="case-desk">
      {/* ۱) اسناد پرونده */}
      <Card hover={false} id="desk-docs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
            <Icon name="document" className="h-5 w-5 text-primary" />
            {t("اسناد پرونده")}
            <Badge tone="neutral">
              {tt("{n} سند", { n: String(docs.length) })}
            </Badge>
          </h3>
          <Button size="sm" variant="outline" icon="file" onClick={extractDocs} disabled={busy !== "none"}>
            {busy === "extract" ? <Spinner /> : <Icon name="file" className="h-4 w-4" />}
            {t("استخراج متن اسناد")}
          </Button>
        </div>
        {docs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-strong bg-surface-2/50 p-4 text-center text-xs text-foreground-soft">
            {t("هنوز سندی برای این پرونده آپلود نشده است. برای تحلیل، از صفحهٔ پرونده مدارک را آپلود کنید یا اینجا متن ندارید و تحلیل فقط بر مبنای شرح موکل انجام می‌شود.")}
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-xl border border-border-strong">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-surface-2 text-foreground-soft">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("نام سند")}</th>
                  <th className="px-3 py-2 font-semibold">{t("حجم")}</th>
                  <th className="px-3 py-2 font-semibold">{t("متن")}</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.documentId} className="border-t border-border-strong/60">
                    <td className="max-w-56 truncate px-3 py-2 font-medium text-foreground" title={d.name}>{d.name}</td>
                    <td className="px-3 py-2 text-foreground-soft">{Math.max(1, Math.round(d.size / 1024))} KB</td>
                    <td className="px-3 py-2">
                      {d.chars === null ? (
                        <span className="text-foreground-soft">{t("استخراج نشده")}</span>
                      ) : d.chars === 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">{t("بی‌متن")}</span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{tt("{n} کاراکتر", { n: d.chars.toLocaleString("fa-IR") })}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {notice && (
          <p role="status" className="mt-3 rounded-xl bg-primary-soft/60 px-3 py-2 text-xs text-primary">
            {notice}
          </p>
        )}
      </Card>

      {/* ۲) چک‌لیست مدارک بر اساس نوع دعوا */}
      <Card hover={false} id="desk-checklist" className="border-primary/20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
            <Icon name="check" className="h-5 w-5 text-primary" />
            {t("چک‌لیست مدارک لازم")}
            <Badge tone="neutral">{t(kindInfo.title)}</Badge>
            {autoKind !== "general" && checklistKind === null && (
              <Badge tone="accent">{t("تشخیص خودکار از موضوع پرونده")}</Badge>
            )}
          </h3>
          <Button size="sm" variant="outline" icon={checklistCopied ? "check" : "copy"} onClick={copyChecklist}>
            {checklistCopied ? t("کپی شد") : t("کپی چک‌لیست")}
          </Button>
        </div>
        <div className="mb-3 grid gap-3 sm:grid-cols-[200px_1fr] sm:items-end">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground" htmlFor="checklist-kind">
              {t("نوع دعوا")}
            </label>
            <select
              id="checklist-kind"
              className={inputCls + " h-11"}
              value={activeKind}
              onChange={(e) => setChecklistState(e.target.value as CaseKind, checked)}
            >
              {CASE_KINDS.map((k) => (
                <option key={k.kind} value={k.kind}>{t(k.title)}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-foreground-soft">
              <span>{tt("{n} از {m} تکمیل شد", { n: String(doneCount), m: String(checklistItems.length) })}</span>
              <span>{progressPct.toLocaleString("fa-IR")}٪</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1" data-testid="checklist-items">
          {checklistItems.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border-strong bg-background p-2.5 transition-colors hover:border-primary/40"
            >
              <input
                type="checkbox"
                checked={!!checked[item.key]}
                onChange={() => toggleItem(item.key)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                aria-label={item.label}
              />
              <span className="min-w-0">
                <span className={`text-[13px] font-medium ${checked[item.key] ? "text-foreground-soft line-through" : "text-foreground"}`}>
                  {item.label}
                </span>
                {item.required && (
                  <span className="mx-1.5 inline-block align-middle text-[10px] font-bold text-accent-text">
                    ({t("لازم")})
                  </span>
                )}
                {item.hint && <span className="mt-0.5 block text-[11.5px] leading-5 text-foreground-soft">{item.hint}</span>}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-foreground-soft">
          {t("این چک‌لیست راهنمای عمومی است؛ تکمیل خودکار به‌ازای نوع دعوا انجام می‌شود و تیک‌ها فقط در مرورگر شما ذخیره می‌گردند. تشخیص نهایی مدارک لازم با وکیل پرونده است.")}
        </p>
      </Card>

      {/* ۳) تحلیل کل پرونده */}
      <Card hover={false} id="desk-analysis" className="border-primary/30">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
            <Icon name="search" className="h-5 w-5 text-primary" />
            {t("تحلیل پرونده به‌عنوان یک کل")}
          </h3>
          {busy === "analyze" ? (
            <Button size="sm" variant="ghost" icon="x" onClick={stop}>
              {t("توقف")}
            </Button>
          ) : analysis && deltaCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="accent" icon="sparkles" onClick={() => void analyze("delta")} disabled={busy !== "none"} data-testid="analyze-delta-btn">
                {tt("تحلیل افزایشی ({n} سند جدید)", { n: String(deltaCount) })}
              </Button>
              <Button size="sm" variant="outline" icon="search" onClick={() => void analyze("full")} disabled={busy !== "none"}>
                {t("تحلیل کامل مجدد")}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="accent" icon="sparkles" onClick={() => void analyze("full")} disabled={busy !== "none"}>
              {analysis ? t("تحلیل مجدد پرونده") : t("تحلیل کل پرونده")}
            </Button>
          )}
        </div>
        <p className="mb-3 text-xs leading-6 text-foreground-soft">
          {t(
            "سیستم متن همهٔ اسناد را کنار هم می‌خواند و به‌عنوان یک کل تحلیل می‌کند: خط زمان، نقاط قوت و ضعف، تناقض‌های احتمالی (همیشه با نام سند)، مدارک ناقص و گام بعدی. یافته‌ها «احتمالی»‌اند و راستی‌آزمایی با شماست.",
          )}
        </p>

        {busy === "analyze" && (
          <div className="whitespace-pre-wrap rounded-xl border border-border-strong bg-background p-3 text-[13px] leading-7 text-foreground" data-testid="analysis-stream">
            {rawStream || t("در حال خواندن اسناد و تحلیل…")}
            <Spinner className="mr-2 inline-block h-3.5 w-3.5 text-primary" />
          </div>
        )}

        {analysis && busy !== "analyze" && (
          <div className="grid gap-3 sm:grid-cols-2" data-testid="analysis-sections">
            {SECTIONS.map((sec) => (
              <div
                key={sec.key}
                className={`rounded-xl border border-border-strong bg-background p-3 ${sec.key === "overview" ? "sm:col-span-2" : ""}`}
              >
                <h4 className={`mb-1.5 flex items-center gap-1.5 text-[13px] font-bold ${sec.tone}`}>
                  <Icon name={sec.icon} className="h-4 w-4" /> {t(sec.title)}
                </h4>
                <p className="whitespace-pre-wrap text-[12.5px] leading-6 text-foreground-soft">
                  {(analysis[sec.key] || "—").trim()}
                </p>
              </div>
            ))}
            <p className="text-[11px] text-foreground-soft sm:col-span-2">
              {tt("مبنای این تحلیل: {n} سند استخراج‌شده + شرح پرونده — ثبت در {date}", {
                n: String(analysis.docCount),
                date: new Date(analysis.createdAt).toLocaleString("fa-IR"),
              })}
            </p>
          </div>
        )}
      </Card>

      {/* ۴) لایحهٔ دفاعیه از دل پرونده */}
      <Card hover={false} id="desk-brief">
        <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-foreground">
          <Icon name="signature" className="h-5 w-5 text-primary" />
          {t("تولید لایحهٔ دفاعیه از همین پرونده")}
          {hasStyle && (
            <Badge tone="accent">{t("با سبک نگارش شما")}</Badge>
          )}
        </h3>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground" htmlFor="brief-side">
              {t("طرفِ لایحه")}
            </label>
            <select id="brief-side" className={inputCls + " h-11"} value={side} onChange={(e) => setSide(e.target.value === "خوانده" ? "خوانده" : "خواهان")}>
              <option value="خواهان">{t("لایحهٔ خواهان")}</option>
              <option value="خوانده">{t("لایحهٔ خوانده (دفاعیه)")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-foreground" htmlFor="brief-extra">
              {t("نکات تکمیلی (اختیاری)")}
            </label>
            <input
              id="brief-extra"
              className={inputCls + " h-11"}
              value={extra}
              onChange={(e) => setExtra(e.target.value.slice(0, 1500))}
              placeholder={t("مثلاً: تأکید بر رسید پرداخت و شهادت شاهد اول…")}
            />
          </div>
        </div>
        {busy === "brief" ? (
          <div>
            <Button size="sm" variant="ghost" icon="x" onClick={stop} className="mb-2">
              {t("توقف تولید")}
            </Button>
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border-strong bg-background p-3 text-[13px] leading-7 text-foreground" data-testid="brief-stream">
              {brief || t("در حال تنظیم لایحه…")}
              <Spinner className="mr-2 inline-block h-3.5 w-3.5 text-primary" />
            </div>
          </div>
        ) : (
          <Button size="md" variant="accent" icon="signature" onClick={makeBrief} disabled={busy !== "none"}>
            {t("تنظیم لایحه")}
          </Button>
        )}

        {brief && busy !== "brief" && (
          <div className="mt-3">
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border-strong bg-background p-4 text-[13.5px] leading-8 text-foreground" data-testid="brief-output">
              {brief}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={copied ? "check" : "copy"} onClick={copyBrief}>
                {copied ? t("کپی شد") : t("کپی")}
              </Button>
              <Button size="sm" variant="outline" icon="document" onClick={downloadBrief}>
                {t("دانلود Word")}
              </Button>
              <Button size="sm" variant="outline" icon="file" onClick={() => window.print()}>
                {t("چاپ")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ۵) تمرین دادگاه */}
      <Card hover={false} className="border-accent/40 bg-accent-soft/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
              <Icon name="gavel" className="h-5 w-5 text-accent-text" />
              {t("شبیه‌سازی دادگاه با این پرونده")}
            </h3>
            <p className="mt-1 text-xs leading-6 text-foreground-soft">
              {t("قبل از جلسهٔ واقعی، با قاضی و وکیلِ خصمِ هوشمند تمرین کنید: سؤال‌های سخت را ببینید و پاسخ‌ها را آماده کنید.")}
            </p>
          </div>
          <Link
            href={`/court-sim?case=${encodeURIComponent(caseRow.caseNumber)}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent-hover"
          >
            <Icon name="gavel" className="h-4 w-4" />
            {t("شروع تمرین دادگاه")}
          </Link>
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
