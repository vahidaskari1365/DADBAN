"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { URGENCY_LABELS, PRICE_TYPE_LABELS, faNumSafe, STATUS_LABELS } from "@/lib/managed-labels";

type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "tel" | "number" | "date" | "toggle";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
};

const URGENCY_FACTOR: Record<string, number> = { LOW: 0.9, NORMAL: 1, HIGH: 1.2, URGENT: 1.5 };

export default function RequestForm({
  service,
}: {
  service: {
    id: number;
    title: string;
    slug: string;
    description: string;
    icon: string;
    priceType: string;
    basePrice: number;
    requiresLawyer: boolean;
    requiresSupervision: boolean;
    requiresDocuments: boolean;
    estimatedTime: string;
    formFields: Field[];
  };
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [urgency, setUrgency] = useState("NORMAL");
  const [extra, setExtra] = useState({ city: "", organization: "", referenceNumber: "", caseNumber: "", requestedDeadline: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ requestNumber: string; status: string; price: number | null; id: number } | null>(null);

  function setField(name: string, value: string) {
    setAnswers((a) => ({ ...a, [name]: value }));
  }

  function previewPrice(): string {
    if (service.priceType === "FIXED") return `${faNumSafe(service.basePrice)} تومان`;
    if (service.priceType === "FROM") {
      const p = Math.round(service.basePrice * (URGENCY_FACTOR[urgency] ?? 1));
      return `از ${faNumSafe(Math.max(p, service.basePrice))} تومان`;
    }
    return "پس از بررسی اعلام می‌شود";
  }

  function validate(): string | null {
    for (const f of service.formFields) {
      if (f.required && !(answers[f.name] ?? "").trim()) return `فیلد «${f.label}» الزامی است`;
    }
    return null;
  }

  async function submit() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serviceSlug: service.slug, answers, urgency, ...extra }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (res.status === 401) {
          router.push(`/login?redirect=/services/${service.slug}`);
          return;
        }
        setError(data.error || "خطا در ثبت درخواست");
        return;
      }
      setResult({ requestNumber: data.requestNumber, status: data.status, price: data.price, id: data.requestId });
    } catch {
      setError("خطای شبکه؛ دوباره تلاش کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card className="border-success/30 bg-[color-mix(in_oklab,var(--success)_8%,transparent)]">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-success text-white">
            <Icon name="check" className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-foreground">درخواست ثبت شد</h3>
            <p className="text-sm text-muted">شماره پیگیری: {result.requestNumber}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          وضعیت فعلی: {STATUS_LABELS[result.status] ?? result.status}
          {result.price ? ` • هزینه تخمینی: ${faNumSafe(result.price)} تومان` : ""}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button href={`/dashboard/services/${result.id}`} icon="arrow">
            مشاهده و پیگیری درخواست
          </Button>
          <Button href="/dashboard/services" variant="outline" icon="folder">
            خدمات من
          </Button>
        </div>
      </Card>
    );
    }

  return (
    <Card>
      <h2 className="text-lg font-bold text-foreground">فرم درخواست — {service.title}</h2>
      {service.requiresLawyer && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft p-3 text-sm text-foreground-soft">
          <Icon name="scale" className="inline h-4 w-4 text-accent" /> این خدمت پس از بررسی به وکیل واجد صلاحیت یا مجموعه حقوقی ارجاع می‌شود و با نظارت حرفه‌ای انجام می‌گیرد. دادبان خود را جایگزین وکیل شما معرفی نمی‌کند.
        </div>
      )}

      <div className="mt-5 space-y-4">
        {service.formFields.map((f) => (
          <div key={f.name}>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {f.label} {f.required && <span className="text-danger">*</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                rows={4}
                placeholder={f.placeholder}
                value={answers[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
              />
            ) : f.type === "select" ? (
              <select
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                value={answers[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
              >
                <option value="">انتخاب کنید…</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "toggle" ? (
              <select
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                value={answers[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
              >
                <option value="">انتخاب کنید…</option>
                <option value="بله">بله</option>
                <option value="خیر">خیر</option>
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "tel" ? "tel" : "text"}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                placeholder={f.placeholder}
                value={answers[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
              />
            )}
            {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
          </div>
        ))}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">شهر</label>
            <input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" value={extra.city} onChange={(e) => setExtra({ ...extra, city: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">سازمان / مرجع (در صورت وجود)</label>
            <input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" value={extra.organization} onChange={(e) => setExtra({ ...extra, organization: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">شماره پیگیری / ثبت (در صورت وجود)</label>
            <input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" value={extra.referenceNumber} onChange={(e) => setExtra({ ...extra, referenceNumber: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">مهلت موردنظر</label>
            <input className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary" value={extra.requestedDeadline} onChange={(e) => setExtra({ ...extra, requestedDeadline: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">فوریت</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(URGENCY_LABELS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setUrgency(k)}
                className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${urgency === k ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-foreground-soft"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 p-4">
        <div className="text-sm text-muted">
          برآورد هزینه: <span className="font-semibold text-foreground">{previewPrice()}</span>
        </div>
        <Button onClick={submit} disabled={submitting} icon="send" size="lg">
          {submitting ? "در حال ثبت…" : "ثبت درخواست"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </Card>
  );
}
