"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { StatusBadge, UrgencyBadge, Timeline, ClassificationBadge } from "@/components/managed";
import { STATUS_LABELS, faNumSafe } from "@/lib/managed-labels";

type Ev = { id: number; type: string; title: string; description: string; createdByName?: string | null; createdAt: string | Date };
type Doc = { id: number; name: string; docType: string; size: number; uploaderRole: string; createdAt: string | Date };
type Quote = { id: number; total: number; currency: string; status: string; createdAt: string | Date };

export default function UserRequestDetail({
  request,
  service,
  events,
  quotes,
  docs,
  canCancel,
}: {
  request: {
    id: number;
    requestNumber: string;
    title: string;
    status: string;
    urgency: string;
    price: number | null;
    paymentStatus: string;
    contractStatus: string;
    finalReport: string | null;
    resultFileLabel: string | null;
    description: string;
  };
  service: { title: string; slug: string; icon: string; requiresLawyer: boolean } | null;
  events: Ev[];
  quotes: Quote[];
  docs: Doc[];
  canCancel: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("سند");
  const [docFile, setDocFile] = useState<File | null>(null);

  const id = request.id;
  const showPay = (request.status === "AWAITING_PAYMENT" || request.status === "QUOTED") && request.price && request.price > 0;

  async function pay() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(`/api/service-requests/${id}/payment`, { method: "POST" });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setErr(d.error || "خطا در ایجاد پرداخت");
        return;
      }
      setMsg(d.message);
      if (d.sandbox) {
        await fetch(`/api/service-requests/${id}/payment/verify`, { method: "POST" });
      }
      router.refresh();
    } catch {
      setErr("خطای شبکه");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm("آیا از لغو این درخواست مطمئن هستید؟")) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/service-requests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setErr(d.error || "لغو نشد");
        return;
      }
      router.refresh();
    } catch {
      setErr("خطای شبکه");
    } finally {
      setBusy(false);
    }
  }

  async function uploadDoc() {
    if (!docName.trim() && !docFile) {
      setErr("نام سند را وارد کنید");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/service-requests/${id}/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: docName.trim() || docFile?.name || "سند",
          docType,
          size: docFile?.size ?? 0,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setErr(d.error || "بارگذاری نشد");
        return;
      }
      setDocName("");
      setDocFile(null);
      router.refresh();
    } catch {
      setErr("خطای شبکه");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card hover={false}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Icon name={(service?.icon as IconKey) ?? "briefcase"} className="h-4 w-4" />
              <span>{service?.title ?? "خدمت"}</span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-foreground">{request.title}</h2>
            <p className="font-mono text-xs text-muted" dir="ltr">{request.requestNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <UrgencyBadge urgency={request.urgency} />
            <StatusBadge status={request.status} />
          </div>
        </div>

        {request.price ? (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm">
            <span className="text-muted">هزینه خدمت</span>
            <span className="font-semibold text-foreground">{faNumSafe(request.price)} تومان</span>
          </div>
        ) : null}

        {showPay && (
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft p-4">
            <p className="text-sm text-foreground-soft">برای شروع انجام خدمت، هزینه آن را پرداخت کنید.</p>
            <Button onClick={pay} disabled={busy} icon="money" className="mt-3">
              {busy ? "در حال انتقال…" : "پرداخت هزینه خدمت"}
            </Button>
            {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
          </div>
        )}

        {canCancel && (
          <Button onClick={cancel} disabled={busy} variant="ghost" size="sm" icon="x" className="mt-4 text-danger">
            لغو درخواست
          </Button>
        )}
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}

        {request.finalReport && (request.status === "COMPLETED" || request.status === "DELIVERED") && (
          <div className="mt-4 rounded-xl border border-success/30 bg-[color-mix(in_oklab,var(--success)_8%,transparent)] p-4">
            <p className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="check" className="h-5 w-5 text-success" /> گزارش نهایی
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground-soft">{request.finalReport}</p>
            {request.resultFileLabel && (
              <p className="mt-2 text-sm text-muted">فایل نتیجه: {request.resultFileLabel}</p>
            )}
          </div>
        )}
      </Card>

      <Card hover={false}>
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="document" className="h-5 w-5 text-primary" /> مدارک
        </h3>
        <div className="mt-3 space-y-2">
          {docs.length ? (
            docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <span className="text-sm text-foreground">{d.name}</span>
                <Badge tone="neutral">{d.docType}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">هنوز سندی بارگذاری نشده است.</p>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            placeholder="نام سند (مثال: کپی شناسنامه)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <Button onClick={uploadDoc} disabled={busy} icon="plus" variant="soft">بارگذاری</Button>
        </div>
        <p className="mt-2 text-xs text-muted">در حال حاضر فراداده سند ضبط می‌شود؛ بارگذاری فایل واقعی پس از اتصال فضای ذخیره‌سازی فعال خواهد شد.</p>
      </Card>

      <Card hover={false}>
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="clock" className="h-5 w-5 text-accent" /> تاریخچه درخواست
        </h3>
        <div className="mt-4">
          <Timeline events={events} />
        </div>
      </Card>
    </div>
  );
}
