"use client";

// ============================================================
// دادورزان — «دادخواست‌ساز هوشمند»: ویزارد دو مرحله‌ای (فرم → سند استریمی)
// مرحلهٔ ۱: فرم فیلدهای سند | مرحلهٔ ۲: دریافت SSE و ویرایش/کپی/دانلود/چاپ
// ============================================================

import { useRef, useState } from "react";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import type { DraftDef, DraftField } from "@/lib/legal-drafts";

/* اسپینر سبک محلی — کامپوننت مشترکی در ui وجود ندارد */
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

const fieldCls =
  "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

export function DraftClient({ def }: { def: DraftDef }) {
  const t = useT();
  const tt = templateT(t);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const ready = def.fields.filter((f) => f.required).every((f) => (answers[f.id] ?? "").trim().length > 0);

  const setAnswer = (id: string, v: string) => setAnswers((a) => ({ ...a, [id]: v }));

  /* ---------- تولید سند: خواندن استریم SSE ---------- */
  async function generate() {
    setError(null);
    setDraft("");
    setStage(2);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    let gotStream = false;
    try {
      const res = await fetch("/api/legal-forms/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: def.slug, answers }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید."));
        setBusy(false);
        return;
      }
      // خواندن SSE — هر رویداد: data: {...}\n\n (هم‌الگوی ai-assistant)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamErr: string | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        gotStream = true;
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
              setDraft(acc);
            } else if (obj.done) {
              /* پایان استریم */
            } else if (typeof obj.error === "string" && obj.error) {
              streamErr = obj.error;
            }
          }
        }
      }
      if (streamErr) setError(streamErr);
      else if (!acc.trim()) setError(t("پاسخی دریافت نشد — لطفاً دوباره تلاش کنید."));
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        setBusy(false);
        return;
      }
      setError(
        gotStream
          ? t("ارتباط با سرور در میانهٔ تولید سند قطع شد. متن تا همین‌جا حفظ شده؛ می‌توانید دوباره تلاش کنید.")
          : t("خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی و دوباره تلاش کنید."),
      );
    } finally {
      setBusy(false);
    }
  }

  /* ---------- ابزارهای نتیجه ---------- */
  async function copyText() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("کپی خودکار ممکن نشد؛ متن را دستی انتخاب و کپی کنید."));
    }
  }

  function downloadWord() {
    const html = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="utf-8"><title>' + escapeHtml(def.title) + "</title>",
      '<style>body{direction:rtl;font-family:"B Nazanin","Vazirmatn",Tahoma,serif;font-size:14pt;line-height:2;padding:24px;text-align:justify;} h1{font-size:16pt;text-align:center;margin-bottom:16px;}</style>',
      "</head>",
      '<body dir="rtl"><h1>' + escapeHtml(def.title) + "</h1><div>" + escapeHtml(draft).replace(/\n/g, "<br/>") + "</div></body></html>",
    ].join("");
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${def.title}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function printDraft() {
    window.print();
  }

  /* ---------- رندر ---------- */
  const renderField = (f: DraftField) => {
    const common = {
      id: f.id,
      "aria-required": f.required || undefined,
      value: answers[f.id] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setAnswer(f.id, e.target.value),
    };
    if (f.type === "textarea") {
      return <textarea {...common} rows={3} placeholder={f.placeholder ? t(f.placeholder) : ""} className={`${fieldCls} h-auto resize-y py-2.5 leading-7`} />;
    }
    if (f.type === "select") {
      return (
        <select {...common} className={fieldCls}>
          <option value="">{t("انتخاب کنید")}</option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>{t(o)}</option>
          ))}
        </select>
      );
    }
    return <input {...common} type="text" placeholder={f.placeholder ? t(f.placeholder) : ""} className={fieldCls} />;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `@media print { body * { visibility: hidden !important; } #draft-print-area { display: block !important; position: fixed; inset: 0; background: #fff; padding: 24px; visibility: visible !important; } #draft-print-area * { visibility: visible !important; } }`,
      }} />

      <PageHero
        variant="market"
        image="/images/hero-forms.png"
        badge={t("دادخواست‌ساز هوشمند")}
        title={tt("ساخت هوشمند {name}", { name: t(def.title) })}
        desc={t("فیلدها را پر کنید تا پیش‌نویس رسمی سند با هوش مصنوعی تنظیم شود؛ سپس آن را ویرایش کنید و برای بازبینی نهایی به وکیل بدهید.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("فرم‌های حقوقی"), href: "/legal-forms" }, { label: t(def.title), href: `/legal-forms/${def.slug}` }, { label: t("ساخت هوشمند") }]}
      />

      <Container className="py-12">
        <div className="mx-auto max-w-3xl space-y-4">
          {stage === 1 && (
            <Card hover={false}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Icon name="document" className="h-5 w-5 text-primary" />
                  {tt("مشخصات {name}", { name: t(def.title) })}
                </h2>
                <Badge tone="accent" icon="sparkles">{t("مرحلهٔ ۱ از ۲")}</Badge>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {def.fields.map((f) => (
                  <label key={f.id} htmlFor={f.id} className={`block ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                    <span className="mb-1.5 block text-sm font-bold text-foreground">
                      {t(f.label)}
                      {f.required && <span className="ms-1 text-danger" aria-hidden="true">*</span>}
                    </span>
                    {renderField(f)}
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs leading-6 text-muted">
                <span className="text-danger" aria-hidden="true">*</span> {t("فیلدهای ستاره‌دار برای تولید سند الزامی هستند؛ بقیه اختیاری‌اند و در سند با [تکمیل شود] مشخص می‌شوند.")}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <Button href={`/legal-forms/${def.slug}`} variant="outline" icon="arrow">{t("بازگشت به فرم")}</Button>
                <Button
                  data-testid="draft-generate"
                  onClick={generate}
                  disabled={!ready || busy}
                  icon={busy ? undefined : "sparkles"}
                  aria-busy={busy || undefined}
                >
                  {busy ? (
                    <span className="inline-flex items-center gap-2"><Spinner /> {t("در حال تنظیم سند…")}</span>
                  ) : (
                    t("تولید سند")
                  )}
                </Button>
              </div>
            </Card>
          )}

          {stage === 2 && (
            <Card hover={false} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Icon name="signature" className="h-5 w-5 text-primary" />
                  {tt("پیش‌نویس {name}", { name: t(def.title) })}
                </h2>
                <Badge tone={busy ? "accent" : "primary"} icon={busy ? "clock" : "check"}>
                  {busy ? t("در حال تنظیم سند…") : t("قابل ویرایش")}
                </Badge>
              </div>

              {error && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--danger)_28%,transparent)] bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-3 text-sm leading-6 text-danger">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {busy && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-foreground-soft">
                  <Spinner className="h-4 w-4 text-primary" />
                  {t("هوش مصنوعی در حال تنظیم متن سند است؛ چند لحظه صبر کنید…")}
                </div>
              )}

              <textarea
                data-testid="draft-output"
                dir="rtl"
                rows={16}
                value={draft}
                readOnly={busy}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={t("متن سند")}
                placeholder={t("متن سند اینجا تدریجی نوشته می‌شود…")}
                className="nice-scroll mt-4 w-full resize-y rounded-xl border border-border-strong bg-background p-4 text-sm leading-8 text-foreground outline-none transition-colors focus:border-primary"
              />

              {/* نوار ابزار نتیجه */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button data-testid="draft-copy" variant="outline" size="sm" icon="copy" onClick={copyText} disabled={!draft.trim()}>
                  {copied ? t("کپی شد") : t("کپی متن")}
                </Button>
                <Button data-testid="draft-download" variant="outline" size="sm" icon="file" onClick={downloadWord} disabled={!draft.trim()}>
                  {t("دانلود Word")}
                </Button>
                <Button data-testid="draft-print" variant="outline" size="sm" icon="document" onClick={printDraft} disabled={!draft.trim()}>
                  {t("چاپ")}
                </Button>
                <Button href="/consultation" variant="accent" size="sm" icon="user" className="ms-auto">
                  {t("بازبینی توسط وکیل")}
                </Button>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="arrow"
                  onClick={() => {
                    if (busy) abortRef.current?.abort();
                    setStage(1);
                  }}
                >
                  {t("بازگشت به مرحلهٔ فرم")}
                </Button>
                <Button onClick={generate} disabled={busy} icon="sparkles" size="sm">
                  {t("تولید دوبارهٔ سند")}
                </Button>
              </div>
            </Card>
          )}

          {/* سلب مسئولیت */}
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {t("این پیش‌نویس با هوش مصنوعی تولید شده و مشاورهٔ حقوقی نیست؛ پیش از ثبت در مرجع قضایی حتماً توسط وکیل بازبینی شود.")}
            </p>
          </Card>

          {/* ناحیهٔ چاپ — فقط در print دیده می‌شود */}
          <div id="draft-print-area" className="hidden" aria-hidden="true">
            <h1 style={{ fontSize: "18px", textAlign: "center", marginBottom: "16px", fontWeight: 700 }}>{def.title}</h1>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 2, fontSize: "14px", direction: "rtl" }}>{draft}</div>
            <p style={{ marginTop: "24px", fontSize: "11px", direction: "rtl", color: "#666" }}>
              {t("این پیش‌نویس با هوش مصنوعی دادورزان تولید شده و پیش از ثبت در مرجع قضایی باید توسط وکیل بازبینی شود.")}
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
