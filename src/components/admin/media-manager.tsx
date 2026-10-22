"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { faNum } from "@/lib/data";
import { shrinkImageFile } from "@/lib/image-file";

/**
 * کتابخانه رسانه ادمین — شبکه‌ای از تصاویر آپلودشده با آپلود، کپی نشانی و حذف.
 * داده از /api/admin/media و آپلود از /api/admin/upload (همان endpoint فیلد تصویر CrudTable).
 */

interface MediaRow {
  id: number;
  filename: string;
  mime: string;
  size: number;
  url: string;
  createdAt: string;
}

/** واکشی لیست رسانه‌ها — بدون setState؛ نتیجه به caller برمی‌گردد */
async function fetchMedia(): Promise<{ ok: boolean; rows?: MediaRow[]; unauthorized?: boolean }> {
  try {
    const res = await fetch("/api/admin/media", { cache: "no-store" });
    if (res.status === 401) return { ok: false, unauthorized: true };
    const data = await res.json();
    return data.ok ? { ok: true, rows: data.rows as MediaRow[] } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${faNum(Math.round((bytes / (1024 * 1024)) * 10) / 10)} مگابایت`;
  if (bytes >= 1024) return `${faNum(Math.round(bytes / 1024))} کیلوبایت`;
  return `${faNum(bytes)} بایت`;
}

export function MediaManager() {
  const router = useRouter();
  const t = useT();
  const [rows, setRows] = useState<MediaRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const apply = useCallback(
    (r: { ok: boolean; rows?: MediaRow[]; unauthorized?: boolean }) => {
      if (r.unauthorized) {
        router.replace("/admin/login");
        return;
      }
      if (r.ok && r.rows) setRows(r.rows);
      else setError(t("خطا در دریافت رسانه‌ها"));
    },
    [router, t],
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await fetchMedia();
      if (!alive) return;
      apply(r);
    })();
    return () => {
      alive = false;
    };
  }, [apply]);

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const out = file.size > 2_500_000 ? await shrinkImageFile(file, 1600, 0.85) : file;
      const fd = new FormData();
      fd.append("file", out);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || t("آپلود ناموفق بود"));
        return;
      }
      setRows((prev) =>
        prev
          ? [
              {
                id: data.id as number,
                filename: file.name.slice(0, 120),
                mime: file.type || "image/jpeg",
                size: out.size,
                url: data.url as string,
                createdAt: new Date().toISOString(),
              },
              ...prev,
            ]
          : prev,
      );
      setNotice(t("تصویر بارگذاری شد و نشانی آن آمادهٔ کپی است."));
    } catch {
      setError(t("خطا در آپلود تصویر"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const copyUrl = async (row: MediaRow) => {
    try {
      const abs = `${window.location.origin}${row.url}`;
      await navigator.clipboard.writeText(abs);
      setNotice(t("نشانی تصویر کپی شد."));
      setError("");
    } catch {
      setError(t("کپی نشد — نشانی: ") + row.url);
    }
  };

  const remove = async (row: MediaRow) => {
    if (!confirm(t("این تصویر از رسانه‌ها حذف شود؟ اگر در جایی از سایت استفاده شده باشد، جای خالی آن باقی می‌ماند."))) return;
    try {
      const res = await fetch(`/api/admin/media?id=${row.id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setRows((prev) => (prev ? prev.filter((x) => x.id !== row.id) : prev));
        setNotice(t("تصویر حذف شد."));
        setError("");
      } else setError(data.error || t("حذف ناموفق بود"));
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-foreground-soft">
          <Icon name="camera" className="h-4 w-4 text-primary" />
          {rows ? (
            <span>
              {faNum(rows.length)} {t("تصویر در کتابخانه")}
            </span>
          ) : (
            t("در حال بارگذاری…")
          )}
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
            className="hidden"
            data-testid="media-input"
          />
          <Button onClick={() => inputRef.current?.click()} icon="plus" disabled={busy} data-testid="media-upload">
            {busy ? t("در حال بارگذاری…") : t("بارگذاری تصویر")}
          </Button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-bold text-success" data-testid="media-notice">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive" data-testid="media-error">
          {error}
        </div>
      )}

      {rows === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card hover={false} className="py-14 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Icon name="camera" className="h-7 w-7" />
          </span>
          <p className="text-sm font-bold text-foreground">{t("هنوز تصویری بارگذاری نشده است.")}</p>
          <p className="mt-1 text-xs text-foreground-soft">
            {t("با دکمهٔ «بارگذاری تصویر» اولین رسانه را اضافه کنید — تصاویر بزرگ خودکار کوچک می‌شوند.")}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-testid="media-grid">
          {rows.map((row) => (
            <Card key={row.id} hover={false} className="overflow-hidden p-0" data-testid="media-card">
              <div className="group relative aspect-square overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش رسانهٔ همان دامنه */}
                <img src={row.url} alt={row.filename} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-2.5 opacity-100 transition-opacity focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100" dir="ltr">
                  <button
                    type="button"
                    onClick={() => void copyUrl(row)}
                    title={t("کپی نشانی")}
                    aria-label={t("کپی نشانی")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-900 transition hover:bg-white"
                    data-testid="media-copy"
                  >
                    <Icon name="copy" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(row)}
                    title={t("حذف")}
                    aria-label={t("حذف")}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-red-700 transition hover:bg-white"
                    data-testid="media-delete"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="truncate text-xs font-bold text-foreground" title={row.filename}>
                  {row.filename}
                </p>
                <p className="mt-0.5 text-[10px] font-semibold text-foreground-soft">{sizeLabel(row.size)}</p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-foreground-soft/80" dir="ltr" title={row.url}>
                  {row.url}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
