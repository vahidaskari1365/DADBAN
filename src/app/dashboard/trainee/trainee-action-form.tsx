"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

type CaseOption = { id: number; label: string };

/**
 * فرم «ثبت اقدام» کارآموز — ارسال رویداد به کارتابل پرونده.
 * مصرف‌کنندهٔ API موجود پنل وکیل: POST /api/portal/cases/[id]/events
 * (این API متعلق به ایجنت پنل وکیل است — در صورت 403/404 پیام مناسب نمایش داده می‌شود.)
 */
export default function TraineeActionForm({ cases, actorName }: { cases: CaseOption[]; actorName: string }) {
  const t = useT();
  const [caseId, setCaseId] = useState(cases[0] ? String(cases[0].id) : "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseId) {
      setMsg({ ok: false, text: t("ابتدا پروندهٔ موردنظر را انتخاب کنید.") });
      return;
    }
    if (!title.trim()) {
      setMsg({ ok: false, text: t("عنوان اقدام را وارد کنید.") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/portal/cases/${encodeURIComponent(caseId)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          visibleToClient,
          actor: "trainee",
          actorName,
        }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: t("اقدام با موفقیت در کارتابل پرونده ثبت شد.") });
        setTitle("");
        setDescription("");
      } else if (res.status === 401) {
        setMsg({ ok: false, text: t("برای ثبت اقدام باید وارد حساب کاربری شوید.") });
      } else if (res.status === 403) {
        setMsg({ ok: false, text: t("دسترسی ثبت اقدام برای این پرونده ندارید — فقط وکیل یا کارآموزِ همان پرونده مجاز است.") });
      } else if (res.status === 404) {
        setMsg({ ok: false, text: t("سرویس ثبت اقدام هنوز در دسترس نیست؛ بعداً تلاش کنید.") });
      } else {
        setMsg({ ok: false, text: t("ثبت اقدام ناموفق بود؛ لطفاً دوباره تلاش کنید.") });
      }
    } catch {
      setMsg({ ok: false, text: t("خطای شبکه؛ اتصال خود را بررسی کنید.") });
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus:border-accent";
  const labelCls = "mb-1.5 block text-xs font-bold text-foreground-soft";

  return (
    <form onSubmit={submit} className="space-y-3.5" aria-label={t("فرم ثبت اقدام پرونده")}>
      <div>
        <label htmlFor="ta-case" className={labelCls}>
          {t("پرونده")}
        </label>
        <select
          id="ta-case"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          className={inputCls}
          disabled={cases.length === 0 || busy}
        >
          {cases.length === 0 && <option value="">{t("پرونده‌ای برای ارجاع وجود ندارد")}</option>}
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ta-title" className={labelCls}>
          {t("عنوان اقدام")}
        </label>
        <input
          id="ta-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("مثال: پیگیری ابلاغیه دادگاه و تهیهٔ لایحه")}
          className={inputCls}
          maxLength={120}
          disabled={busy}
        />
      </div>
      <div>
        <label htmlFor="ta-desc" className={labelCls}>
          {t("شرح اقدام (اختیاری)")}
        </label>
        <textarea
          id="ta-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("خلاصهٔ اقدام انجام‌شده، مراجع و نتیجهٔ آن…")}
          className="min-h-24 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm leading-6 text-foreground outline-none transition-colors focus:border-accent"
          maxLength={800}
          disabled={busy}
        />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl bg-surface-2/60 px-3.5 text-sm text-foreground">
        <input
          type="checkbox"
          checked={visibleToClient}
          onChange={(e) => setVisibleToClient(e.target.checked)}
          className="h-4 w-4 accent-[#d5a84c]"
          disabled={busy}
        />
        <span>{t("نمایش این اقدام به موکل در پیگیری پرونده")}</span>
      </label>

      {msg && (
        <p
          role="status"
          className={`rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
            msg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || cases.length === 0}
        className="btn-gold inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition-all disabled:opacity-50"
      >
        <Icon name="check" className="h-4 w-4" />
        {busy ? t("در حال ثبت…") : t("ثبت اقدام در کارتابل")}
      </button>
    </form>
  );
}
