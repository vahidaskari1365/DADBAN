"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Row = Record<string, unknown> & { id: number };

const CONFIGS: Record<string, { title: string; cols: { key: string; label: string }[]; statusField?: string; statusOptions?: string[] }> = {
  lawyers: {
    title: "مدیریت وکلا",
    cols: [
      { key: "name", label: "نام" },
      { key: "city", label: "شهر" },
      { key: "title", label: "عنوان" },
      { key: "rating", label: "امتیاز" },
      { key: "caseCount", label: "پرونده" },
      { key: "priceChat", label: "قیمت چت" },
    ],
    statusField: "verified",
  },
  contracts: {
    title: "مدیریت قراردادها",
    cols: [
      { key: "title", label: "عنوان" },
      { key: "category", label: "دسته" },
      { key: "samplePrice", label: "قیمت نمونه" },
      { key: "customPrice", label: "قیمت سفارشی" },
    ],
    statusField: "popular",
  },
  qa: {
    title: "مدیریت پرسش و پاسخ",
    cols: [
      { key: "question", label: "سؤال" },
      { key: "category", label: "دسته" },
      { key: "lawyerName", label: "وکیل" },
      { key: "helpful", label: "مفید" },
    ],
    statusField: "verified",
  },
  cases: {
    title: "مدیریت پرونده‌ها",
    cols: [
      { key: "caseNumber", label: "شماره" },
      { key: "subject", label: "موضوع" },
      { key: "city", label: "شهر" },
      { key: "contactName", label: "نام موکل" },
      { key: "contactPhone", label: "تلفن" },
    ],
    statusField: "status",
    statusOptions: ["new", "reviewing", "matched", "active", "closed"],
  },
  consultations: {
    title: "مدیریت مشاوره‌ها",
    cols: [
      { key: "clientName", label: "نام" },
      { key: "clientPhone", label: "تلفن" },
      { key: "subject", label: "موضوع" },
      { key: "type", label: "نوع" },
      { key: "price", label: "قیمت" },
    ],
    statusField: "status",
    statusOptions: ["pending", "confirmed", "completed", "cancelled"],
  },
  tickets: {
    title: "مدیریت تیکت‌های پشتیبانی",
    cols: [
      { key: "ticketNumber", label: "شماره" },
      { key: "name", label: "نام" },
      { key: "phone", label: "تلفن" },
      { key: "category", label: "دسته" },
      { key: "message", label: "متن" },
    ],
    statusField: "status",
    statusOptions: ["open", "answered", "closed"],
  },
};

const FA: Record<string, string> = { new: "جدید", reviewing: "در حال بررسی", matched: "تطبیق شده", active: "فعال", closed: "بسته", pending: "در انتظار", confirmed: "تأیید شده", completed: "انجام شده", cancelled: "لغو شده", open: "باز", answered: "پاسخ داده شده" };

export default function AdminManager({ resource }: { resource: string }) {
  const router = useRouter();
  const cfg = CONFIGS[resource];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${resource}`);
      const data = await res.json();
      if (!data.ok) { setError("خطا در دریافت داده‌ها"); return; }
      setError("");
      setRows(data.rows);
    } catch {
      setError("خطا در ارتباط");
    } finally {
      setLoading(false);
    }
  }, [resource]);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const changeStatus = async (row: Row, value: string) => {
    setSaving(row.id);
    const field = cfg.statusField!;
    const changes = cfg.statusOptions ? { [field]: value } : { [field]: value === "1" };
    await fetch(`/api/admin/${resource}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, changes }),
    });
    setSaving(null);
    void load();
  };
  const remove = async (row: Row) => {
    if (!confirm(`حذف این ردیف؟ (${String(row.id)})`)) return;
    await fetch(`/api/admin/${resource}?id=${row.id}`, { method: "DELETE" });
    void load();
  };

  if (loading) return <p className="p-6 text-sm text-muted">در حال بارگذاری…</p>;
  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{cfg.title}</h2>
        <button onClick={() => router.push("/admin")} className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground-soft hover:bg-border">← بازگشت به داشبورد</button>
      </div>
      {error && <p className="mb-3 text-sm font-semibold text-danger">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="p-3">#</th>
              {cfg.cols.map((c) => <th key={c.key} className="p-3">{c.label}</th>)}
              {cfg.statusField && <th className="p-3">وضعیت</th>}
              <th className="p-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={cfg.cols.length + 3} className="p-6 text-center text-muted">داده‌ای ثبت نشده است.</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                <td className="p-3 text-muted">{i + 1}</td>
                {cfg.cols.map((c) => (
                  <td key={c.key} className="max-w-[220px] truncate p-3">
                    {c.key === "priceChat" || c.key === "samplePrice" || c.key === "customPrice"
                      ? Number(r[c.key] ?? 0).toLocaleString("fa-IR") + " ت"
                      : String(r[c.key] ?? "—")}
                  </td>
                ))}
                {cfg.statusField ? (
                  <StatusCell field={cfg.statusField} options={cfg.statusOptions} row={r} saving={saving} onChange={(id, v) => changeStatus(id, v)} />
                ) : null}
                <td className="p-3">
                  <button onClick={() => remove(r)} className="rounded-lg bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/20">حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusCell({ field, options, row, saving, onChange }: {
  field: string;
  options?: string[];
  row: Row;
  saving: number | null;
  onChange: (row: Row, value: string) => void;
}) {
  const current = String(row[field]);
  if (options) {
    return (
      <td className="p-3">
        <select
          value={current}
          disabled={saving === row.id}
          onChange={(e) => onChange(row, e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
        >
          {options.map((o) => <option key={o} value={o}>{FA[o] ?? o}</option>)}
        </select>
      </td>
    );
  }
  const active = current === "true";
  return (
    <td className="p-3">
      <button
        onClick={() => onChange(row, active ? "false" : "true")}
        disabled={saving === row.id}
        className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-success/15 text-success" : "bg-surface-2 text-muted"}`}
      >
        {active ? "فعال" : "غیرفعال"}
      </button>
    </td>
  );
}
