"use client";

// ============================================================
// دادبان — فرم «سبک نگارش من»: لحن + ثابت‌ها + نمونه‌های نگارش
// فایل نمونه (docx/pdf/txt/عکس) با همان زیرساخت استخراج قرارداد
// خوانده می‌شود؛ traits با یک فراخوانی LLM استخراج و نمایش داده می‌شود.
// ============================================================

import { useRef, useState } from "react";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import type { StyleSample } from "@/lib/lawyer-style";

const MAX_SAMPLES = 3;
const MAX_SAMPLE_CHARS = 1500;

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const inputCls =
  "w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";
const labelCls = "mb-1.5 block text-[13px] font-semibold text-foreground";

const TONES: { value: "formal" | "simple" | "mixed"; label: string; desc: string }[] = [
  { value: "formal", label: "رسمیِ حقوقی", desc: "ادبیات محافل قضایی، جملات کامل" },
  { value: "simple", label: "سادهٔ حقوقی", desc: "روشن و دقیق، جملات کوتاه‌تر" },
  { value: "mixed", label: "ترکیبی", desc: "رسمی با توضیح ساده‌تر در صورت نیاز" },
];

export function StyleProfileForm({
  initial,
}: {
  initial: {
    tone: "formal" | "simple" | "mixed";
    fixedOpening: string;
    fixedClosing: string;
    samples: StyleSample[];
    traits: string;
  };
}) {
  const t = useT();
  const [tone, setTone] = useState<"formal" | "simple" | "mixed">(initial.tone);
  const [fixedOpening, setFixedOpening] = useState(initial.fixedOpening);
  const [fixedClosing, setFixedClosing] = useState(initial.fixedClosing);
  const [samples, setSamples] = useState<StyleSample[]>(initial.samples.slice(0, MAX_SAMPLES));
  const [traits, setTraits] = useState(initial.traits);

  const [busy, setBusy] = useState<"none" | "extract" | "save" | "file">("none");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploadIdx, setUploadIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const setSample = (i: number, patch: Partial<StyleSample>) =>
    setSamples((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  function addSample() {
    if (samples.length >= MAX_SAMPLES) return;
    setSamples((prev) => [...prev, { name: "", text: "" }]);
  }

  function removeSample(i: number) {
    setSamples((prev) => prev.filter((_, idx) => idx !== i));
  }

  function pickFile(i: number) {
    setUploadIdx(i);
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || uploadIdx === null) return;
    const idx = uploadIdx;
    setBusy("file");
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/lawyer-style/extract-file", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; text?: string; error?: string } | null;
      if (!res.ok || !data?.ok || !data.text) {
        setMsg({ ok: false, text: data?.error ?? t("استخراج متن از فایل ناموفق بود.") });
      } else {
        setSample(idx, { name: f.name, text: data.text.slice(0, MAX_SAMPLE_CHARS) });
        setMsg({ ok: true, text: t("متن نمونه استخراج شد.") });
      }
    } catch {
      setMsg({ ok: false, text: t("آپلود فایل با خطا مواجه شد.") });
    } finally {
      setBusy("none");
      setUploadIdx(null);
    }
  }

  async function extractTraits() {
    const valid = samples.filter((s) => s.text.trim().length > 20);
    if (valid.length === 0) {
      setMsg({ ok: false, text: t("برای استخراج سبک، دست‌کم یک نمونهٔ نگارش وارد کنید.") });
      return;
    }
    setBusy("extract");
    setMsg(null);
    try {
      const res = await fetch("/api/lawyer-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extract", samples: valid }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; traits?: string; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setMsg({ ok: false, text: data?.error ?? t("استخراج سبک ناموفق بود.") });
      } else {
        setTraits(data.traits ?? "");
        setMsg({ ok: true, text: t("سبک شما استخراج شد. می‌توانید ویرایشش کنید و سپس ذخیره بزنید.") });
      }
    } catch {
      setMsg({ ok: false, text: t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.") });
    } finally {
      setBusy("none");
    }
  }

  async function save() {
    setBusy("save");
    setMsg(null);
    try {
      const res = await fetch("/api/lawyer-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", tone, fixedOpening, fixedClosing, samples, traits }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setMsg({ ok: false, text: data?.error ?? t("ذخیره با خطا مواجه شد.") });
      } else {
        setMsg({ ok: true, text: data.message ?? t("ذخیره شد.") });
      }
    } catch {
      setMsg({ ok: false, text: t("خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.") });
    } finally {
      setBusy("none");
    }
  }

  const validSamples = samples.filter((s) => s.text.trim().length > 20).length;

  return (
    <Card hover={false} className="space-y-5" data-testid="style-form">
      <input ref={fileRef} type="file" accept=".txt,.md,.docx,.pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />

      {/* لحن */}
      <div>
        <span className={labelCls}>{t("لحن کلی اسناد")}</span>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("لحن کلی اسناد")}>
          {TONES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={tone === opt.value}
              onClick={() => setTone(opt.value)}
              className={`rounded-xl border p-3 text-right transition-all ${
                tone === opt.value
                  ? "border-primary bg-primary-soft/60 shadow-sm"
                  : "border-border-strong bg-background hover:bg-surface-2"
              }`}
            >
              <span className={`block text-sm font-bold ${tone === opt.value ? "text-primary" : "text-foreground"}`}>{t(opt.label)}</span>
              <span className="mt-1 block text-[11px] leading-5 text-foreground-soft">{t(opt.desc)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ثابت‌ها */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="style-opening">{t("عبارت/پاراگراف آغازین ثابت (اختیاری)")}</label>
          <textarea
            id="style-opening"
            className={`${inputCls} min-h-24 resize-y`}
            value={fixedOpening}
            onChange={(e) => setFixedOpening(e.target.value.slice(0, 700))}
            placeholder={t("مثلاً: «احتراماً، در خصوص پروندهٔ کلاسهٔ … به استحضار می‌رساند…»")}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="style-closing">{t("عبارت/پاراگراف پایانی ثابت (اختیاری)")}</label>
          <textarea
            id="style-closing"
            className={`${inputCls} min-h-24 resize-y`}
            value={fixedClosing}
            onChange={(e) => setFixedClosing(e.target.value.slice(0, 700))}
            placeholder={t("مثلاً: «نظر به مراتب فوق، صدور حکم موجه و قانونی است. با احترام…»")}
          />
        </div>
      </div>

      {/* نمونه‌ها */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className={labelCls + " !mb-0"}>
            {t("نمونه‌های نگارش خودتان (حداکثر ۳ نمونه)")}{" "}
            <span className="text-[11px] font-normal text-foreground-soft">
              — {t("متن نمونه هرگز کپی نمی‌شود؛ فقط لحن الگو می‌شود")}
            </span>
          </span>
          {samples.length < MAX_SAMPLES && (
            <Button variant="outline" size="sm" icon="plus" onClick={addSample}>
              {t("افزودن نمونه")}
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {samples.length === 0 && (
            <p className="rounded-xl border border-dashed border-border-strong bg-surface-2/50 p-4 text-center text-xs text-foreground-soft">
              {t("هنوز نمونه‌ای اضافه نکرده‌اید. با «افزودن نمونه» شروع کنید — می‌توانید متن بچسبانید یا فایل docx/pdf/عکس آپلود کنید.")}
            </p>
          )}
          {samples.map((s, i) => (
            <div key={i} className="rounded-xl border border-border-strong bg-background p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <input
                  className={`${inputCls} max-w-64 flex-1`}
                  value={s.name}
                  onChange={(e) => setSample(i, { name: e.target.value.slice(0, 120) })}
                  placeholder={t("نام نمونه (مثلاً: لایحهٔ دفاعیهٔ پروندهٔ چک)")}
                  aria-label={t("نام نمونه")}
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" icon="file" onClick={() => pickFile(i)} disabled={busy !== "none"}>
                    {busy === "file" && uploadIdx === i ? <Spinner /> : t("آپلود فایل")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeSample(i)} aria-label={t("حذف نمونه")}>
                    <Icon name="trash" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <textarea
                className={`${inputCls} min-h-32 resize-y`}
                value={s.text}
                onChange={(e) => setSample(i, { text: e.target.value.slice(0, MAX_SAMPLE_CHARS) })}
                placeholder={t("متن نمونه نگارش خود را اینجا بچسبانید یا از فایل آپلود کنید…")}
                aria-label={t("متن نمونه")}
              />
              <div className="mt-1 text-left text-[11px] text-foreground-soft">{s.text.length}/۱۵۰۰</div>
            </div>
          ))}
        </div>
      </div>

      {/* استخراج و ذخیره */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="accent" size="md" icon="sparkles" onClick={extractTraits} disabled={busy !== "none" || validSamples === 0}>
            {busy === "extract" ? <Spinner /> : <Icon name="sparkles" className="h-4 w-4" />}
            {t("استخراج سبک با هوش مصنوعی")}
          </Button>
          <Button size="md" icon="check" onClick={save} disabled={busy !== "none"}>
            {busy === "save" ? <Spinner /> : <Icon name="check" className="h-4 w-4" />}
            {t("ذخیرهٔ پروفایل سبک")}
          </Button>
        </div>

        {traits.trim() ? (
          <div className="rounded-xl border border-primary/30 bg-primary-soft/30 p-3" data-testid="traits-box">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-bold text-primary">
              <Icon name="signature" className="h-4 w-4" /> {t("سبک استخراج‌شده (قابل ویرایش)")}
            </div>
            <textarea
              className={`${inputCls} min-h-24 resize-y bg-transparent`}
              value={traits}
              onChange={(e) => setTraits(e.target.value.slice(0, 1200))}
              aria-label={t("سبک استخراج‌شده")}
            />
          </div>
        ) : null}

        {msg && (
          <p
            role="status"
            className={`rounded-xl px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}
          >
            {msg.text}
          </p>
        )}
      </div>
    </Card>
  );
}
