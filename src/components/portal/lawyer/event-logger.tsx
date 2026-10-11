"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { toEn, toFa } from "@/lib/money";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/** فرم «ثبت اقدام جدید» در روند پرونده → POST /api/portal/cases/[id]/events */
export function EventLogger({ caseId, canWrite }: { caseId: number; canWrite: boolean }) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState("");
  const [visible, setVisible] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (title.trim().length < 3) {
      toast.error(t("عنوان اقدام را وارد کنید."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/portal/cases/${caseId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          progress: progress ? Number(toEn(progress).replace(/[^\d]/g, "")) : undefined,
          visibleToClient: visible,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success(visible ? t("اقدام ثبت شد و برای موکل قابل مشاهده است.") : t("اقدام داخلی ثبت شد."));
        setTitle("");
        setDescription("");
        setProgress("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error ?? t("ثبت اقدام ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setSaving(false);
    }
  }

  if (!canWrite) {
    return <p className="rounded-xl bg-surface-2 px-4 py-3 text-xs text-muted">{t("ثبت اقدام فقط با حساب وکیل یا کارآموز امکان‌پذیر است.")}</p>;
  }

  if (!open) {
    return (
      <Button variant="primary" size="md" onClick={() => setOpen(true)}>
        <Icon name="plus" className="h-4 w-4" />
        {t("ثبت اقدام جدید")}
      </Button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-border bg-surface-2/40 p-4">
      <div className="flex items-center justify-between">
        <b className="text-sm text-foreground">{t("ثبت اقدام جدید")}</b>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t("بستن فرم")}
          className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-foreground-soft hover:bg-surface-3"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">{t("عنوان اقدام")}</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("مثلاً بررسی سند مالکیت")}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">{t("توضیحات")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t("شرح اقدام انجام‌شده...")}
          className="min-h-20 w-full resize-y rounded-xl border border-border bg-surface p-3 text-sm outline-none focus:border-primary/40"
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted">{t("پیشرفت کل پرونده (٪)")}</span>
          <input
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            inputMode="numeric"
            placeholder={t("مثلاً ۶۵")}
            className="h-11 w-28 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
          />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground-soft">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="h-4 w-4 accent-[#d5a84c]"
          />
          {t("قابل مشاهده برای موکل")}
        </label>
      </div>
      <Button variant="primary" size="md" onClick={() => void submit()} disabled={saving}>
        <Icon name="check" className="h-4 w-4" />
        {saving ? t("در حال ثبت...") : t("ثبت اقدام")}
      </Button>
      <p className="text-[11px] text-muted">
        {tf("اگر پیشرفت جدید بیشتر از مقدار فعلی باشد، نوار پیشرفت پرونده به همان مقدار ({n}٪) به‌روز می‌شود.", { n: toFa(progress || "—") })}
      </p>
    </div>
  );
}
