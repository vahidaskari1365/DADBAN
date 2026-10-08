"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Container, Button, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerPicksFlow } from "@/components/ai/lawyer-picks";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import type { LegalGuidance } from "@/lib/legal-engine";
import type { MatchedLawyer } from "@/lib/lawyer-match";
import type { IconKey } from "@/lib/data";
import { ocrImageFileClient } from "@/lib/ocr-client";
import { faNum } from "@/lib/data";

interface ClauseFinding {
  type: "risk" | "info";
  label: string;
  detail: string;
}

type SourceHit = { title: string; url: string; host: string; snippet: string };

/** یک پیام در نخ گفتگو با دستیار — حداکثر ۳ دور پرسش‌وپاسخ */
type ChatMsg = {
  id: number;
  role: "user" | "assistant";
  text?: string;
  kind?: "llm" | "local";
  guidance?: LegalGuidance;
  sources?: SourceHit[];
  lawyerMatch?: { lawyers: MatchedLawyer[]; topic: string | null; specialties: string[]; province?: string | null };
};

const MAX_ROUNDS = 3;

const EXAMPLES = [
  "مستأجر من سه ماه اجاره نداده، چه کنم؟",
  "چک برگشت خورده، چطور طلبم را بگیرم؟",
  "برای طلاق توافقی چه مدت زمان لازم است؟",
  "می‌خواهم شرکت ثبت کنم، مراحل چیست؟",
];

