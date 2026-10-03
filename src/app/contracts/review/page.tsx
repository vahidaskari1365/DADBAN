"use client";

import { useRef, useState } from "react";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";

interface Finding { type: "risk" | "info"; label: string; detail: string }
interface ReviewResult { analysis?: string | null; findings: Finding[]; riskScore: number }

const MAX_MB = 5;
const ACCEPT = ".txt,.md,.csv,.docx,.pdf";

export default function ContractReviewPage() {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`حجم فایل باید کمتر از ${MAX_MB} مگابایت باشد.`);
      return;
    }
    setError(null);
    setResult(null);
    setSourceName(null);
    setFile(f);
  };

  const analyze = async () => {
    if (loading || (!file && !text.trim())) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSourceName(null);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("mode", "contract");
        res = await fetch("/api/ai-assistant", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "contract", contract: text }),
        });
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      // پاسخ همیشه شامل findings/riskScore است؛ در حالت هوش مصنوعی متن تحلیل با استناد قانونی هم می‌آید
      setResult({ analysis: data.analysis ?? null, findings: data.findings ?? [], riskScore: data.riskScore ?? 0 });
      setSourceName(typeof data.fileName === "string" ? data.fileName : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تحلیل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero badge="بررسی قرارداد" title="قرارداد خود را هوشمندانه تحلیل کنید" desc="فایل قرارداد را آپلود کنید یا متن آن را درج کنید تا بندهای پرریسک، جریمه‌ها، تعهدات و ابهامات شناسایی شوند. سپس برای دقت نهایی، وکیل آن را بررسی می‌کند." breadcrumb={[{ label: "خانه", href: "/" }, { label: "قراردادها", href: "/contracts" }, { label: "بررسی قرارداد" }]} />

      <Container className="py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <Card hover={false} className="space-y-3">
            {/* آپلود فایل قرارداد — drag & drop + انتخاب فایل */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${dragOver ? "border-primary bg-primary-soft/40" : "border-border bg-surface-2/40"}`}
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name="document" className="h-5 w-5" />
              </span>
              <p className="mt-2 text-sm font-bold text-foreground">فایل قرارداد را اینجا رها کنید</p>
              <p className="mt-1 text-xs text-muted">
                فرمت‌های مجاز: PDF، Word (docx)، متن ساده — حداکثر {MAX_MB} مگابایت
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-bold text-foreground transition-all hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
              >
                <Icon name="file" className="h-4 w-4" />
                انتخاب فایل از دستگاه
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                aria-label="آپلود فایل قرارداد"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft/30 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon name="document" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-sm font-bold text-foreground">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} کیلوبایت</p>
                </div>
                <button
                  type="button"
                  aria-label="حذف فایل"
                  onClick={() => {
                    setFile(null);
                    setSourceName(null);
                  }}
                  className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Icon name="x" className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-px flex-1 bg-border" />
              یا متن قرارداد را درج کنید
              <span className="h-px flex-1 bg-border" />
            </div>

            <label htmlFor="cr" className="sr-only">متن قرارداد</label>
            <textarea id="cr" value={text} onChange={(e) => setText(e.target.value)} rows={9} placeholder="متن قرارداد خود را اینجا قرار دهید…" className="w-full resize-y rounded-xl border border-border-strong bg-background p-3 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{file ? "فایل انتخاب‌شده آماده تحلیل است" : `${text.length} کاراکتر`}</span>
              <Button onClick={analyze} disabled={loading || (!file && !text.trim())} icon="file">{loading ? (file ? "در حال تحلیل فایل…" : "در حال تحلیل…") : file ? "تحلیل فایل قرارداد" : "تحلیل قرارداد"}</Button>
            </div>
          </Card>

          {error && <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</div>}

          {result && (
            <div className="space-y-4 animate-fade-up">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: result.findings.length, l: "مورد شناسایی‌شده" },
                  { v: result.findings.filter((f) => f.type === "risk").length, l: "بند پرریسک" },
                  { v: result.riskScore === 0 ? "کم" : result.riskScore <= 2 ? "متوسط" : "زیاد", l: "سطح ریسک" },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl border border-border bg-surface p-4 text-center"><p className="text-2xl font-extrabold text-foreground">{s.v}</p><p className="text-xs text-muted">{s.l}</p></div>
                ))}
              </div>

              {result.analysis && (
                <Card hover={false} className="space-y-3 border-primary/30 bg-primary-soft/30">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="sparkles" className="h-4 w-4" /></span>
                    <div>
                      <p className="text-sm font-bold text-foreground">تحلیل هوش مصنوعی با استناد به مواد قانونی</p>
                      <p className="text-xs text-muted">
                        {sourceName ? `فایل «${sourceName}» بررسی شد — ` : ""}دستیار دادبان بندهای قرارداد را با مستند قانونی بررسی کرد
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{result.analysis}</p>
                </Card>
              )}

              {result.findings.map((f, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 ${f.type === "risk" ? "border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_6%,transparent)]" : "border-border bg-surface"}`}>
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${f.type === "risk" ? "bg-danger/15 text-danger" : "bg-primary-soft text-primary"}`}><Icon name={f.type === "risk" ? "alert" : "check"} className="h-4 w-4" /></span>
                  <div><p className="text-sm font-bold text-foreground">{f.label}</p><p className="mt-0.5 text-xs leading-5 text-muted">{f.detail}</p></div>
                </div>
              ))}
              <Card hover={false} className="bg-primary-soft/50 text-center">
                <p className="text-sm text-foreground">برای رفع بندهای پرریسک و تنظیم نهایی، با وکیل مشورت کنید.</p>
                <Button href="/consultation" className="mt-3" icon="user">دریافت مشاوره</Button>
              </Card>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
