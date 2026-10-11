"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { formatJalaliDateTime } from "@/lib/jalali";
import { useT } from "@/lib/i18n/provider";

type CaseDoc = {
  id: number;
  caseId: number;
  uploadedBy: number | null;
  uploaderRole: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.heic,.heif,.doc,.docx,.txt,application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

const ROLE_FA: Record<string, string> = { client: "موکل", lawyer: "وکیل", staff: "کارشناس" };

/** اندازهٔ خوانا برای انسان — با ارقام فارسی */
function faSize(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return faNum(0) + " بایت";
  if (n < 1024) return `${faNum(n)} بایت`;
  if (n < 1024 * 1024) return `${faNum(Math.round(n / 1024))} کیلوبایت`;
  return `${faNum((n / (1024 * 1024)).toFixed(1))} مگابایت`;
}

/** آیکن بر اساس نوع فایل */
function docIcon(mime: string) {
  if (mime === "application/pdf") return "document" as const;
  if (mime.startsWith("image/")) return "file" as const;
  if (mime.includes("word")) return "book" as const;
  return "file" as const;
}

/**
 * مدیریت مدارک پرونده — آپلود واقعی فایل (≤۵MB)، دانلود و حذف.
 * مالکیت/مجوز در API با همان منطق صفحهٔ جزئیات پرونده اعتبارسنجی می‌شود.
 */
export default function CaseDocumentsManager({ caseId, role }: { caseId: number; role: string }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<CaseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!msg) return;
    const timer = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(timer);
  }, [msg]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/case-documents?caseId=${encodeURIComponent(String(caseId))}`);
      const data = await res.json().catch(() => null);
      if (data?.ok && Array.isArray(data.documents)) setDocs(data.documents as CaseDoc[]);
      else if (res.status !== 401) setMsg({ ok: false, text: t("فهرست مدارک بارگذاری نشد.") });
    } catch {
      setMsg({ ok: false, text: t("خطا در ارتباط با سرور") });
    } finally {
      setLoading(false);
    }
  }, [caseId, t]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const upload = useCallback(
    async (file: File) => {
      if (file.size > 5 * 1024 * 1024) {
        setMsg({ ok: false, text: t("حجم فایل بیش از ۵ مگابایت است.") });
        return;
      }
      setUploading(true);
      setMsg(null);
      try {
        const form = new FormData();
        form.set("caseId", String(caseId));
        form.set("file", file);
        const res = await fetch("/api/case-documents", { method: "POST", body: form });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && data.document) {
          setDocs((prev) => [data.document as CaseDoc, ...prev]);
          setMsg({ ok: true, text: t("مدرک با موفقیت بارگذاری شد.") });
        } else if (res.status === 401) {
          setMsg({ ok: false, text: t("ابتدا وارد حساب خود شوید.") });
        } else {
          setMsg({ ok: false, text: data?.error ?? t("بارگذاری مدرک ناموفق بود.") });
        }
      } catch {
        setMsg({ ok: false, text: t("خطا در ارتباط با سرور") });
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [caseId, t],
  );

  const remove = useCallback(
    async (id: number) => {
      if (!window.confirm(t("این مدرک حذف شود؟"))) return;
      setDeletingId(id);
      try {
        const res = await fetch(`/api/case-documents?id=${encodeURIComponent(String(id))}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setDocs((prev) => prev.filter((d) => d.id !== id));
          setMsg({ ok: true, text: t("مدرک حذف شد.") });
        } else if (res.status === 401) {
          setMsg({ ok: false, text: t("ابتدا وارد حساب خود شوید.") });
        } else {
          setMsg({ ok: false, text: data?.error ?? t("حذف مدرک ناموفق بود.") });
        }
      } catch {
        setMsg({ ok: false, text: t("خطا در ارتباط با سرور") });
      } finally {
        setDeletingId(null);
      }
    },
    [t],
  );

  return (
    <Card hover={false} data-testid="case-docs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="document" className="h-5 w-5 text-primary" />
          {t("مدارک پرونده")}
        </h2>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            id="case-doc-input"
            aria-label={t("افزودن مدرک")}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            <Icon name="plus" className="h-4 w-4" />
            {uploading ? t("در حال بارگذاری…") : t("افزودن مدرک")}
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-xs leading-6 text-muted">
        {t("فایل‌های PDF، تصویر، Word یا متن ساده تا سقف ۵ مگابایت — برای پروندهٔ همین صفحه ذخیره می‌شود.")}
      </p>

      {uploading && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={t("در حال بارگذاری مدرک")}>
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      )}

      {msg && (
        <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${msg.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
          {msg.text}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-muted">{t("در حال بارگذاری…")}</p>
      ) : docs.length ? (
        <ul className="nice-scroll mt-4 max-h-96 space-y-3 overflow-y-auto pl-1">
          {docs.map((d) => (
            <li key={d.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-foreground-soft">
                  <Icon name={docIcon(d.mime)} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground" title={d.name}>{d.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {faSize(d.size)} • {formatJalaliDateTime(d.createdAt)}
                    {d.uploaderRole && role !== d.uploaderRole ? ` • ${t(ROLE_FA[d.uploaderRole] ?? d.uploaderRole)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`/api/case-documents?id=${encodeURIComponent(String(d.id))}`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-2"
                    aria-label={`${t("دانلود")} ${d.name}`}
                  >
                    <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" />
                    {t("دانلود")}
                  </a>
                  <button
                    type="button"
                    disabled={deletingId === d.id}
                    onClick={() => void remove(d.id)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-danger/10 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
                    aria-label={`${t("حذف")} ${d.name}`}
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                    {deletingId === d.id ? t("در حال حذف…") : t("حذف")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm leading-7 text-muted">
          {t("هنوز مدرکی برای این پرونده بارگذاری نشده است. با دکمهٔ «افزودن مدرک» اولین فایل را بفرستید تا بررسی سریع‌تر شود.")}
        </p>
      )}
    </Card>
  );
}
