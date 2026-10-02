"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icons";

type Doc = { id: number; name: string; type: string; size: number };

export default function DocumentsManager() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState("مدرک");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.ok) setDocs(data.documents);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const add = async () => {
    if (!name.trim()) { setMsg("نام سند را وارد کنید."); return; }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, size: 0 }),
      });
      const data = await res.json();
      if (data.ok) {
        setDocs((d) => [{ ...data.document, size: 0 }, ...d]);
        setName("");
      } else {
        setMsg(data.error ?? "خطا در ثبت سند");
      }
    } catch {
      setMsg("خطا در ارتباط با سرور");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: number) => {
    if (!confirm("حذف این سند؟")) return;
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocs((d) => d.filter((x) => x.id !== id));
  };

  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="نام سند (مثلاً کارت ملی)"
          className="h-10 flex-1 rounded-xl border border-border-strong bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-xl border border-border-strong bg-background px-2 text-sm outline-none">
          {["مدرک", "قرارداد", "سند", "دادخواست", "هویتی"].map((t) => <option key={t}>{t}</option>)}
        </select>
        <button onClick={add} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">
          <Icon name="plus" className="h-3.5 w-3.5" /> {busy ? "در حال ثبت…" : "افزودن سند"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs font-semibold text-danger">{msg}</p>}
      <div className="mt-4 space-y-2">
        {loading && <p className="text-xs text-muted">در حال بارگذاری…</p>}
        {!loading && docs.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">هنوز سندی ثبت نکرده‌اید. نام و نوع سند را وارد و اضافه کنید.</p>
        )}
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-2 text-foreground-soft"><Icon name="file" className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
              <p className="text-xs text-muted">{d.type}</p>
            </div>
            <Icon name="lock" className="h-4 w-4 text-success" />
            <button onClick={() => remove(d.id)} className="rounded-lg bg-danger/10 px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/20">حذف</button>
          </div>
        ))}
      </div>
    </div>
  );
}
