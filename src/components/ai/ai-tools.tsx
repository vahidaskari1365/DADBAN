"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import type { IconKey } from "@/lib/data";

/* ============================================================
   مرکز ابزارهای هوش مصنوعی دادورزان — کلاینت
   سه ابزار: تحلیل سند (بینایی)، جستجوی وب حقوقی، استودیوی صدا
   ============================================================ */

type TabKey = "vision" | "search" | "voice";

const TABS: { key: TabKey; label: string; icon: IconKey; desc: string }[] = [
  { key: "vision", label: "تحلیل سند", icon: "document", desc: "عکس سند حقوقی را بفرستید؛ هوش مصنوعی آن را تحلیل می‌کند" },
  { key: "search", label: "جستجوی وب حقوقی", icon: "search", desc: "جستجوی زنده در منابع حقوقی وب همراه با ذکر منبع" },
  { key: "voice", label: "استودیوی صدا", icon: "chat", desc: "متن را به گفتار و گفتار را به متن تبدیل کنید" },
];

function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      {label}
    </span>
  );
}

/* ─── ۱) تحلیل سند با بینایی ماشین ─────────────────────────────────────── */

function VisionTool() {
  const t = useT();
  const tt = templateT(t);
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback((file: File) => {
    setError("");
    setResult("");
    if (!file.type.startsWith("image/")) { setError(t("لطفاً یک فایل تصویری انتخاب کنید.")); return; }
    if (file.size > 7 * 1024 * 1024) { setError(t("حجم تصویر باید کمتر از ۷ مگابایت باشد.")); return; }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); setFileName(file.name); };
    reader.readAsDataURL(file);
  }, [t]);

  async function analyze() {
    if (!image || loading) return;
    setLoading(true); setError(""); setResult("");
    try {
      const res = await fetch("/api/ai/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, question: question.trim() }),
      });
      const data = await res.json();
      if (data?.ok) setResult(String(data.analysis));
      else setError(data?.error ?? t("تحلیل ناموفق بود. دوباره تلاش کنید."));
    } catch {
      setError(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          aria-label={t("بارگذاری تصویر سند")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) readFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={`flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-primary bg-primary-soft" : "border-border-strong bg-surface-2 hover:border-primary"} ${image ? "p-4" : ""}`}
        >
          {image ? (
            <div className="w-full space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={tt("پیش‌نمایش سند: {name}", { name: fileName })} className="mx-auto max-h-64 rounded-xl border border-border object-contain" />
              <p className="truncate text-xs text-muted">{fileName}</p>
            </div>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"><Icon name="document" className="h-6 w-6" /></span>
              <p className="text-sm font-semibold text-foreground">{t("تصویر سند را اینجا بکشید یا کلیک کنید")}</p>
              <p className="text-xs text-muted">{t("دادخواست، ابلاغیه، چک، قرارداد، سند — PNG یا JPEG تا ۷ مگابایت")}</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />

        <label htmlFor="vision-question" className="block text-sm font-semibold text-foreground">{t("سؤال اختیاری از سند")}</label>
        <textarea
          id="vision-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
          rows={3}
          placeholder={t("مثلاً: مهلت اعتراض در این ابلاغیه چقدر است؟")}
          className="w-full resize-none rounded-xl border border-border bg-surface p-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
        />
        <Button onClick={analyze} disabled={!image || loading} icon="sparkles" className="w-full">
          {loading ? t("در حال تحلیل…") : t("تحلیل سند")}
        </Button>
        {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      </div>

      <div>
        <Card className="min-h-56" hover={false}>
          {loading ? (
            <div className="flex h-full min-h-56 items-center justify-center"><Spinner label={t("هوش مصنوعی در حال مطالعه‌ی سند است…")} /></div>
          ) : result ? (
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 font-bold text-foreground"><Icon name="sparkles" className="h-4 w-4 text-accent-text" /> {t("تحلیل هوش مصنوعی")}</h4>
              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground-soft">{result}</p>
            </div>
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center text-muted">
              <Icon name="file" className="h-8 w-8 opacity-40" />
              <p className="text-sm">{t("تحلیل سند اینجا نمایش داده می‌شود")}</p>
              <p className="text-xs text-muted-soft">{t("نوع سند، طرفین، ریسک‌ها، مواد قانونی مرتبط و اقدام پیشنهادی")}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── ۲) جستجوی وب حقوقی ───────────────────────────────────────────────── */

type SearchHit = { title: string; url: string; snippet: string; host: string; date: string };

function SearchTool() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true); setError(""); setHits(null);
    try {
      const res = await fetch("/api/ai/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (data?.ok) setHits(data.results ?? []);
      else setError(data?.error ?? t("جستجو ناموفق بود."));
    } catch {
      setError(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => { e.preventDefault(); search(); }}
        className="flex flex-col gap-3 sm:flex-row"
        role="search"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("مثلاً: مهلت واخواهی چقدر است؟")}
          aria-label={t("عبارت جستجو")}
          className="h-12 flex-1 rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
        />
        <Button type="submit" disabled={loading || !query.trim()} icon="search" size="lg">{t("جستجو")}</Button>
      </form>

      {loading && <div className="flex justify-center py-8"><Spinner label={t("در حال جستجوی منابع حقوقی…")} /></div>}
      {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      {hits && hits.length === 0 && <p className="py-8 text-center text-sm text-muted">{t("نتیجه‌ای یافت نشد. عبارت دیگری را امتحان کنید.")}</p>}

      {hits && hits.length > 0 && (
        <ul className="space-y-3" aria-label={t("نتایج جستجو")}>
          {hits.map((h, i) => (
            <li key={`${h.url}-${i}`}>
              <a href={h.url} target="_blank" rel="noopener noreferrer nofollow" className="block rounded-2xl border border-border bg-surface p-4 transition-all hover:border-primary hover:shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-bold text-primary">{h.title}</h4>
                  <span className="shrink-0 rounded-lg bg-surface-2 px-2 py-1 text-[11px] text-muted" dir="ltr">{h.host}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">{h.snippet}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── ۳) استودیوی صدا (TTS + ASR) ──────────────────────────────────────── */

function VoiceTool() {
  const t = useT();
  // متن به گفتار
  const [text, setText] = useState("");
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  // گفتار به متن
  const [recording, setRecording] = useState(false);
  const [asrLoading, setAsrLoading] = useState(false);
  const [asrError, setAsrError] = useState("");
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function speak() {
    const spoken = text.trim();
    if (!spoken || ttsLoading) return;
    setTtsLoading(true); setTtsError("");
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: spoken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setTtsError(data?.error ?? t("تولید صدا ناموفق بود."));
        return;
      }
      const blob = await res.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setTimeout(() => audioRef.current?.play().catch(() => {}), 60);
    } catch {
      setTtsError(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setTtsLoading(false);
    }
  }

  async function startRecording() {
    setAsrError(""); setTranscript("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setAsrLoading(true);
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          const form = new FormData();
          form.append("audio", blob, "voice.webm");
          const res = await fetch("/api/ai/asr", { method: "POST", body: form });
          const data = await res.json();
          if (data?.ok) setTranscript(String(data.text));
          else setAsrError(data?.error ?? t("تبدیل گفتار ناموفق بود."));
        } catch {
          setAsrError(t("ارتباط با سرور برقرار نشد."));
        } finally {
          setAsrLoading(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setAsrError(t("دسترسی به میکروفون داده نشد. لطفاً مجوز میکروفون را فعال کنید."));
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* متن به گفتار */}
      <Card hover={false} className="space-y-4">
        <h4 className="flex items-center gap-2 font-bold text-foreground"><Icon name="video" className="h-4 w-4 text-accent-text" /> {t("متن به گفتار")}</h4>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1024))}
          rows={5}
          placeholder={t("متنی به فارسی بنویسید تا به گفتار تبدیل شود… (حداکثر ۱۰۲۴ کاراکتر)")}
          aria-label={t("متن برای تبدیل به گفتار")}
          className="w-full resize-none rounded-xl border border-border bg-surface-2 p-3.5 text-sm leading-7 text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{text.length}/۱۰۲۴</span>
          <Button onClick={speak} disabled={ttsLoading || !text.trim()} icon="video" size="sm">
            {ttsLoading ? t("در حال تولید…") : t("تبدیل و پخش")}
          </Button>
        </div>
        {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full" aria-label={t("پخش گفتار تولیدشده")} />}
        {ttsError && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{ttsError}</p>}
      </Card>

      {/* گفتار به متن */}
      <Card hover={false} className="space-y-4">
        <h4 className="flex items-center gap-2 font-bold text-foreground"><Icon name="chat" className="h-4 w-4 text-accent-text" /> {t("گفتار به متن")}</h4>
        <p className="text-xs leading-6 text-muted">{t("دکمه را بزنید، سؤال حقوقی خود را بگویید و دوباره بزنید تا متن آن استخراج شود.")}</p>
        <div className="flex items-center justify-center py-2">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            aria-pressed={recording}
            aria-label={recording ? t("توقف ضبط") : t("شروع ضبط")}
            className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${recording ? "bg-danger text-white shadow-lg" : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-md"} cursor-pointer`}
          >
            {recording ? (
              <span className="h-6 w-6 rounded-sm bg-current" aria-hidden />
            ) : (
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
            )}
          </button>
        </div>
        <p className="text-center text-xs text-muted">{recording ? t("در حال ضبط… برای پایان دکمه را بزنید") : asrLoading ? t("در حال تبدیل…") : t("برای شروع ضبط دکمه را بزنید")}</p>
        {asrLoading && <div className="flex justify-center"><Spinner label={t("تبدیل صدای شما به متن…")} /></div>}
        {transcript && (
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <p className="mb-2 text-xs font-semibold text-muted">{t("متن استخراج‌شده:")}</p>
            <p className="text-sm leading-7 text-foreground">{transcript}</p>
            <a href={`/ai-assistant?q=${encodeURIComponent(transcript)}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              {t("پرسش از دستیار حقوقی")} <Icon name="arrow" className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
        {asrError && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{asrError}</p>}
      </Card>
    </div>
  );
}

/* ─── کامپوننت اصلی با تب‌ها ───────────────────────────────────────────── */

export function AiTools({ initialTab = "vision" }: { initialTab?: TabKey }) {
  const t = useT();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const active = TABS.find((item) => item.key === tab)!;

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label={t("ابزارهای هوش مصنوعی")} className="flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            aria-selected={tab === tb.key}
            onClick={() => setTab(tb.key)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${tab === tb.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-surface-2 text-foreground-soft hover:bg-surface-3"}`}
          >
            <Icon name={tb.icon} className="h-4 w-4" />
            {t(tb.label)}
          </button>
        ))}
      </div>

      <p className="text-sm text-muted">{t(active.desc)}</p>

      <div role="tabpanel" aria-label={t(active.label)}>
        {tab === "vision" && <VisionTool />}
        {tab === "search" && <SearchTool />}
        {tab === "voice" && <VoiceTool />}
      </div>
    </div>
  );
}
