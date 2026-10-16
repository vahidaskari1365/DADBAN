"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/**
 * دکمهٔ «ویرایش» کاربر سایت در پنل ادمین — ویرایش نام/موبایل/ایمیل/نقش + ریست رمز + حذف.
 * با /api/admin/users سینک می‌شود (دسترسی «users» سمت سرور چک می‌شود).
 */

export interface EditableUser {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: string;
}

const ROLES: { value: string; label: string }[] = [
  { value: "client", label: "موکل" },
  { value: "lawyer", label: "وکیل" },
  { value: "team", label: "عضو تیم وکیل" },
  { value: "staff", label: "کارمند عملیات" },
  { value: "supervisor", label: "سرپرست" },
  { value: "admin", label: "مدیر (کنسول عملیات)" },
];

export default function UserEditButton({ user }: { user: EditableUser }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone,
    email: user.email ?? "",
    role: user.role,
    password: "",
  });

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        id: user.id,
        name: form.name,
        phone: form.phone,
        email: form.email,
        role: form.role,
      };
      if (form.password) payload.password = form.password;
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
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
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(t("این کاربر برای همیشه حذف شود؟ این عمل بازگشت‌پذیر نیست."))) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || t("حذف ناموفق بود"));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("خطا در ارتباط با سرور"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setForm({ name: user.name, phone: user.phone, email: user.email ?? "", role: user.role, password: "" });
          setError("");
          setOpen(true);
        }}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-bold text-foreground transition hover:border-primary hover:text-primary"
        data-testid="user-edit"
      >
        <Icon name="document" className="h-3.5 w-3.5" /> {t("ویرایش")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => !saving && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-black text-foreground">
              <Icon name="user" className="h-5 w-5 text-primary" />
              {t("ویرایش کاربر")} — {user.name}
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground-soft" htmlFor="ue-name">{t("نام")}</label>
                <input id="ue-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground-soft" htmlFor="ue-phone">{t("موبایل")}</label>
                <input id="ue-phone" dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground-soft" htmlFor="ue-email">{t("ایمیل")}</label>
                <input id="ue-email" type="email" dir="ltr" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground-soft" htmlFor="ue-role">{t("نقش")}</label>
                <select id="ue-role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{t(r.label)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-foreground-soft" htmlFor="ue-pass">{t("رمز عبور جدید (خالی = بدون تغییر)")}</label>
                <input id="ue-pass" type="password" dir="ltr" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} autoComplete="new-password" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </div>
            </div>
            {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">{error}</p>}
            <div className="mt-5 flex items-center justify-between gap-2">
              <button onClick={remove} disabled={saving} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-bold text-muted transition hover:border-destructive hover:text-destructive">
                <Icon name="trash" className="h-3.5 w-3.5" /> {t("حذف کاربر")}
              </button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>{t("انصراف")}</Button>
                <Button onClick={save} disabled={saving}>{saving ? t("در حال ذخیره…") : t("ذخیره")}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