function GuidanceView({ g, echo }: { g: LegalGuidance; echo: string }) {
  const t = useT();
  const tt = templateT(t);
  return (
    <div className="space-y-5 animate-fade-up">
      {echo && (
        <div className="rounded-2xl bg-surface-2 p-4">
          <div className="flex items-start gap-2 text-xs text-muted">
            <Icon name="chat" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{echo}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {g.matched ? (
          <>
            <Badge tone="primary" icon="scale">{tt("موضوع شناسایی‌شده: {topic}", { topic: g.topic })}</Badge>
            <Badge tone="accent">{tt("اطمینان: {pct}٪", { pct: String(Math.round(g.confidence * 100)) })}</Badge>
          </>
        ) : (
          <Badge tone="neutral">{t("راهنمای عمومی")}</Badge>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="sparkles" className="h-4 w-4" />
          </span>
          <h3 className="font-bold text-foreground">{t("تحلیل اولیه")}</h3>
        </div>
        <p className="mt-3 text-sm leading-7 text-foreground-soft">{g.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon name="bolt" className="h-4 w-4 text-accent-text" /> {t("مراحل اقدام")}
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
              <Icon name="folder" className="h-4 w-4 text-primary" /> {t("مدارک موردنیاز")}
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
              <Icon name="alert" className="h-4 w-4 text-warning" /> {t("ریسک‌ها و هشدارها")}
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
              <h4 className="text-sm font-bold text-foreground">{t("مواد و تبصره‌های قانونی مرتبط")}</h4>
              <p className="text-[11px] text-muted">{t("متن مواد به‌صورت خلاصه‌شده ذکر شده است")}</p>
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
            <Icon name="landmark" className="h-4 w-4 text-primary" /> {t("قوانین مرتبط")}
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
          <Icon name="user" className="h-4 w-4" /> {t("اقدام بعدی پیشنهادی")}
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
        {t("این راهنما صرفاً جنبه اطلاعاتی دارد و جایگزین مشاوره تخصصی وکیل نیست. برای تصمیم نهایی با وکیل مشورت کنید.")}
      </p>
    </div>
  );
}

function ContractView({ findings, riskScore }: { findings: ClauseFinding[]; riskScore: number }) {
  const t = useT();
  const risks = findings.filter((f) => f.type === "risk");
  const level = riskScore === 0 ? "کم" : riskScore <= 2 ? "متوسط" : "زیاد";
  const color = riskScore === 0 ? "success" : riskScore <= 2 ? "warning" : "danger";
  return (
    <div className="animate-fade-up space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-extrabold text-foreground">{findings.length}</p>
          <p className="text-xs text-muted">{t("مورد شناسایی‌شده")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-extrabold text-foreground">{risks.length}</p>
          <p className="text-xs text-muted">{t("بند پرریسک")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <p className={`text-2xl font-extrabold text-${color}`}>{t(level)}</p>
          <p className="text-xs text-muted">{t("سطح ریسک")}</p>
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
          {t("برای بازبینی دقیق‌تر قرارداد و رفع بندهای پرریسک، با وکیل متخصص مشورت کنید.")}
        </p>
        <Button href="/contracts" variant="soft" icon="user" className="mt-3">
          {t("دریافت مشاوره تنظیم قرارداد")}
        </Button>
      </div>
    </div>
  );
}

const CONTRACT_MAX_MB = 5;
const CONTRACT_ACCEPT = ".txt,.md,.csv,.docx,.pdf,.png,.jpg,.jpeg,.webp,image/*";

function AIAssistantContent() {
  const search = useSearchParams();
  const t = useT();
  const tt = templateT(t);
  const [tab, setTab] = useState<"guide" | "contract">(search.get("tab") === "contract" ? "contract" : "guide");
  const [input, setInput] = useState(search.get("q") ?? "");
  /** استان کاربر — از ویزارد «شروع مسیر من»، پارامتر لینک، یا استان ثبت‌شده در پروفایل موکل */
  const [province, setProvince] = useState<string | null>(search.get("province"));
  const [loading, setLoading] = useState(false);
  /** نخ گفتگو با دستیار — حداکثر MAX_ROUNDS دور */
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const msgIdRef = useRef(1);
  const [error, setError] = useState<string | null>(null);

  const [contractText, setContractText] = useState("");
  const [contractLoading, setContractLoading] = useState(false);
  const [contractResult, setContractResult] = useState<{ findings: ClauseFinding[]; riskScore: number } | null>(null);
  const [contractAnalysis, setContractAnalysis] = useState<string | null>(null);
  const [contractError, setContractError] = useState<string | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractDrag, setContractDrag] = useState(false);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const [contractOcr, setContractOcr] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // اگر پارامتر استان در لینک نبود، استان پروفایل موکل (پروفایل من) به‌عنوان پیش‌فرض استفاده می‌شود
  useEffect(() => {
    if (search.get("province")) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) return;
        const me = (await res.json()) as { ok: boolean; user?: { province?: string | null } };
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("dadban_province") : null;
        const p = me.ok ? me.user?.province ?? null : null;
        if (alive && (p || stored)) setProvince((p ?? stored) as string);
      } catch {
        /* بی‌اهمیت */
      }
    })();
    return () => {
      alive = false;
    };
  }, [search]);

  const roundsUsed = msgs.filter((m) => m.role === "user").length;
  const roundsFull = roundsUsed >= MAX_ROUNDS;

  /** متن خلاصهٔ پیام دستیار برای تاریخچهٔ مدل */
  const historyText = (m: ChatMsg): string => {
    if (m.role === "user") return m.text ?? "";
    if (m.kind === "llm") return m.text ?? "";
    if (m.guidance) return m.guidance.summary;
    return "";
  };

  const resetChat = () => {
    setMsgs([]);
    setError(null);
    setInput("");
  };

  const ask = async (q?: string) => {
    const query = (q ?? input).trim();
    /* skill-kit submit-button-state: اعتبارسنجی هنگام submit + پیام قابل‌فهم */
    if (!query) {
      setError(t("برای شروع گفتگو، لطفاً سؤال حقوقی خود را بنویسید."));
      return;
    }
    if (loading || roundsFull) return;
    setInput("");
    setLoading(true);
    setError(null);
    const uid = msgIdRef.current++;
    const aid = msgIdRef.current++;
    // تاریخچه برای مدل: پیام‌های موفق تا الان (حداکثر ۶ پیام سمت سرور هم محدود می‌کند)
    const history = msgs
      .filter((m) => historyText(m).length > 0)
      .map((m) => ({ role: m.role, content: historyText(m) }));
    setMsgs((prev) => [...prev, { id: uid, role: "user", text: query }, { id: aid, role: "assistant" }]);
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, province: province ?? undefined, history }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setMsgs((prev) =>
        prev.map((m) =>
          m.id === aid
            ? {
                ...m,
                kind: data.answer ? ("llm" as const) : ("local" as const),
                text: data.answer ?? undefined,
                guidance: data.guidance ?? undefined,
                sources: (data.sources ?? []) as SourceHit[],
                lawyerMatch: data.lawyerMatch?.lawyers?.length
                  ? {
                      lawyers: data.lawyerMatch.lawyers,
                      topic: data.lawyerMatch.topic ?? null,
                      specialties: data.lawyerMatch.specialties ?? [],
                      province: data.lawyerMatch.province ?? province,
                    }
                  : undefined,
              }
            : m,
        ),
      );
    } catch (e) {
      // پیام ناموفق حذف می‌شود تا سقف دورها بی‌جهت مصرف نشود؛ خطا بالای فرم نشان داده می‌شود
      setMsgs((prev) => prev.filter((m) => m.id !== uid && m.id !== aid));
      setInput(query);
      setError(e instanceof Error ? e.message : t("خطا در ارتباط با سرور"));
    } finally {
      setLoading(false);
    }
  };

  const runContractRequest = async (url: string, init: RequestInit) => {
    setContractLoading(true);
    setContractError(null);
    setContractResult(null);
    setContractAnalysis(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      // آمار/ریسک محلی همیشه هست؛ متن تحلیل هوش مصنوعی در صورت موفقیت اضافه می‌شود
      setContractResult({ findings: data.findings ?? [], riskScore: data.riskScore ?? 0 });
      if (data.analysis) setContractAnalysis(data.analysis);
    } catch (e) {
      setContractError(e instanceof Error ? e.message : t("خطا در تحلیل"));
    } finally {
      setContractLoading(false);
    }
  };

  // عکس قرارداد → OCR در مرورگر (tesseract.js فارسی+انگلیسی) → متن در کادر → تحلیل خودکار
  const ocrImageFile = async (f: File) => {
    setContractFile(f);
    setContractOcr(0);
    try {
      const txt = await ocrImageFileClient(f, (pct) => setContractOcr(pct));
      setContractOcr(null);
      setContractFile(null);
      if (txt.length < 30) {
        throw new Error(t("متنی از این عکس خوانده نشد؛ لطفاً عکس واضح‌تر و نزدیک‌تری آپلود کنید یا متن را در کادر بچسبانید."));
      }
      const clipped = txt.slice(0, 6000);
      setContractText(clipped);
      await runContractRequest("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "contract", contract: clipped }),
      });
    } catch (e) {
      setContractOcr(null);
      setContractFile(null);
      setContractError(e instanceof Error ? e.message : t("خواندن متن از عکس ممکن نشد."));
    }
  };

  const pickContractFile = (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > CONTRACT_MAX_MB * 1024 * 1024) {
      setContractError(tt("حجم فایل باید کمتر از {mb} مگابایت باشد.", { mb: String(CONTRACT_MAX_MB) }));
      return;
    }
    setContractError(null);
    setContractResult(null);
    setContractAnalysis(null);
    // عکس → OCR در مرورگر؛ فایل سند (PDF/Word/متن) → آپلود به سرور
    if (f.type.startsWith("image/")) {
      void ocrImageFile(f);
      return;
    }
    setContractFile(f);
  };

  const analyze = async () => {
    if (contractLoading) return;
    if (!contractFile && !contractText.trim()) {
      setError(t("برای تحلیل قرارداد، فایل بارگذاری کنید یا متن قرارداد را وارد کنید."));
      return;
    }
    if (contractFile) {
      const fd = new FormData();
      fd.append("file", contractFile);
      fd.append("mode", "contract");
      await runContractRequest("/api/ai-assistant", { method: "POST", body: fd });
    } else {
      await runContractRequest("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "contract", contract: contractText }),
      });
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
  }, [msgs, contractResult]);

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-10">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
              <Icon name="sparkles" className="h-4 w-4" /> {t("دستیار هوش مصنوعی حقوقی دادبان")}
            </span>
            <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">
              {t("سؤال حقوقی‌تان را بپرسید یا قراردادتان را تحلیل کنید")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted">
              {t("دستیار دادبان موضوع را تشخیص می‌دهد، مراحل و مدارک را توضیح می‌دهد و با استناد به مواد و تبصره‌های قانونی مرتبط، شما را به وکیل متخصص وصل می‌کند. هوشمند، سریع و محرمانه.")}
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
            ]).map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  tab === tb.key ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground-soft hover:bg-surface-2"
                }`}
              >
                <Icon name={tb.icon} className="h-4 w-4" />
                {t(tb.label)}
              </button>
            ))}
          </div>

          {tab === "guide" ? (
            <div className="space-y-6">
              <Card hover={false} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="ai-input" className="text-sm font-bold text-foreground">
                    {msgs.length > 0 ? t("ادامهٔ گفتگو با دستیار") : t("مشکل حقوقی خود را شرح دهید")}
                  </label>
                  {msgs.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold text-muted">
                      <Icon name="chat" className="h-3 w-3" />
                      {tt("{used} از {max} پرسش", { used: faNum(roundsUsed), max: faNum(MAX_ROUNDS) })}
                    </span>
                  )}
                </div>
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
                    disabled={roundsFull}
                    placeholder={t("مثلاً: چک برگشتی دارم و نمی‌دانم چطور طلبم را بگیرم…")}
                    className="w-full resize-none rounded-xl border border-border-strong bg-background p-3 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-60"
                  />
                </div>
                {!roundsFull && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {EXAMPLES.map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => ask(ex)}
                          className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-foreground-soft transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          {t(ex)}
                        </button>
                      ))}
                    </div>
                    <Button onClick={() => ask()} disabled={loading} icon="send">
                      {loading ? t("در حال بررسی…") : t("بپرس")}
                    </Button>
                  </div>
                )}
                {roundsFull && (
                  <div className="rounded-2xl border border-accent/30 bg-accent-soft/40 p-4 text-center">
                    <p className="text-sm font-bold text-accent-text">
                      {t("به سقف ۳ پرسش در این گفتگو رسیدید — برای ادامه، گفتگوی جدید شروع کنید.")}
                    </p>
                    <Button variant="soft" icon="sparkles" onClick={resetChat} className="mt-3">
                      {t("شروع گفتگوی جدید")}
                    </Button>
                  </div>
                )}
              </Card>

              {error && (
                <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                  {error}
                </div>
              )}

              {/* نخ گفتگو با دستیار — سؤال کاربر حباب‌وار، پاسخ دستیار کارت کامل */}
              {msgs.length > 0 && (
                <div className="space-y-4" aria-live="polite" aria-label={t("گفتگو با دستیار هوشمند")}>
                  {msgs.map((m) =>
                    m.role === "user" ? (
                      <div key={m.id} className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl border border-primary/20 bg-primary-soft/50 px-4 py-3">
                          <p className="whitespace-pre-line text-sm leading-6 text-foreground" dir="auto">
                            {m.text}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id}>
                        {m.kind === "llm" ? (
                          <Card hover={false} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                                <Icon name="sparkles" className="h-4 w-4" />
                              </span>
                              <span className="text-sm font-bold text-foreground">{t("پاسخ دستیار هوشمند")}</span>
                            </div>
                            <p className="whitespace-pre-line text-sm leading-7 text-foreground-soft" dir="auto">
                              {m.text}
                            </p>
                            {m.sources && m.sources.length > 0 && (
                              <div className="rounded-xl border border-border bg-surface-2 p-3">
                                <p className="mb-1.5 text-xs font-bold text-muted">{t("منابع وب:")}</p>
                                <ul className="space-y-1">
                                  {m.sources.slice(0, 6).map((s, i) => (
                                    <li key={`${m.id}-src-${i}`}>
                                      <a
                                        href={s.url}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="line-clamp-1 text-xs text-primary hover:underline"
                                        dir="ltr"
                                      >
                                        [{i + 1}] {s.title} — {s.host}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <p className="border-t border-border pt-3 text-xs text-muted">
                              {t("این پاسخ توسط هوش مصنوعی تولید شده و جنبه اطلاع‌رسانی دارد؛ برای اقدام حقوقی با وکیل متخصص مشورت کنید.")}
                            </p>
                            {m.lawyerMatch && (
                              <div className="border-t border-border pt-4">
                                <LawyerPicksFlow
                                  lawyers={m.lawyerMatch.lawyers}
                                  topic={m.lawyerMatch.topic}
                                  specialties={m.lawyerMatch.specialties}
                                  province={m.lawyerMatch.province}
                                />
                              </div>
                            )}
                          </Card>
                        ) : m.guidance ? (
                          <GuidanceView g={m.guidance} echo="" />
                        ) : null}
                      </div>
                    ),
                  )}
                  <div ref={scrollRef} />
                </div>
              )}

              {loading && (
                <Card hover={false} className="flex items-center gap-3">
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" />
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" style={{ animationDelay: "0.2s" }} />
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" style={{ animationDelay: "0.4s" }} />
                  <span className="text-sm text-muted">{t("دستیار در حال تحلیل موضوع شماست…")}</span>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <Card hover={false} className="space-y-3">
                {/* بارگذاری فایل/عکس قرارداد — drag & drop + انتخاب فایل */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setContractDrag(true); }}
                  onDragLeave={() => setContractDrag(false)}
                  onDrop={(e) => { e.preventDefault(); setContractDrag(false); pickContractFile(e.dataTransfer.files?.[0]); }}
                  className={`rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${contractDrag ? "border-primary bg-primary-soft/40" : "border-border bg-surface-2/40"}`}
                >
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon name="document" className="h-5 w-5" />
                  </span>
                  <p className="mt-2 text-sm font-bold text-foreground">{t("بارگذاری متن قرارداد")}</p>
                  <p className="mt-1 text-xs text-muted">{tt("PDF، Word (docx)، متن ساده یا عکس قرارداد — حتی عکس؛ متن آن با هوش مصنوعی خوانده می‌شود (حداکثر {mb} مگابایت)", { mb: String(CONTRACT_MAX_MB) })}</p>
                  <button
                    type="button"
                    onClick={() => contractInputRef.current?.click()}
                    className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-bold text-foreground transition-all hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                  >
                    <Icon name="file" className="h-4 w-4" />
                    {t("انتخاب فایل از دستگاه")}
                  </button>
                  <input
                    ref={contractInputRef}
                    type="file"
                    accept={CONTRACT_ACCEPT}
                    className="hidden"
                    aria-label={t("آپلود فایل قرارداد")}
                    onChange={(e) => {
                      pickContractFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>

                {contractOcr !== null && (
                  <div className="rounded-xl border border-accent/30 bg-accent-soft/30 px-4 py-3 text-center">
                    <p className="text-sm font-bold text-accent-text">{tt("در حال خواندن متن عکس با هوش مصنوعی… {pct}٪", { pct: String(contractOcr) })}</p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(5, contractOcr)}%` }} />
                    </div>
                  </div>
                )}


                {contractFile && (
                  <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft/30 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon name="document" className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="truncate text-sm font-bold text-foreground">{contractFile.name}</p>
                      <p className="text-xs text-muted">{tt("{kb} کیلوبایت", { kb: (contractFile.size / 1024).toFixed(0) })}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={t("حذف فایل")}
                      onClick={() => setContractFile(null)}
                      className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <label htmlFor="contract-input" className="text-sm font-bold text-foreground">
                  {t("یا متن قرارداد را درج کنید (کپی/پیست)")}
                </label>
                <textarea
                  id="contract-input"
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  rows={8}
                  placeholder={t("متن قرارداد خود را اینجا قرار دهید تا بندهای پرریسک، تعهدات، جریمه‌ها و ابهامات شناسایی شوند…")}
                  className="w-full resize-y rounded-xl border border-border-strong bg-background p-3 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">
                    {contractFile
                      ? contractFile.type.startsWith("image/")
                        ? t("عکس آماده خواندن و تحلیل است")
                        : t("فایل انتخاب‌شده آماده تحلیل است")
                      : tt("{n} کاراکتر", { n: String(contractText.length) })}
                  </p>
                  <Button onClick={analyze} disabled={contractLoading} icon="file">
                    {contractLoading
                      ? contractFile && contractFile.type.startsWith("image/")
                        ? t("در حال خواندن عکس و تحلیل…")
                        : t("در حال تحلیل…")
                      : contractFile
                        ? contractFile.type.startsWith("image/")
                          ? t("تحلیل عکس قرارداد")
                          : t("تحلیل فایل قرارداد")
                        : t("تحلیل قرارداد")}
                  </Button>
                </div>
              </Card>

              {contractError && (
                <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
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
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                      <Icon name="sparkles" className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-bold text-foreground">{t("تحلیل هوشمند قرارداد")}</span>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-7 text-foreground-soft">{contractAnalysis}</p>
                  <p className="border-t border-border pt-3 text-xs text-muted">
                    {t("این تحلیل توسط هوش مصنوعی تولید شده و جایگزین نظر کارشناسی وکیل نیست.")}
                  </p>
                </Card>
              )}

              {!contractResult && !contractAnalysis && !contractLoading && (
                <div className="rounded-2xl border border-dashed border-border bg-surface-2/50 p-6 text-center text-sm text-muted">
                  {t("متن قرارداد را وارد کنید یا فایل/عکس قرارداد را بارگذاری کنید تا تحلیل هوشمند بندهای پرریسک، جریمه‌ها و ابهامات نمایش داده شود.")}
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
  const t = useT();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted">
          {t("در حال بارگذاری…")}
        </div>
      }
    >
      <AIAssistantContent />
    </Suspense>
  );
}
