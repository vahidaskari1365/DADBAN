"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";

/** فرم پروفایل حرفه‌ای — PUT /api/portal/lawyer/profile */
export function ProfileForm({
  initial,
  canWrite,
}: {
  initial: { name: string; bio: string; about: string; specialties: string[] };
  canWrite: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [specialties, setSpecialties] = useState(initial.specialties.join("، "));
  const [bio, setBio] = useState(initial.bio);
  const [about, setAbout] = useState(initial.about);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (name.trim().length < 3) {
      toast.error("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/lawyer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          about: about.trim(),
          specialties: specialties.trim(),
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success("پروفایل حرفه‌ای ذخیره شد.");
        router.refresh();
      } else {
        toast.error(data.error ?? "ذخیره پروفایل ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = !canWrite;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <b className="text-sm text-foreground">اطلاعات حرفه‌ای</b>
        <Button variant="accent" size="md" onClick={() => void save()} disabled={disabled || saving}>
          <Icon name="check" className="h-4 w-4" />
          {saving ? "در حال ذخیره..." : "ذخیره"}
        </Button>
      </div>
      {disabled && (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-xs text-muted">
          در حالت نمایش، ذخیره تغییرات فعال نیست؛ با حساب وکیل وارد شوید.
        </p>
      )}
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">نام و نام خانوادگی</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40 disabled:opacity-60"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">تخصص‌ها (با «،» جدا کنید)</span>
        <input
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
          disabled={disabled}
          placeholder="دعاوی کیفری، ملکی، قراردادها"
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40 disabled:opacity-60"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">معرفی کوتاه (نمایش در کارت وکیل)</span>
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={disabled}
          placeholder="وکیل پایه یک دادگستری با تمرکز بر پرونده‌های تخصصی."
          className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40 disabled:opacity-60"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted">معرفی حرفه‌ای کامل</span>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          disabled={disabled}
          rows={6}
          placeholder="سابقه، تحصیلات، رویکرد حرفه‌ای و حوزه‌های تخصصی خود را توضیح دهید..."
          className="min-h-28 w-full resize-y rounded-xl border border-border bg-surface p-3 text-sm leading-7 outline-none focus:border-primary/40 disabled:opacity-60"
        />
      </label>
    </div>
  );
}
