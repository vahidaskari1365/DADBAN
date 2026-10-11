"use client";
import { useEffect, useState, useCallback } from "react";
import { Button, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { StatusBadge, UrgencyBadge, Timeline } from "@/components/managed";
import { STATUS_LABELS, faNumSafe } from "@/lib/managed-labels";
import { MoneyInput } from "@/components/money-input";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

const GROUPS = [
  { key: "ALL", label: "همه" },
  { key: "OPEN", label: "در انتظار بررسی", statuses: ["SUBMITTED", "REVIEWING", "AWAITING_DOCUMENTS"] },
  { key: "PAY", label: "نیازمند پرداخت", statuses: ["QUOTED", "AWAITING_PAYMENT"] },
  { key: "DOING", label: "در حال انجام", statuses: ["ASSIGNED", "IN_PROGRESS", "WAITING_EXTERNAL"] },
  { key: "DONE", label: "تکمیل‌شده", statuses: ["COMPLETED", "DELIVERED"] },
  { key: "CLOSED", label: "بسته‌شده", statuses: ["CANCELLED", "REJECTED"] },
];

const ALL_STATUSES = ["DRAFT","SUBMITTED","REVIEWING","AWAITING_DOCUMENTS","QUOTED","AWAITING_PAYMENT","ASSIGNED","IN_PROGRESS","WAITING_EXTERNAL","COMPLETED","DELIVERED","CANCELLED","REJECTED"];

type Req = {
  id: number; requestNumber: string; title: string; serviceTitle?: string; status: string;
  urgency: string; price: number | null; paymentStatus: string; createdAt: string;
};

export default function ManagedOperations({ currentRole }: { currentRole: string }) {
  const t = useT();
  const tf = templateT(t);
  const [requests, setRequests] = useState<Req[]>([]);
  const [operatives, setOperatives] = useState<{ staff: any[]; lawyers: any[] }>({ staff: [], lawyers: [] });
  const [group, setGroup] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [tab, setTab] = useState("actions");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [finalReport, setFinalReport] = useState("");
  const [resultLabel, setResultLabel] = useState("");
  const [quoteTotal, setQuoteTotal] = useState("");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("سند");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/service-requests", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) setRequests(d.requests || []);
    } catch { /* ignore */ }
  }, []);

  const loadOps = useCallback(async () => {
    try {
      const r = await fetch("/api/operatives", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) setOperatives({ staff: d.staff || [], lawyers: d.lawyers || [] });
    } catch { /* ignore */ }
  }, []);

  const select = useCallback(async (id: number) => {
    setSelectedId(id);
    setDetail(null);
    setMsg(null);
    setErr(null);
    setTab("actions");
    try {
      const r = await fetch(`/api/service-requests/${id}`, { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        setDetail(d.request);
        setFinalReport(d.request.finalReport || "");
        setResultLabel(d.request.resultFileLabel || "");
        setNote("");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // بارگذاری اولیه از سرور — همه‌ی setStateها پس از await اجرا می‌شوند (غیرهمزمان).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- false positive روی الگوی fetch-on-mount
    void load();
    void loadOps();
  }, [load, loadOps]);

  async function patch(body: any) {
    if (!selectedId) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(`/api/service-requests/${selectedId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) { setErr(d.error || t("عملیات ناموفق")); return; }
      setMsg(t("بروزرسانی شد"));
      await Promise.all([load(), select(selectedId)]);
    } catch { setErr(t("خطای شبکه")); }
    finally { setBusy(false); }
  }

  async function createQuote() {
    if (!selectedId) return;
    const total = Number(quoteTotal);
    if (!total) { setErr(t("مبلغ پیش‌فاکتور را وارد کنید")); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/service-requests/${selectedId}/quote`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ total, subtotal: total, discount: 0 }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) { setErr(d.error || t("خطا در صدور پیش‌فاکتور")); return; }
      setMsg(t("پیش‌فاکتور صادر شد")); setQuoteTotal("");
      await Promise.all([load(), select(selectedId)]);
    } catch { setErr(t("خطای شبکه")); }
    finally { setBusy(false); }
  }

  async function uploadDoc() {
    if (!selectedId || !docName.trim()) { setErr(t("نام سند را وارد کنید")); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/service-requests/${selectedId}/documents`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: docName.trim(), docType }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) { setErr(d.error || t("بارگذاری نشد")); return; }
      setDocName(""); await select(selectedId);
    } catch { setErr(t("خطای شبکه")); }
    finally { setBusy(false); }
  }

  const filtered = requests.filter((r) => {
    const g = GROUPS.find((x) => x.key === group);
    if (g?.statuses && !g.statuses.includes(r.status)) return false;
    if (query.trim()) {
      const q = query.trim();
      if (!(`${r.title} ${r.requestNumber} ${r.serviceTitle ?? ""}`.includes(q))) return false;
    }
    return true;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {/* Queue */}
      <Card hover={false} className="h-fit">
        <div className="flex flex-wrap items-center gap-2">
          {GROUPS.map((g) => (
            <button key={g.key} onClick={() => setGroup(g.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${group === g.key ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted"}`}>
              {t(g.label)}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("جستجوی شماره یا عنوان…")}
          className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <div className="mt-3 space-y-2">
          {filtered.length ? filtered.map((r) => (
            <button key={r.id} onClick={() => select(r.id)}
              className={`block w-full rounded-xl border p-3 text-right transition ${selectedId === r.id ? "border-primary bg-primary-soft/40" : "border-border hover:bg-surface-2/60"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold text-foreground">{r.title}</span>
                <span className="font-mono text-[11px] text-muted" dir="ltr">{r.requestNumber}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={r.status} />
                <UrgencyBadge urgency={r.urgency} />
                {r.price ? <span className="text-xs text-muted">{tf("{n} تومان", { n: faNumSafe(r.price) })}</span> : null}
              </div>
            </button>
          )) : <p className="py-6 text-center text-sm text-muted">{t("موردی یافت نشد.")}</p>}
        </div>
      </Card>

      {/* Detail */}
      {detail ? (
        <Card hover={false}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">{detail.title}</h2>
              <p className="font-mono text-xs text-muted" dir="ltr">{detail.requestNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <UrgencyBadge urgency={detail.urgency} />
              <StatusBadge status={detail.status} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
            {detail.service?.categoryLabel && <Badge tone="neutral">{t(detail.service.categoryLabel)}</Badge>}
            {detail.service?.classificationLabel && <Badge tone="primary">{t(detail.service.classificationLabel)}</Badge>}
            {detail.assignedStaff && <Badge tone="primary">{tf("کارشناس: {n}", { n: detail.assignedStaff.name })}</Badge>}
            {detail.supervisingLawyer && <Badge tone="accent">{tf("ناظر: {n}", { n: detail.supervisingLawyer.name })}</Badge>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-3">
            {["actions","info","timeline","docs","quote"].map((tb) => (
              <button key={tb} onClick={() => setTab(tb)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${tab === tb ? "bg-surface-2 text-foreground" : "text-muted"}`}>
                {tb === "actions" ? t("اقدامات") : tb === "info" ? t("اطلاعات") : tb === "timeline" ? t("تاریخچه") : tb === "docs" ? t("مدارک") : t("پیش‌فاکتور")}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {msg && <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{msg}</p>}
            {err && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}

            {tab === "actions" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">{t("تغییر وضعیت")}</label>
                    <select disabled={busy} onChange={(e) => e.target.value && patch({ status: e.target.value })}
                      value={detail.status}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                      {ALL_STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_LABELS[s] ?? s)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">{t("واگذاری به کارشناس")}</label>
                    <select disabled={busy} onChange={(e) => patch({ assignedStaffId: e.target.value ? Number(e.target.value) : null })}
                      value={detail.assignedStaffId ?? ""}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                      <option value="">— {t("انتخاب")} —</option>
                      {operatives.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">{t("ناظر حقوقی / وکیل")}</label>
                  <select disabled={busy} onChange={(e) => patch({ supervisingLawyerId: e.target.value ? Number(e.target.value) : null })}
                    value={detail.supervisingLawyerId ?? ""}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                    <option value="">— {t("انتخاب")} —</option>
                    {operatives.lawyers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>

                {detail.paymentStatus !== "paid" && detail.price && detail.viewerCanVerifyPayment ? (
                  <div className="rounded-xl border border-accent/30 bg-accent-soft p-3">
                    <p className="text-sm text-foreground-soft">{tf("این درخواست منتظر تأیید پرداخت است (مبلغ {n} تومان).", { n: faNumSafe(detail.price) })}</p>
                    <Button disabled={busy} variant="accent" size="sm" icon="money" className="mt-2"
                      onClick={() => patch({ paymentStatus: "paid" })}>
                      {t("تأیید دریافت پرداخت")}
                    </Button>
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">{t("یادداشت داخلی (عدم نمایش به کاربر)")}</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)}
                    rows={2} placeholder={t("یادداشت داخلی…")}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                  <Button disabled={busy || !note.trim()} size="sm" variant="soft" icon="send" className="mt-2" onClick={() => patch({ note })}>{t("ثبت یادداشت")}</Button>
                </div>

                <div className="rounded-xl border border-border p-3">
                  <label className="mb-1 block text-xs font-medium text-muted">{t("گزارش نهایی و تحویل نتیجه")}</label>
                  <textarea value={finalReport} onChange={(e) => setFinalReport(e.target.value)} rows={3}
                    placeholder={t("توضیح نتیجه انجام کار…")}
                    className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                  <input value={resultLabel} onChange={(e) => setResultLabel(e.target.value)} placeholder={t("برچسب فایل نتیجه (اختیاری)")}
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                  <Button disabled={busy || !finalReport.trim()} size="sm" icon="check" className="mt-2"
                    onClick={() => patch({ finalReport, resultFileLabel: resultLabel, status: "DELIVERED" })}>
                    {t("ثبت گزارش و تحویل")}
                  </Button>
                </div>
              </div>
            )}

            {tab === "info" && (
              <div className="space-y-2 text-sm text-muted">
                <p><span className="text-foreground">{t("توضیحات:")}</span> {detail.description || "—"}</p>
                <p><span className="text-foreground">{t("مبلغ:")}</span> {detail.price ? tf("{n} تومان", { n: faNumSafe(detail.price) }) : t("تعیین نشده")}</p>
                <p><span className="text-foreground">{t("وضعیت پرداخت:")}</span> {detail.paymentStatus}</p>
                <p><span className="text-foreground">{t("وضعیت قرارداد:")}</span> {detail.contractStatus}</p>
                {detail.answers && Object.keys(detail.answers).length > 0 && (
                  <div className="mt-2">
                    <p className="text-foreground">{t("پاسخ‌های فرم:")}</p>
                    <ul className="mt-1 space-y-1">
                      {Object.entries(detail.answers).map(([k, v]) => (
                        <li key={k}><span className="text-foreground">{k}:</span> {String(v)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {tab === "timeline" && <Timeline events={detail.events || []} />}

            {tab === "docs" && (
              <div className="space-y-3">
                {(detail.docs || []).length ? (detail.docs as any[]).map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <span className="text-sm text-foreground">{d.name}</span>
                    <Badge tone="neutral">{d.docType} • {d.uploaderRole}</Badge>
                  </div>
                )) : <p className="text-sm text-muted">{t("مدرکی ثبت نشده است.")}</p>}
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder={t("نام سند")}
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                  <Button disabled={busy} size="sm" variant="soft" icon="plus" onClick={uploadDoc}>{t("افزودن")}</Button>
                </div>
              </div>
            )}

            {tab === "quote" && (
              <div className="space-y-3">
                {(detail.quotes || []).length ? (
                  <div className="space-y-2">
                    {(detail.quotes as any[]).map((q: any) => (
                      <div key={q.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                        <span className="text-sm text-foreground">{tf("پیش‌فاکتور #{id}", { id: String(q.id) })}</span>
                        <Badge tone="accent">{tf("{n} تومان • {s}", { n: faNumSafe(q.total), s: q.status })}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted">{t("پیش‌فاکتوری صادر نشده است.")}</p>}
                <div className="rounded-xl border border-border p-3">
                  <label className="mb-1 block text-xs font-medium text-muted">{t("صدور پیش‌فاکتور جدید (تومان)")}</label>
                  <div className="flex gap-2">
                    <MoneyInput value={quoteTotal} onValueChange={setQuoteTotal} placeholder={t("مبلغ کل — مثلاً 15,000,000")}
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                    <Button disabled={busy} size="sm" icon="send" onClick={createQuote}>{t("صدور")}</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card hover={false} className="flex h-full min-h-[300px] items-center justify-center text-center text-muted">
          <div>
            <Icon name="folder" className="mx-auto h-10 w-10" />
            <p className="mt-3 text-sm">{t("یک درخواست را از سمت راست انتخاب کنید.")}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
