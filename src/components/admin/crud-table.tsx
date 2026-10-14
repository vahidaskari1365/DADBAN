"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/**
 * جدول مدیریت محتوای وردپرس‌مانند — قابل استفادهٔ مجدد برای هر بخش محتوایی.
 * - فهرست با جستجوی زنده + دکمهٔ افزودن
 * - فرم افزودن/ویرایش ساخته‌شده از پیکربندی فیلدها
 * - حذف با تأیید؛ همهٔ عملیات با /api/admin/{resource} سینک می‌شود
 * - تغییرات بلافاصله در سایت عمومی نمایش داده می‌شود (صفحات DB-first هستند)
 */

export type CrudFieldType = "text" | "textarea" | "number" | "boolean" | "csv" | "image" | "select";

export interface CrudField {
  key: string;
  label: string;
  type?: CrudFieldType;
  placeholder?: string;
  /** فقط برای type="csv" — راهنمای جداکننده */
  hint?: string;
  /** فقط برای type="select" — گزینه‌های قابل انتخاب (رشتهٔ ساده یا value/label) */
  options?: (string | { value: string; label: string })[];
  /** فیلدهای لازم برای ساخت رکورد جدید (پیش‌فرض: همه به‌جز id/createdAt) */
  required?: boolean;
  /** مقدار پیش‌فرض بولین هنگام ساخت رکورد جدید (پیش‌فرض: false) */
  default?: boolean;
  span?: 1 | 2;
}

export interface CrudColumn {
  key: string;
  label: string;
  /** مقدار نمایشی — اگر null/خالی باشد «—» نشان داده می‌شود */
  render?: (row: Record<string, unknown>) => string;
}

interface Row extends Record<string, unknown> {
  id: number;
}

const EMPTY: Record<string, unknown> = {};

/** آپلود تصویر به /api/admin/upload — خروجی: url عمومی /api/media/{id} */
function ImageField({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (url: string) => void;
  onError: (msg: string) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadRouter = useRouter();

  const upload = async (file: File) => {
    setBusy(true);
    onError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.status === 401) {
        uploadRouter.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        onError(data.error || t("آپلود ناموفق بود"));
        return;
      }
      onChange(data.url as string);
    } catch {
      onError(t("خطا در آپلود تصویر"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-3">
      {value ? (
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش url همان دامنه از رسانهٔ ادمین */}
          <img src={value} alt="" className="h-full w-full object-cover" data-testid="crud-image-preview" />
        </div>
      ) : (
        <span className="inline-flex h-20 w-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 text-muted">
          <Icon name="document" className="h-6 w-6" />
        </span>
      )}
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
          aria-label={t("انتخاب تصویر")}
          data-testid="crud-image-input"
          className="block w-56 text-xs text-muted file:me-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="self-start rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold text-muted transition hover:border-destructive hover:text-destructive"
          >
            {t("حذف تصویر")}
          </button>
        )}
        <p className="text-[11px] leading-5 text-muted">{t("PNG، JPEG، WebP یا GIF — حداکثر ۳ مگابایت")}</p>
      </div>
    </div>
  );
}

function displayValue(row: Record<string, unknown>, col: CrudColumn): string {
  if (col.render) return col.render(row);
  const v = row[col.key];
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  return String(v).length > 80 ? `${String(v).slice(0, 80)}…` : String(v);
}

