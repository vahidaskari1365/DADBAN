"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Container, Button, Card, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
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

/** یک پیام در گفتگو با دستیار — بدون سقف دور؛ گفتگو ادامه‌دار مثل چت */
type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text?: string;
  kind?: "llm" | "local";
  guidance?: LegalGuidance;
  sources?: SourceHit[];
  lawyerMatch?: { lawyers: MatchedLawyer[]; topic: string | null; specialties: string[]; province?: string | null };
  streaming?: boolean;
};

/** یک گفتگوی ذخیره‌شده — تاریخچهٔ پرسش‌وپاسخ‌ها روی همین دستگاه */
type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  msgs: ChatMsg[];
};

const CHATS_KEY = "dadban_ai_chats_v1";
const MAX_SESSIONS = 20;

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return (arr as ChatSession[])
      .filter((s) => !!s && typeof s.id === "string" && Array.isArray(s.msgs))
      .slice(0, MAX_SESSIONS)
      .map((s) => ({
        id: s.id,
        title: typeof s.title === "string" && s.title ? s.title : "گفتگو",
        createdAt: Number(s.createdAt) || Date.now(),
        updatedAt: Number(s.updatedAt) || Date.now(),
        msgs: (s.msgs as ChatMsg[])
          .filter((m) => !!m && (m.role === "user" || m.role === "assistant"))
          .slice(-200)
          .map((m) => ({ ...m, streaming: false })),
      }));
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  try {
    const slim = sessions.slice(0, MAX_SESSIONS).map((s) => ({
      ...s,
      msgs: s.msgs.slice(-200).map((m) => ({ ...m, streaming: false })),
    }));
    window.localStorage.setItem(CHATS_KEY, JSON.stringify(slim));
  } catch {
    /* سهمیهٔ مرورگر پر است — بی‌اهمیت */
  }
}

/** تاریخ کوتاه شمسی برای فهرست گفتگوها */
const faDate = (ts: number): string => {
  try {
    return new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(new Date(ts));
  } catch {
    return "";
  }
};

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

/** دکمهٔ کپی پاسخ دستیار */
function CopyBtn({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* دسترسی رد شد */
        }
      }}
      className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      aria-label={t("کپی پاسخ")}
    >
      <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
      {copied ? t("کپی شد") : t("کپی")}
    </button>
  );
}

