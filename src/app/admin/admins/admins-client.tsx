"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import { ADMIN_PERMISSIONS, ADMIN_ROLES, roleLabel } from "@/lib/admin-permissions";
import { formatJalaliDateTime } from "@/lib/jalali";

/**
 * مدیریت ادمین‌های پنل — ساخت/ویرایش/غیرفعال‌سازی + تعیین دقیق دسترسی‌ها.
 * فقط برای دارندگان دسترسی «admins» (صفحهٔ سرور هم گارد شده است).
 */

interface AdminRow {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Me {
  id: number;
  super: boolean;
}

type PermSet = Set<string>;

const GROUPS: AdminPermGroup[] = ["محتوا", "عملیات", "مدیریت"];
type AdminPermGroup = (typeof ADMIN_PERMISSIONS)[number]["group"];

function permsToSet(csv: string): PermSet {
  return new Set(String(csv ?? "").split(",").map((s) => s.trim()).filter(Boolean));
}

function permSummary(csv: string): string {
  const set = permsToSet(csv);
  if (set.has("*")) return "همهٔ دسترسی‌ها";
  const labels = ADMIN_PERMISSIONS.filter((p) => set.has(p.key)).map((p) => p.label);
  if (!labels.length) return "—";
  return labels.slice(0, 3).join("، ") + (labels.length > 3 ? ` +${labels.length - 3}` : "");
}

export default function AdminsClient() {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [me, setMe] = useState<Me>({ id: 0, super: true });
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<AdminRow | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "custom", isActive: true });
  const [perms, setPerms] = useState<PermSet>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/admin-users", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setRows(data.rows as AdminRow[]);
        setMe(data.me ?? { id: 0, super: true });
      } else setError(data.error || t("خطا در دریافت داده‌ها"));
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    }
  }, [router, t]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const roleOptions = useMemo(() => {
    return Object.entries(ADMIN_ROLES).filter(([key]) => me.super || key !== "super_admin");
  }, [me.super]);

  const startNew = () => {
    setForm({ name: "", email: "", password: "", role: "content_manager", isActive: true });
    setPerms(new Set(ADMIN_ROLES.content_manager.permissions));
    setEditing("new");
    setError("");
    setNotice("");
  };

  const startEdit = (row: AdminRow) => {
    setForm({ name: row.name, email: row.email, password: "", role: row.role, isActive: row.isActive });
    setPerms(permsToSet(row.permissions));
    setEditing(row);
    setError("");
    setNotice("");
  };

  const pickRole = (role: string) => {
    setForm((f) => ({ ...f, role }));
    const preset = ADMIN_ROLES[role]?.permissions ?? [];
    setPerms(new Set(preset));
  };

  const togglePerm = (key: string) => {
    setPerms((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        permissions: [...perms],
        isActive: form.isActive,
      };
      if (form.password) payload.password = form.password;
      if (editing !== "new" && editing) payload.id = editing.id;
      const res = await fetch("/api/admin/admin-users", {
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
        setError(data.error || t("ذخیره ناموفق بود"));
        return;
      }
      setEditing(null);
      setNotice(editing === "new" ? t("ادمین جدید ساخته شد — از الان می‌تواند با ایمیل و رمز وارد پنل شود.") : t("تغییرات ادمین ذخیره شد."));
      await load();
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: AdminRow) => {
    if (row.id === me.id) return;
    if (!confirm(t("وضعیت فعال این ادمین تغییر کند؟"))) return;
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, isActive: !row.isActive }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || t("عملیات ناموفق بود"));
        return;
      }
      setNotice(t("وضعیت ادمین به‌روزرسانی شد."));
      await load();
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    }
  };

  const remove = async (row: AdminRow) => {
    if (!confirm(tf("حذف ادمین «{n}»؟ این عمل بازگشت‌پذیر نیست.", { n: row.name }))) return;
    try {
      const res = await fetch(`/api/admin/admin-users?id=${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || t("حذف ناموفق بود"));
        return;
      }
      setNotice(t("ادمین حذف شد."));
      await load();
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    }
  };

  const filtered = useMemo(() => {
    if (!rows) return null;
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => `${r.name} ${r.email} ${roleLabel(r.role)}`.toLowerCase().includes(term));
  }, [rows, q]);

  return (
    <Container className="py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-foreground">{t("مدیریت ادمین‌های پنل")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t("برای هر همکار یک حساب ادمین بسازید و دقیقاً مشخص کنید به کدام بخش‌ها دسترسی داشته باشد.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("جستجوی نام یا ایمیل…")}
              aria-label={t("جستجو")}
              className="h-10 w-44 rounded-xl border border-border bg-surface pr-9 pl-3 text-sm text-foreground outline-none transition focus:border-primary sm:w-56"
            />
          </div>
          <Button onClick={startNew} icon="plus" data-testid="admin-add">
            {t("ادمین جدید")}
          </Button>
        </div>
      </div>

      {notice && (
        <div className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success" data-testid="admins-notice">
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" data-testid="admins-error">
          {error}
        </div>
      )}

      {/* فرم ساخت/ویرایش */}
      {editing && (
        <Card hover={false} className="mb-6 border-primary/30" data-testid="admin-form">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="shield" className="h-5 w-5 text-primary" />
            {editing === "new" ? t("ساخت ادمین جدید") : t("ویرایش ادمین")}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="admin-name">
                {t("نام و نام خانوادگی")} <span className="text-destructive">*</span>
              </label>
              <input
                id="admin-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="admin-email">
                {t("ایمیل ورود")} <span className="text-destructive">*</span>
              </label>
              <input
                id="admin-email"
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="admin-password">
                {t(editing === "new" ? "رمز عبور (حداقل ۸ نویسه)" : "رمز عبور جدید (اختیاری)")}
                {editing === "new" && <span className="text-destructive"> *</span>}
              </label>
              <input
                id="admin-password"
                type="password"
                dir="ltr"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-foreground-soft" htmlFor="admin-role">
                {t("نقش (پیش‌فرض دسترسی‌ها)")}
              </label>
              <select
                id="admin-role"
                value={form.role}
                onChange={(e) => pickRole(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                {roleOptions.map(([key, def]) => (
                  <option key={key} value={key}>
                    {t(def.label)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                aria-pressed={form.isActive}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${
                  form.isActive ? "border-success/40 bg-success/10 text-success" : "border-border bg-surface text-muted"
                }`}
              >
                <Icon name={form.isActive ? "check" : "x"} className="h-4 w-4" />
                {form.isActive ? t("حساب فعال") : t("حساب غیرفعال (ورود مسدود)")}
              </button>
            </div>
          </div>

          {/* دسترسی‌های ریز */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-bold text-foreground-soft">{t("دسترسی‌های دقیق (می‌توانید پیش‌فرض نقش را تغییر دهید)")}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {GROUPS.map((group) => (
                <div key={group} className="rounded-xl border border-border bg-surface-2/40 p-3">
                  <p className="mb-2 text-[11px] font-black text-muted">{t(group)}</p>
                  <div className="space-y-1.5">
                    {ADMIN_PERMISSIONS.filter((p) => p.group === group).map((p) => (
                      <label key={p.key} className="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 text-xs transition hover:bg-surface" title={p.hint ? t(p.hint) : undefined}>
                        <input
                          type="checkbox"
                          checked={form.role === "super_admin" || perms.has(p.key) || perms.has("*")}
                          disabled={form.role === "super_admin"}
                          onChange={() => togglePerm(p.key)}
                          className="mt-0.5 h-3.5 w-3.5 accent-[var(--primary)]"
                        />
                        <span className="text-foreground-soft">{t(p.label)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <Button onClick={save} disabled={saving} data-testid="admin-save">
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
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted">{t("هنوز ادمینی غیر از مالک ساخته نشده — با «ادمین جدید» شروع کنید.")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm" data-testid="admins-table">
              <thead>
                <tr className="border-b border-border bg-surface-2/60 text-xs text-muted">
                  <th className="px-4 py-3 font-bold">{t("ادمین")}</th>
                  <th className="px-4 py-3 font-bold">{t("نقش")}</th>
                  <th className="px-4 py-3 font-bold">{t("دسترسی‌ها")}</th>
                  <th className="px-4 py-3 font-bold">{t("وضعیت")}</th>
                  <th className="px-4 py-3 font-bold">{t("آخرین ورود")}</th>
                  <th className="px-4 py-3 font-bold">{t("عملیات")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 transition hover:bg-surface-2/40">
                    <td className="px-4 py-3">
                      <p className="font-bold text-foreground">{row.name}</p>
                      <p className="text-xs text-muted" dir="ltr">
                        {row.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.role === "super_admin" ? "danger" : "primary"}>{t(roleLabel(row.role))}</Badge>
                    </td>
                    <td className="max-w-[20rem] px-4 py-3 text-xs text-foreground-soft" title={t(permSummary(row.permissions))}>
                      {t(permSummary(row.permissions))}
                    </td>
                    <td className="px-4 py-3">
                      {row.id === me.id ? (
                        <Badge tone="success">{t("شما")}</Badge>
                      ) : (
                        <button
                          onClick={() => toggleActive(row)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                            row.isActive ? "bg-success/15 text-success hover:bg-success/25" : "bg-surface-2 text-muted hover:bg-border"
                          }`}
                          data-testid="admin-toggle"
                        >
                          {row.isActive ? t("فعال") : t("غیرفعال")}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted" dir="ltr">
                      {row.lastLoginAt ? formatJalaliDateTime(row.lastLoginAt) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEdit(row)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
                          data-testid="admin-edit"
                        >
                          <Icon name="document" className="h-3.5 w-3.5" /> {t("ویرایش")}
                        </button>
                        {row.id !== me.id && (
                          <button
                            onClick={() => remove(row)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-bold text-muted transition hover:border-destructive hover:text-destructive"
                            data-testid="admin-delete"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" /> {t("حذف")}
                          </button>
                        )}
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
        <Icon name="shield" className="h-3.5 w-3.5 text-success" />
        {t("حساب مالک (ورود با ایمیل اصلی) همیشه مدیر کل است و از این فهرست حذف نمی‌شود.")}
      </p>
    </Container>
  );
}