export function AdminCrudTable({
  resource,
  title,
  description,
  itemLabel,
  fields,
  columns,
  searchKeys,
  sortBy,
}: {
  resource: string;
  title: string;
  description?: string;
  itemLabel: string;
  fields: CrudField[];
  columns: CrudColumn[];
  searchKeys: string[];
  /** مرتب‌سازی پیش‌فرض فهرست بر اساس این کلید (صعودی) */
  sortBy?: string;
}) {
  const router = useRouter();
  const t = useT();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/${resource}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.ok) setRows(data.rows as Row[]);
      else setError(t("خطا در دریافت داده‌ها"));
    } catch {
      setError(t("خطا در دریافت داده‌ها"));
    }
  }, [resource, router, t]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/${resource}`, { cache: "no-store" })
      .then((res) => {
        if (res.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!alive || !data) return;
        if (data.ok) setRows(data.rows as Row[]);
        else setError(t("خطا در دریافت داده‌ها"));
      })
      .catch(() => {
        if (alive) setError(t("خطا در دریافت داده‌ها"));
      });
    return () => {
      alive = false;
    };
  }, [resource, router, t]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const term = q.trim().toLowerCase();
    const list = term
      ? rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(term)))
      : rows;
    if (!sortBy) return list;
    return [...list].sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), "fa");
    });
  }, [rows, q, searchKeys, sortBy]);

  const startNew = () => {
    const initial: Record<string, unknown> = {};
    for (const f of fields) {
      initial[f.key] = f.type === "number" ? 0 : f.type === "boolean" ? (f.default ?? false) : "";
    }
    setForm(initial);
    setEditing("new");
    setError("");
    setNotice("");
  };

  const startEdit = (row: Row) => {
    const initial: Record<string, unknown> = {};
    for (const f of fields) initial[f.key] = row[f.key] ?? (f.type === "number" ? 0 : f.type === "boolean" ? false : "");
    setForm(initial);
    setEditing(row);
    setError("");
    setNotice("");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload =
        editing === "new"
          ? { fields: form }
          : { id: (editing as Row).id, changes: form };
      const res = await fetch(`/api/admin/${resource}`, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        setError(t("ذخیره ناموفق بود — فیلدها را بررسی کنید"));
        return;
      }
      setEditing(null);
      setNotice(editing === "new" ? t("مطلب جدید ساخته شد و در سایت نمایش داده می‌شود.") : t("تغییرات ذخیره شد و در سایت اعمال شد."));
      await load();
      router.refresh();
    } catch {
      setError(t("خطای ارتباط با سرور"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    if (!confirm(t("این رکورد حذف شود؟ این عمل بازگشت‌پذیر نیست."))) return;
    try {
      const res = await fetch(`/api/admin/${resource}?id=${row.id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setNotice(t("حذف شد و از سایت برداشته شد."));
        await load();
        router.refresh();
      } else setError(t("حذف ناموفق بود"));
    } catch {
      setError(t("خطای ارتباط با سرور"));
    }
  };

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-foreground">{t(title)}</h1>
          {description && <p className="mt-1 text-sm text-muted">{t(description)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("جستجو…")}
              aria-label={t("جستجو")}
              className="h-10 w-44 rounded-xl border border-border bg-surface pr-9 pl-3 text-sm text-foreground outline-none transition focus:border-primary sm:w-56"
            />
          </div>
          <Button onClick={startNew} icon="plus" data-testid="crud-add">
            {t("افزودن")} {t(itemLabel)}
          </Button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success" data-testid="crud-notice">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" data-testid="crud-error">
          {error}
        </div>
      )}

      {/* فرم افزودن/ویرایش */}
      {editing && (
        <Card hover={false} className="mb-6 border-primary/30" data-testid="crud-form">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="document" className="h-5 w-5 text-primary" />
            {editing === "new" ? `${t("افزودن")} ${t(itemLabel)}` : t("ویرایش")}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.span === 2 || f.type === "textarea" ? "sm:col-span-2" : ""}>
                <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor={`crud-${f.key}`}>
                  {t(f.label)}
                  {f.required && <span className="text-destructive"> *</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    id={`crud-${f.key}`}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder ? t(f.placeholder) : undefined}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm leading-7 text-foreground outline-none transition focus:border-primary"
                  />
                ) : f.type === "image" ? (
                  <ImageField
                    value={String(form[f.key] ?? "")}
                    onChange={(url) => setForm((s) => ({ ...s, [f.key]: url }))}
                    onError={(msg) => setError(msg)}
                  />
                ) : f.type === "select" ? (
                  <select
                    id={`crud-${f.key}`}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    {(f.options ?? []).map((opt) => {
                      const value = typeof opt === "string" ? opt : opt.value;
                      const label = typeof opt === "string" ? t(opt) : t(opt.label);
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                ) : f.type === "boolean" ? (
                  <button
                    id={`crud-${f.key}`}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, [f.key]: !s[f.key] }))}
                    aria-pressed={!!form[f.key]}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${
                      form[f.key] ? "border-success/40 bg-success/10 text-success" : "border-border bg-surface text-muted"
                    }`}
                  >
                    <Icon name={form[f.key] ? "check" : "x"} className="h-4 w-4" />
                    {form[f.key] ? t("فعال") : t("غیرفعال")}
                  </button>
                ) : (
                  <input
                    id={`crud-${f.key}`}
                    type={f.type === "number" ? "number" : "text"}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [f.key]: f.type === "number" ? Number(e.target.value || 0) : e.target.value }))
                    }
                    placeholder={f.placeholder ? t(f.placeholder) : undefined}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                )}
                {(f.hint || f.type === "csv") && (
                  <p className="mt-1 text-[11px] leading-5 text-muted">
                    {f.hint ?? t("موارد را با «،» از هم جدا کنید")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2">
            <Button onClick={save} disabled={saving} data-testid="crud-save">
              {saving ? t("در حال ذخیره…") : t("ذخیره")}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t("انصراف")}
            </Button>
          </div>
        </Card>
      )}

      {/* فهرست */}
      <Card hover={false} className="overflow-hidden p-0">
        {filtered === null ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">
            {q ? t("چیزی یافت نشد") : t("هنوز موردی ثبت نشده — با دکمهٔ «افزودن» اولین مورد را بسازید.")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm" data-testid="crud-table">
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-xs text-muted">
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-bold">
                      {t(c.label)}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-bold">{t("عملیات")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 transition hover:bg-surface-2/40">
                    {columns.map((c) => (
                      <td key={c.key} className="max-w-[26rem] px-4 py-3 align-top text-foreground-soft" title={displayValue(row, c)}>
                        {displayValue(row, c)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEdit(row)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
                          data-testid="crud-edit"
                        >
                          <Icon name="document" className="h-3.5 w-3.5" /> {t("ویرایش")}
                        </button>
                        <button
                          onClick={() => remove(row)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-bold text-muted transition hover:border-destructive hover:text-destructive"
                          data-testid="crud-delete"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" /> {t("حذف")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
        <Icon name="check" className="h-3.5 w-3.5 text-success" />
        {t("هر تغییر بلافاصله در صفحهٔ عمومی سایت نمایش داده می‌شود.")}
        {filtered && (
          <span className="mr-2 rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-bold text-muted">
            {filtered.length} {t("مورد")}
          </span>
        )}
      </p>
    </Container>
  );
}
