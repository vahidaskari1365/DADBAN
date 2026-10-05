"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ALL_PROVINCES, LOCATIONS, faNum } from "@/lib/data";

type ProfileInput = {
  name: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  avatarColor: string;
  createdAt: string | null;
};

const AVATAR_COLORS = ["#15365d", "#7c5cff", "#0e7c66", "#b45309", "#be123c", "#334155"];

/** فرم اطلاعات شخصی موکل — PUT /api/profile */
export function PersonalInfoForm({ initial }: { initial: ProfileInput }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [province, setProvince] = useState(initial.province);
  const [city, setCity] = useState(initial.city);
  const [avatarColor, setAvatarColor] = useState(initial.avatarColor);
  const [saving, setSaving] = useState(false);

  const cities = province ? (LOCATIONS.find((l) => l.province === province)?.cities ?? []) : [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast.error("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), province, city, avatarColor }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success("اطلاعات شخصی ذخیره شد.");
        router.refresh();
      } else {
        toast.error(data.error ?? "ذخیره اطلاعات ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">نام و نام خانوادگی *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">ایمیل (اختیاری)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            dir="ltr"
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">استان</span>
          <select
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setCity("");
            }}
            className={`${inputCls} cursor-pointer appearance-none`}
          >
            <option value="">انتخاب استان…</option>
            {ALL_PROVINCES.map((p) => (
              <option key={p} value={p}>
                استان {p}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-muted">
            استان شما برای پیشنهاد وکیلِ همان استان و شخصی‌سازی دستیار هوشمند استفاده می‌شود.
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">شهر</span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={!province}
            className={`${inputCls} cursor-pointer appearance-none disabled:opacity-50`}
          >
            <option value="">{province ? "انتخاب شهر…" : "ابتدا استان را انتخاب کنید"}</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 block text-xs font-medium text-muted">رنگ آواتار</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAvatarColor(c)}
              aria-label={`انتخاب رنگ ${c}`}
              aria-pressed={avatarColor === c}
              className={`h-9 w-9 rounded-xl border-2 transition-transform hover:scale-110 ${
                avatarColor === c ? "border-foreground" : "border-transparent"
              }`}
              style={{ background: `linear-gradient(135deg, ${c}, color-mix(in oklab, ${c} 55%, #000))` }}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={saving} icon="check">
          {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
        </Button>
        <p className="text-xs text-muted">
          شماره موبایل <span dir="ltr">{faNum(initial.phone)}</span> شناسه ورود شماست و قابل تغییر نیست.
        </p>
      </div>
    </form>
  );
}

/** فرم تغییر رمز عبور — PUT /api/profile/password */
export function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("رمز جدید باید حداقل ۸ نویسه باشد.");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("تکرار رمز جدید مطابقت ندارد.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success("رمز عبور با موفقیت تغییر کرد.");
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        toast.error(data.error ?? "تغییر رمز ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">رمز فعلی *</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">رمز جدید (حداقل ۸ نویسه) *</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">تکرار رمز جدید *</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
      </div>
      <Button type="submit" variant="outline" disabled={saving} icon="lock">
        {saving ? "در حال تغییر…" : "تغییر رمز عبور"}
      </Button>
    </form>
  );
}

/** نشان وضعیت اتصال حساب وکیل به پروفایل عمومی */
export function LawyerLinkBadge({ linked, href }: { linked: boolean; href?: string }) {
  if (!linked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
        <Icon name="alert" className="h-3.5 w-3.5" /> متصل نیست
      </span>
    );
  }
  return (
    <a
      href={href ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success transition-colors hover:bg-success/25"
    >
      <Icon name="check" className="h-3.5 w-3.5" /> مشاهده پروفایل عمومی
      <Icon name="arrow" className="h-3 w-3 rotate-180" />
    </a>
  );
}
