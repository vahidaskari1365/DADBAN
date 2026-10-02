"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { toFa, formatToman } from "@/lib/money";

type SettingsMap = Record<string, string>;

const FIELDS: {
  key: string;
  label: string;
  hint: string;
  type: "number" | "text";
  suffix?: string;
}[] = [
  {
    key: "commission_rate",
    label: "نرخ کمیسیون پلتفرم",
    hint: "درصدی که دادپیو از هر پرداخت موکل به‌عنوان کارمزد برمی‌دارد (۰ تا ۱۰۰).",
    type: "number",
    suffix: "درصد",
  },
  {
    key: "payout_min",
    label: "حداقل مبلغ برداشت وکیل",
    hint: "کمترین مبلغی که وکیل می‌تواند درخواست تسویه ثبت کند (تومان).",
    type: "number",
    suffix: "تومان",
  },
  {
    key: "min_lawyer_score",
    label: "حداقل امتیاز تطبیق وکیل",
    hint: "وکلایی که امتیاز تطبیق آن‌ها کمتر از این عدد باشد به موکل پیشنهاد نمی‌شوند.",
    type: "number",
    suffix: "از ۱۰۰",
  },
  {
    key: "credit_providers",
    label: "تأمین‌کنندگان اعتبار فعال",
    hint: "شناسهٔ تأمین‌کنندگان جدا‌شده با ویرگول: azki ، partner_bank",
    type: "text",
  },
  {
    key: "matching_model",
    label: "مدل موتور تطبیق",
    hint: "شناسهٔ مدل/نسخهٔ موتور تطبیق هوشمند — برای پایش و بازگشت نسخه.",
    type: "text",
  },
];

export default function SettingsClient({ settings }: { settings: SettingsMap }) {
  const router = useRouter();
  const [values, setValues] = useState<SettingsMap>(settings);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  function flash(ok: boolean, text: string) {
    setToast({ ok, text });
    window.setTimeout(() => setToast(null), 4000);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/marketplace/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: FIELDS.map((f) => ({ key: f.key, value: values[f.key] ?? "" })) }),
      });
      if (res.ok) {
        flash(true, "تنظیمات با موفقیت ذخیره شد.");
        router.refresh();
      } else if (res.status === 401) {
        flash(false, "نشست ادمین منقضی شده؛ دوباره وارد شوید.");
      } else if (res.status === 422) {
        flash(false, "مقادیر ارسالی نامعتبر است.");
      } else {
        flash(false, "ذخیرهٔ تنظیمات ناموفق بود؛ دوباره تلاش کنید.");
      }
    } catch {
      flash(false, "خطای شبکه؛ اتصال خود را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-2" aria-label="تنظیمات پلتفرم">
      {FIELDS.map((f) => (
        <Card key={f.key} hover={false}>
          <label htmlFor={`set-${f.key}`} className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Icon name="lock" className="h-4 w-4 text-accent" />
            {f.label}
          </label>
          <p className="mt-1.5 text-xs leading-6 text-muted">{f.hint}</p>
          <div className="mt-3 flex items-center gap-2">
            <input
              id={`set-${f.key}`}
              type={f.type}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              dir={f.type === "number" ? "ltr" : "ltr"}
              className="h-11 w-full max-w-[220px] rounded-xl border border-border bg-background px-3.5 text-sm font-bold text-foreground outline-none transition-colors focus:border-accent"
              min={f.type === "number" ? 0 : undefined}
              required
            />
            {f.suffix && <span className="text-xs font-bold text-muted">{f.suffix}</span>}
          </div>
          {f.key === "payout_min" && Number(values[f.key] || 0) > 0 && (
            <p className="mt-2 text-[11px] text-accent">معادل {formatToman(values[f.key])}</p>
          )}
        </Card>
      ))}

      <div className="lg:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="btn-gold inline-flex min-h-11 items-center gap-2 rounded-xl px-6 text-sm font-bold transition-all disabled:opacity-50"
        >
          <Icon name="check" className="h-4 w-4" />
          {busy ? "در حال ذخیره…" : "ذخیرهٔ تنظیمات"}
        </button>
        <p className="mt-3 text-[11px] leading-6 text-muted">
          نرخ فعلی کمیسیون: {toFa(values.commission_rate || "0")}٪ — تغییرات بلافاصله روی محاسبات کمیسیون پرداخت‌های جدید اعمال می‌شود.
        </p>
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 max-w-xs rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${
            toast.ok ? "bg-success text-white" : "bg-danger text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
    </form>
  );
}