/** فهرست گفتگوهای ذخیره‌شده — سایدبار دسکتاپ و کشوی موبایل */
function HistoryPanel(props: {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const t = useT();
  const tt = templateT(t);
  const sorted = [...props.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <Icon name="chat" className="h-4 w-4 text-primary" />
          {t("گفتگوهای من")}
        </span>
        <button
          type="button"
          onClick={props.onNew}
          className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          {t("گفتگوی جدید")}
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="px-2 py-8 text-center text-xs leading-6 text-muted">
          {t("هنوز گفتگویی ندارید — اولین پرسش حقوقی‌تان را بپرسید تا اینجا ذخیره شود.")}
        </p>
      ) : (
        <ul className="mt-1 max-h-[440px] space-y-1 overflow-y-auto pr-0.5" aria-label={t("تاریخچهٔ گفتگوها")}>
          {sorted.map((s) => {
            const qCount = s.msgs.filter((m) => m.role === "user").length;
            return (
              <li key={s.id} className="group relative">
                <button
                  type="button"
                  onClick={() => props.onSelect(s.id)}
                  aria-current={props.activeId === s.id ? "true" : undefined}
                  className={`w-full cursor-pointer rounded-xl border px-3 py-2.5 text-right transition-colors ${
                    props.activeId === s.id
                      ? "border-primary/40 bg-primary-soft/60"
                      : "border-transparent hover:border-border hover:bg-surface-2"
                  }`}
                >
                  <span className="block truncate pl-6 text-xs font-bold text-foreground" dir="auto">
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted">
                    {faDate(s.updatedAt)} · {tt("{n} پرسش", { n: faNum(qCount) })}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t("حذف گفتگو")}
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete(s.id);
                  }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
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
  /** گفتگوهای ذخیره‌شدهٔ این دستگاه + گفتگوی فعال — مثل چت، تاریخچه دارد */
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  /** مرحلهٔ پاسخ‌دهی: web (جستجوی وب) یا answer (نوشتن پاسخ) */
  const [phase, setPhase] = useState<"web" | "answer" | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = sessions.find((s) => s.id === activeId) ?? null;
  const msgs = useMemo(() => active?.msgs ?? [], [active]);

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

  /** متن خلاصهٔ پیام دستیار برای تاریخچهٔ مدل */
  const historyText = (m: ChatMsg): string => {
    if (m.role === "user") return m.text ?? "";
    if (m.kind === "llm") return m.text ?? "";
    if (m.guidance) return m.guidance.summary;
    return "";
  };

  /** به‌روزرسانی یک نشست + ذخیره در localStorage */
  const patchSession = (sid: string, fn: (s: ChatSession) => ChatSession, persist = true) => {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === sid ? fn(s) : s));
      if (persist) saveSessions(next);
      return next;
    });
  };

  /** ویرایش یک پیام داخل نشست (به‌صورت پیش‌فرض فقط در حافظه — ذخیره در پایان استریم) */
  const patchMsg = (sid: string, mid: string, fn: (m: ChatMsg) => ChatMsg, persist = false) => {
    patchSession(
      sid,
      (s) => ({ ...s, msgs: s.msgs.map((m) => (m.id === mid ? fn(m) : m)) }),
      persist,
    );
  };

  /** شروع گفتگوی تازه */
  const newChat = () => {
    abortRef.current?.abort();
    setActiveId(null);
    setInput("");
    setError(null);
    setDrawerOpen(false);
  };

  /** بازکردن یکی از گفتگوهای قبلی */
  const selectChat = (id: string) => {
    abortRef.current?.abort();
    setActiveId(id);
    setInput("");
    setError(null);
    setDrawerOpen(false);
  };

  /** حذف یک گفتگو از تاریخچه */
  const deleteChat = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      return next;
    });
    setActiveId((cur) => (cur === id ? null : cur));
  };

  const ask = async (q?: string) => {
    const query = (q ?? input).trim();
    /* skill-kit submit-button-state: اعتبارسنجی هنگام submit + پیام قابل‌فهم */
    if (!query) {
      setError(t("برای شروع گفتگو، لطفاً سؤال حقوقی خود را بنویسید."));
      return;
    }
    if (loading) return;
    setInput("");
    setLoading(true);
    setPhase("answer");
    setError(null);

    // تضمین وجود نشست — پرسش اول، گفتگوی تازه‌ای با عنوان همان پرسش می‌سازد
    let sid = activeId;
    let baseMsgs: ChatMsg[] = [];
    if (!sid) {
      sid = newId();
      const fresh: ChatSession = { id: sid, title: query.slice(0, 60), createdAt: Date.now(), updatedAt: Date.now(), msgs: [] };
      setSessions((prev) => {
        const next = [fresh, ...prev].slice(0, MAX_SESSIONS);
        saveSessions(next);
        return next;
      });
      setActiveId(sid);
    } else {
      baseMsgs = sessions.find((s) => s.id === sid)?.msgs ?? [];
    }

    const uid = newId();
    const aid = newId();
    const userMsg: ChatMsg = { id: uid, role: "user", text: query };
    const aiMsg: ChatMsg = { id: aid, role: "assistant", streaming: true };
    // تاریخچه برای مدل: ۱۰ پیام آخر (سمت سرور هم سانیتایز می‌شود)
    const history = baseMsgs
      .filter((m) => historyText(m).length > 0)
      .slice(-10)
      .map((m) => ({ role: m.role, content: historyText(m) }));
    patchSession(sid, (s) => ({ ...s, msgs: [...s.msgs, userMsg, aiMsg], updatedAt: Date.now() }), true);

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    try {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, province: province ?? undefined, history, stream: true }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? t("خطا در ارتباط با سرور"));
      }

      // خواندن استریم NDJSON — هر خط یک رویداد (phase/delta/done/fallback/error)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      type DoneMeta = { sources?: SourceHit[]; lawyerMatch?: NonNullable<ChatMsg["lawyerMatch"]> };
      type FallbackMeta = { guidance?: LegalGuidance; lawyerMatch?: NonNullable<ChatMsg["lawyerMatch"]> };
      let doneMeta: DoneMeta | null = null;
      let fallback: FallbackMeta | null = null;
      let streamErr: string | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(line) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (evt.t === "phase") {
            setPhase(evt.name === "web" ? "web" : "answer");
          } else if (evt.t === "delta" && typeof evt.v === "string") {
            acc += evt.v;
            patchMsg(sid, aid, (m) => ({ ...m, text: acc }));
          } else if (evt.t === "done") {
            doneMeta = evt as unknown as DoneMeta;
          } else if (evt.t === "fallback") {
            fallback = evt as unknown as FallbackMeta;
          } else if (evt.t === "error" && typeof evt.error === "string") {
            streamErr = evt.error;
          }
        }
      }

      const fb = fallback;
      const meta = doneMeta;
      if (fb?.guidance) {
        // زنجیرهٔ LLM در دسترس نبود → راهنمای محلی فوری
        patchMsg(
          sid,
          aid,
          (m) => ({
            ...m,
            streaming: false,
            kind: "local",
            guidance: fb.guidance,
            lawyerMatch: fb.lawyerMatch?.lawyers?.length ? fb.lawyerMatch : undefined,
          }),
          true,
        );
      } else if (acc.trim()) {
        patchMsg(
          sid,
          aid,
          (m) => ({
            ...m,
            streaming: false,
            kind: "llm",
            text: acc,
            sources: (meta?.sources ?? []) as SourceHit[],
            lawyerMatch: meta?.lawyerMatch?.lawyers?.length ? meta.lawyerMatch : undefined,
          }),
          true,
        );
      } else {
        setError(streamErr ?? t("پاسخی دریافت نشد — لطفاً دوباره تلاش کنید."));
        patchSession(sid, (s) => ({ ...s, msgs: s.msgs.filter((m) => m.id !== aid) }), true);
        setInput(query);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // توقف توسط کاربر — پاسخ نیمه‌کاره حفظ می‌شود
        if (acc.trim()) patchMsg(sid, aid, (m) => ({ ...m, streaming: false }), true);
        else patchSession(sid, (s) => ({ ...s, msgs: s.msgs.filter((m) => m.id !== aid) }), true);
      } else {
        setError(e instanceof Error ? e.message : t("خطا در ارتباط با سرور"));
        patchSession(sid, (s) => ({ ...s, msgs: s.msgs.filter((m) => m.id !== aid) }), true);
        setInput(query);
      }
    } finally {
      setLoading(false);
      setPhase(null);
      abortRef.current = null;
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

  // بازیابی تاریخچهٔ گفتگوها از همین دستگاه — قبل از effect پرسش خودکار اجرا می‌شود
  useEffect(() => {
    queueMicrotask(() => {
      const loaded = loadSessions();
      if (loaded.length === 0) return;
      setSessions(loaded);
      setActiveId([...loaded].sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
    });
  }, []);

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
      <PageHero
        variant="market"
        image="/images/hero-ai.png"
        badge={t("دستیار هوش مصنوعی حقوقی دادبان")}
        title={t("سؤال حقوقی‌تان را بپرسید یا قراردادتان را تحلیل کنید")}
        desc={t("دستیار دادبان موضوع را تشخیص می‌دهد، مراحل و مدارک را توضیح می‌دهد و با استناد به مواد و تبصره‌های قانونی مرتبط، شما را به وکیل متخصص وصل می‌کند. هوشمند، سریع و محرمانه.")}
      />

      <Container className="py-10">
        <div
          className={
            tab === "guide"
              ? "mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-6"
              : "mx-auto max-w-3xl"
          }
        >
          {/* سایدبار تاریخچهٔ گفتگوها (دسکتاپ) */}
          {tab === "guide" && (
            <aside className="hidden lg:block" aria-label={t("تاریخچهٔ گفتگوها")}>
              <div className="sticky top-6">
                <HistoryPanel
                  sessions={sessions}
                  activeId={activeId}
                  onSelect={selectChat}
                  onNew={newChat}
                  onDelete={deleteChat}
                />
              </div>
            </aside>
          )}
          <div className={tab === "guide" ? "min-w-0 space-y-6 lg:mx-auto lg:max-w-3xl" : "space-y-6"}>
          {/* Tabs */}
          <div className="inline-flex rounded-2xl border border-border bg-surface p-1">
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
            <>
              {/* دسترسی به تاریخچه در موبایل */}
              <div className="flex items-center justify-between gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground-soft transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Icon name="chat" className="h-3.5 w-3.5" />
                  {tt("تاریخچهٔ گفتگوها ({n})", { n: faNum(sessions.length) })}
                </button>
                <button
                  type="button"
                  onClick={newChat}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  {t("گفتگوی جدید")}
                </button>
              </div>

              {/* کشوی تاریخچهٔ گفتگوها (موبایل) */}
              {drawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("تاریخچهٔ گفتگوها")}>
                  <button
                    type="button"
                    aria-label={t("بستن")}
                    className="absolute inset-0 cursor-default bg-black/50"
                    onClick={() => setDrawerOpen(false)}
                  />
                  <div className="absolute inset-y-0 right-0 w-[85%] max-w-xs overflow-y-auto bg-background p-4 shadow-2xl">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{t("گفتگوهای من")}</span>
                      <button
                        type="button"
                        aria-label={t("بستن")}
                        onClick={() => setDrawerOpen(false)}
                        className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    </div>
                    <HistoryPanel
                      sessions={sessions}
                      activeId={activeId}
                      onSelect={selectChat}
                      onNew={newChat}
                      onDelete={deleteChat}
                    />
                  </div>
                </div>
              )}

              {/* خوش‌آمدگویی — حالت چت خالی */}
              {msgs.length === 0 && !loading && (
                <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
                    <Icon name="sparkles" className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-foreground">{t("سلام! من دستیار حقوقی دادبان هستم")}</p>
                  <p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-muted">
                    {t("هر سؤال حقوقی دارید بپرسید — گفتگو ادامه دارد، دستیار پاسخ‌های قبلی را به‌خاطر می‌سپارد و تاریخچهٔ همهٔ گفتگوهایتان همین‌جا ذخیره می‌ماند.")}
                  </p>
                </div>
              )}

              <Card hover={false} className="space-y-3">
                <label htmlFor="ai-input" className="text-sm font-bold text-foreground">
                  {msgs.length > 0 ? t("ادامهٔ گفتگو با دستیار — بدون محدودیت پرسش") : t("مشکل حقوقی خود را شرح دهید")}
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
                    disabled={loading}
                    placeholder={t("مثلاً: چک برگشتی دارم و نمی‌دانم چطور طلبم را بگیرم…")}
                    className="w-full resize-none rounded-xl border border-border-strong bg-background p-3 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {msgs.length === 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {EXAMPLES.map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => ask(ex)}
                          disabled={loading}
                          className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-foreground-soft transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                        >
                          {t(ex)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted">{t("گفتگو ادامه دارد — دستیار پاسخ‌های قبلی را به‌خاطر دارد.")}</span>
                  )}
                  <div className="flex items-center gap-2">
                    {loading && (
                      <Button variant="outline" onClick={() => abortRef.current?.abort()} icon="x">
                        {t("توقف")}
                      </Button>
                    )}
                    <Button onClick={() => ask()} disabled={loading} icon="send">
                      {loading ? t("در حال پاسخ…") : t("بپرس")}
                    </Button>
                  </div>
                </div>
              </Card>

              {error && (
                <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
                  {error}
                </div>
              )}

              {/* نخ گفتگو — سؤال کاربر حباب‌وار، پاسخ دستیار به‌صورت زنده تایپ می‌شود */}
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
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-text">
                                  <Icon name="sparkles" className="h-4 w-4" />
                                </span>
                                <span className="text-sm font-bold text-foreground">{t("پاسخ دستیار هوشمند")}</span>
                              </div>
                              {m.text && !m.streaming && <CopyBtn text={m.text} />}
                            </div>
                            {m.text ? (
                              <p className="whitespace-pre-line text-sm leading-7 text-foreground-soft" dir="auto">
                                {m.text}
                                {m.streaming && (
                                  <span
                                    aria-hidden
                                    className="ms-1 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-primary"
                                  />
                                )}
                              </p>
                            ) : (
                              <p className="flex items-center gap-2 text-sm text-muted">
                                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-primary" />
                                {t("دستیار در حال نوشتن پاسخ…")}
                              </p>
                            )}
                            {!m.streaming && m.sources && m.sources.length > 0 && (
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
                            {!m.streaming && (
                              <p className="border-t border-border pt-3 text-xs text-muted">
                                {t("این پاسخ توسط هوش مصنوعی تولید شده و جنبه اطلاع‌رسانی دارد؛ برای اقدام حقوقی با وکیل متخصص مشورت کنید.")}
                              </p>
                            )}
                            {!m.streaming && m.lawyerMatch && (
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

              {loading && phase === "web" && (
                <Card hover={false} className="flex items-center gap-3">
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" />
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" style={{ animationDelay: "0.2s" }} />
                  <span className="h-3 w-3 animate-pulse-dot rounded-full bg-primary" style={{ animationDelay: "0.4s" }} />
                  <span className="text-sm text-muted">{t("در حال جستجوی وب برای اطلاعات به‌روز…")}</span>
                </Card>
              )}
            </>
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
