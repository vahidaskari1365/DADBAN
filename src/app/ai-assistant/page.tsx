"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Container, Button, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { LegalGuidance } from "@/lib/legal-engine";
import type { IconKey } from "@/lib/data";

interface ClauseFinding {
  type: "risk" | "info";
  label: string;
  detail: string;
}

const EXAMPLES = [
  "مستأجر من سه ماه اجاره نداده، چه کنم؟",
  "چک برگشت خورده، چطور طلبم را بگیرم؟",
  "برای طلاق توافقی چه مدت زمان لازم است؟",
  "می‌خواهم شرکت ثبت کنم، مراحل چیست؟",
];

function GuidanceView({ g, echo }: { g: LegalGuidance; echo: string }) {
  return (
    <div className="space-y-5 animate-fade-up">
      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="flex items-start gap-2 text-xs text-muted">
          <Icon name="chat" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{echo}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {g.matched ? (
          <>
            <Badge tone="primary" icon="scale">موضوع شناسایی‌شده: {g.topic}</Badge>
            <Badge tone="accent">اطمینان: {Math.round(g.confidence * 100)}٪</Badge>
          </>
        ) : (
          <Badge tone="neutral">راهنمای عمومی</Badge>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="sparkles" className="h-4 w-4" />
          </span>
          <h3 className="font-bold text-foreground">تحلیل اولیه</h3>
        </div>
        <p className="mt-3 text-sm leading-7 text-foreground-soft">{g.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon name="bolt" className="h-4 w-4 text-accent" /> مراحل اقدام
          </h4>
          <ol className="mt-3 space-y-3">
            {g.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs leading-5 text-muted">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Icon name="folder" className="h-4 w-4 text-primary" /> مدارک موردنیاز
            </h4>
            <ul className="mt-3 space-y-1.5">
              {g.documents.map((d) => (
                <li key={d} className="flex items-center gap-2 text-sm text-foreground-soft">
                  <Icon name="check" className="h-4 w-4 text-success" /> {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--warning)_8%,transparent)] p-5">
            <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Icon name="alert" className="h-4 w-4 text-warning" /> ریسک‌ها و هشدارها
            </h4>
            <ul className="mt-3 space-y-1.5">
              {g.risks.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-foreground-soft">
                  <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /> {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {g.articles.length > 0 && (
        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-accent-soft/50 p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon name="landmark" className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-foreground">مواد و تبصره‌های قانونی مرتبط</h4>
              <p className="text-[11px] text-muted">متن مواد به‌صورت خلاصه‌شده ذکر شده است</p>
            </div>
          </div>
          <ul className="mt-4 space-y-3">
            {g.articles.map((a) => (
              <li
                key={a.ref}
                className="rounded-xl border border-border/60 bg-surface/70 p-3.5 sm:flex sm:items-start sm:gap-3"
              >
                <span className="mb-1.5 inline-flex shrink-0 items-center rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-accent-foreground sm:mb-0">
                  {a.ref}
                </span>
                <p className="text-sm leading-6 text-foreground-soft">{a.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {g.laws.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface-2 p-5">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon name="landmark" className="h-4 w-4 text-primary" /> قوانین مرتبط
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {g.laws.map((l) => (
              <Badge key={l} tone="neutral">{l}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-5 text-primary-foreground">
        <h4 className="flex items-center gap-2 text-sm font-bold">
          <Icon name="user" className="h-4 w-4" /> اقدام بعدی پیشنهادی
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {g.nextActions.map((a) => (
            <a
              key={a.label}
              href={a.href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold backdrop-blur transition-colors hover:bg-white/25"
            >
              <Icon name="arrow" className="h-3.5 w-3.5" />
              {a.label}
            </a>
          ))}
        </div>
      </div>

      <p className="rounded-xl bg-surface-2 p-3 text-center text-xs leading-5 text-muted">
        <Icon name="alert" className="ml-1 inline h-3.5 w-3.5 text-warning" />
        این راهنما صرفاً جنبه اطلاعاتی دارد و جایگزین مشاوره تخصصی وکیل نیست. برای تصمیم نهایی با وکیل
        مشورت کنید.
      </p>
    </div>
  );
}

function ContractView({ findings, riskScore }: { findings: ClauseFinding[]; riskScore: number }) {
  const risks = findings.filter((f) => f.type === "risk");
  const level = riskScore === 0 ? "کم" : riskScore <= 2 ? "متوسط" : "زیاد";
  const color = riskScore === 0 ? "success" : riskScore <= 2 ? "warning" : "danger";
  return (
    <div className="animate-fade-up space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-extrabold text-foreground">{findings.length}</p>
          <p className="text-xs text-muted">مورد شناسایی‌شده</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-extrabold text-foreground">{risks.length}</p>
          <p className="text-xs text-muted">بند پرریسک</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className={`text-2xl font-extrabold text-${color}`}>{level}</p>
          <p className="text-xs text-muted">سطح ریسک</p>
        </div>
      </div>
      <div className="space-y-3">
        {findings.map((f, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              f.type === "risk"
                ? "border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_6%,transparent)]"
                : "border-border bg-surface"
            }`}
          >
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                f.type === "risk" ? "bg-danger/15 text-danger" : "bg-primary-soft text-primary"
              }`}
            >
              <Icon name={f.type === "risk" ? "alert" : "check"} className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{f.label}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted">{f.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-primary-soft p-4 text-center">
        <p className="text-sm text-foreground">
          برای بازبینی دقیق‌تر قرارداد و رفع بندهای پرریسک، با وکیل متخصص مشورت کنید.
        </p>
        <Button href="/contracts" variant="soft" icon="user" className="mt-3">
          دریافت مشاوره تنظیم قرارداد
        </Button>
      </div>
    </div>
  );
}

function AIAssistantContent() {
  const search = useSearchParams();
  const [tab, setTab] = useState<"guide" | "contract">(search.get("tab") === "contract" ? "contract" : "guide");
  const [input, setInput] = useState(search.get("q") ?? "");
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState<{ g: LegalGuidance; echo: string } | null>(null);
  const [llmAnswer, setLlmAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [contractText, setContractText] = useState("");
  const [contractLoading, setContractLoading] = useState(false);
  const [contractResult, setContractResult] = useState<{ findings: ClauseFinding[]; riskScore: number } | null>(null);
  const [contractAnalysis, setContractAnalysis] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = async (q?: string) => {
    const query = (q ?? input).trim();
    if (!query) return;
    setInput(query);
    setLoading(true);
    setError(null);
    setGuidance(null);
    setLlmAnswer(null);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (data.answer) {
        setLlmAnswer(data.answer);
      } else {
        setGuidance({ g: data.guidance, echo: data.echo });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    if (!contractText.trim()) return;
    setContractLoading(true);
    setContractError(null);
    setContractResult(null);
    setContractAnalysis(null);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "contract", contract: contractText }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      if (data.analysis) {
        setContractAnalysis(data.analysis);
      } else {
        setContractResult({ findings: data.findings, riskScore: data.riskScore });
      }
    } catch (e) {
      setContractError(e instanceof Error ? e.message : "خطا در تحلیل");
    } finally {
      setContractLoading(false);
    }
  };

  useEffect(() => {
    const initial = input;
    if (!initial || tab !== "guide") return;
    // شروع خودکار پرسش از پارامتر ?q= — بدون setState همگام داخل بدنه effect
    queueMicrotask(() => { void ask(initial); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [guidance, contractResult]);

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-10">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              <Icon name="sparkles" className="h-4 w-4" /> دستیار هوش مصنوعی حقوقی دادبان
            </span>
            <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">
              سؤال حقوقی‌تان را بپرسید یا قراردادتان را تحلیل کنید
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted">
              دستیار دادبان موضوع را تشخیص می‌دهد، مراحل و مدارک را توضیح می‌دهد و با استناد به
              مواد و تبصره‌های قانونی مرتبط، شما را به وکیل متخصص وصل می‌کند. هوشمند، سریع و محرمانه.
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        <div className="mx-auto max-w-3xl">
          {/* Tabs */}
          <div className="mb-6 inline-flex rounded-2xl border border-border bg-surface p-1">
            {([
              { key: "guide" as const, label: "راهنمای حقوقی", icon: "chat" as IconKey },
              { key: "contract" as const, label: "تحلیل قرارداد", icon: "file" as IconKey },
            ]).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  tab === t.key ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground-soft hover:bg-surface-2"
                }`}
              >
                <Icon name={t.icon} className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "guide" ? (
            <div className="space-y-6">
              <Card hover={false} className="space-y-3">
                <label htmlFor="ai-input" className="text-sm font-bold text-foreground">
                  مشکل حقوقی خود را شرح دهید
                </label>
                <div className="flex items-end gap-2">
                  <textarea
                    id="ai-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        ask();
                      }
                    }}
                    rows={2}
                    placeholder="مثلاً: چک برگشتی دارم و نمی‌دانم چطور طلبم را بگیرم…"
                    className="w-full resize-none rounded-xl border border-border-strong bg-background p-3 text-sm text-foreground outline-none transition-colors focus:border-primary"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => ask(ex)}
                        className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-foreground-soft transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                  <Button onClick={() => ask()} disabled={loading || !input.trim()} icon="send">
                    {loading ? "در حال بررسی…" : "تحلیل کن"}
                  </Button>
                </div>
              </Card>

              {error && (
                <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                  {error}
                </div>
              )}

              {loading && !guidance && !llmAnswer && (
                <Card hover={false} className="flex items-center gap-3">
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" />
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" style={{ animationDelay: "0.2s" }} />
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" style={{ animationDelay: "0.4s" }} />
                  <span className="text-sm text-muted">دستیار در حال تحلیل موضوع شماست…</span>
                </Card>
              )}

              {llmAnswer && (
                <Card hover={false} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon name="sparkles" className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold text-foreground">پاسخ دستیار هوشمند</span>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-foreground-soft">{llmAnswer}</p>
                  <p className="border-t border-border pt-3 text-xs text-muted">
                    این پاسخ توسط هوش مصنوعی تولید شده و جنبه اطلاع‌رسانی دارد؛ برای اقدام حقوقی با وکیل متخصص مشورت کنید.
                  </p>
                </Card>
              )}

              {guidance && (
                <div ref={scrollRef}>
                  <GuidanceView g={guidance.g} echo={guidance.echo} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <Card hover={false} className="space-y-3">
                <label htmlFor="contract-input" className="text-sm font-bold text-foreground">
                  متن قرارداد را درج کنید (یا کپی پیست کنید)
                </label>
                <textarea
                  id="contract-input"
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  rows={8}
                  placeholder="متن قرارداد خود را اینجا قرار دهید تا بندهای پرریسک، تعهدات، جریمه‌ها و ابهامات شناسایی شوند…"
                  className="w-full resize-y rounded-xl border border-border-strong bg-background p-3 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">{contractText.length} کاراکتر</p>
                  <Button onClick={analyze} disabled={contractLoading || !contractText.trim()} icon="file">
                    {contractLoading ? "در حال تحلیل…" : "تحلیل قرارداد"}
                  </Button>
                </div>
              </Card>

              {contractError && (
                <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                  {contractError}
                </div>
              )}

              {contractResult && (
                <div ref={scrollRef}>
                  <ContractView findings={contractResult.findings} riskScore={contractResult.riskScore} />
                </div>
              )}

              {contractAnalysis && (
                <Card hover={false} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Icon name="sparkles" className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold text-foreground">تحلیل هوشمند قرارداد</span>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-foreground-soft">{contractAnalysis}</p>
                  <p className="border-t border-border pt-3 text-xs text-muted">
                    این تحلیل توسط هوش مصنوعی تولید شده و جایگزین نظر کارشناسی وکیل نیست.
                  </p>
                </Card>
              )}

              {!contractResult && !contractAnalysis && !contractLoading && (
                <div className="rounded-2xl border border-dashed border-border bg-surface-2/50 p-6 text-center text-sm text-muted">
                  متن قرارداد را وارد کنید تا تحلیل هوشمند بندهای پرریسک، جریمه‌ها و ابهامات نمایش داده شود.
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </>
  );
}

export default function AIAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
          در حال بارگذاری…
        </div>
      }
    >
      <AIAssistantContent />
    </Suspense>
  );
}
