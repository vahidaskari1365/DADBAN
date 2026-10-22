"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CLASSIFICATION_LABELS, PRICE_TYPE_LABELS, CATEGORY_LABELS } from "@/lib/managed-labels";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";
import { MoneyInput } from "@/components/money-input";

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";
const labelCls = "mb-1 block text-xs font-semibold text-muted";

type Row = Record<string, any>;

const CLASS_KEYS = Object.keys(CLASSIFICATION_LABELS);
const PRICE_KEYS = Object.keys(PRICE_TYPE_LABELS);

export default function ManagedServicesAdmin() {
  const t = useT();
  const tf = templateT(t);
  const [categories, setCategories] = useState<RowSnapshot[]>([]);
  const [services, setServices] = useState<RowSnapshot[]>([]);
  const [tab, setTab] = useState<"services" | "categories">("services");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ kind: "services" | "categories"; row: Row | null } | null>(null);
  const [form, setForm] = useState<Row>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([
        fetch("/api/admin/service-categories").then((r) => r.json()),
        fetch("/api/admin/managed-services").then((r) => r.json()),
      ]);
      if (!c.ok || !s.ok) throw new Error("خطا در بارگذاری");
      setCategories(c.rows ?? []);
      setServices(s.rows ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // بارگذاری اولیه از سرور — همه‌ی setStateها پس از await اجرا می‌شوند (غیرهمزمان).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- false positive روی الگوی fetch-on-mount
    void load();
  }, [load]);

  function openNew(kind: "services" | "categories") {
    setForm(kind === "categories" ? { sortOrder: 0 } : { priceType: "FIXED", requiresLawyer: false, requiresSupervision: false, requiresDocuments: false, requiresCaseInfo: false, active: true, featured: false, sortOrder: 0, category: categories[0]?.slug ?? "" });
    setEditing({ kind, row: null });
  }

  function openEdit(kind: "services" | "categories", row: Row) {
    setForm({ ...row });
    setEditing({ kind, row });
  }

  async function remove(kind: "services" | "categories", id: number) {
    if (!confirm(t("حذف شود؟"))) return;
    const resource = kind === "categories" ? "service-categories" : "managed-services";
    const res = await fetch(`/api/admin/${resource}?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error ?? t("حذف ناموفق"));
      return;
    }
    await load();
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const resource = editing.kind === "categories" ? "service-categories" : "managed-services";
    const fields: Row = { ...form };
    // Normalize numbers / booleans.
    for (const k of ["sortOrder", "basePrice"]) {
      if (fields[k] === "" || fields[k] == null) delete fields[k];
      else fields[k] = Number(fields[k]);
    }
    for (const k of ["requiresLawyer", "requiresSupervision", "requiresDocuments", "requiresCaseInfo", "active", "featured"]) {
      fields[k] = Boolean(fields[k]);
    }
    try {
      let res: Response;
      if (editing.row?.id) {
        res = await fetch(`/api/admin/${resource}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: editing.row.id, changes: fields }),
        });
      } else {
        res = await fetch(`/api/admin/${resource}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fields }),
        });
      }
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "ذخیره ناموفق");
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? t("ذخیره ناموفق"));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant={tab === "services" ? "primary" : "outline"} size="sm" onClick={() => setTab("services")}>
          {tf("خدمات ({n})", { n: faNumSafe(services.length) })}
        </Button>
        <Button variant={tab === "categories" ? "primary" : "outline"} size="sm" onClick={() => setTab("categories")}>
          {tf("دسته‌بندی‌ها ({n})", { n: faNumSafe(categories.length) })}
        </Button>
        <div className="ms-auto">
          <Button size="sm" icon="plus" onClick={() => openNew(tab)}>
            {tf("افزودن {x}", { x: tab === "services" ? t("خدمت") : t("دسته‌بندی") })}
          </Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{t(error)}</div>}
      {loading && <p className="text-sm text-muted">{t("در حال بارگذاری…")}</p>}

      {!loading && tab === "services" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-muted">
                  <th className="p-3">{t("عنوان")}</th>
                  <th className="p-3">{t("دسته")}</th>
                  <th className="p-3">{t("طبقه‌بندی")}</th>
                  <th className="p-3">{t("قیمت‌گذاری")}</th>
                  <th className="p-3">{t("پایه")}</th>
                  <th className="p-3">{t("وضعیت")}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="p-3 font-medium">{s.title}</td>
                    <td className="p-3">{t(CATEGORY_LABELS[s.category] ?? s.category)}</td>
                    <td className="p-3">{t(CLASSIFICATION_LABELS[s.classification] ?? s.classification)}</td>
                    <td className="p-3">{t(PRICE_TYPE_LABELS[s.priceType] ?? s.priceType)}</td>
                    <td className="p-3">{s.basePrice ? tf("{n} تومان", { n: faNumSafe(s.basePrice) }) : "—"}</td>
                    <td className="p-3">
                      {s.active ? <Badge tone="success">{t("فعال")}</Badge> : <Badge tone="neutral">{t("غیرفعال")}</Badge>}
                      {s.featured && <Badge tone="accent">{t("ویژه")}</Badge>}
                    </td>
                    <td className="p-3 text-end">
                      <button className="text-primary hover:underline" onClick={() => openEdit("services", s)}>{t("ویرایش")}</button>
                      <button className="ms-3 text-danger hover:underline" onClick={() => remove("services", s.id)}>{t("حذف")}</button>
                    </td>
                  </tr>
                ))}
                {services.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-muted">{t("خدمتی ثبت نشده است.")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && tab === "categories" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-muted">
                  <th className="p-3">{t("نام")}</th>
                  <th className="p-3">slug</th>
                  <th className="p-3">{t("ترتیب")}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted">{c.slug}</td>
                    <td className="p-3">{faNumSafe(c.sortOrder ?? 0)}</td>
                    <td className="p-3 text-end">
                      <button className="text-primary hover:underline" onClick={() => openEdit("categories", c)}>{t("ویرایش")}</button>
                      <button className="ms-3 text-danger hover:underline" onClick={() => remove("categories", c.id)}>{t("حذف")}</button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted">{t("دسته‌بندی ثبت نشده است.")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10" onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editing.row ? t("ویرایش") : t("افزودن")} {editing.kind === "services" ? t("خدمت") : t("دسته‌بندی")}
              </h3>
              <button onClick={() => setEditing(null)} className="text-muted hover:text-foreground"><Icon name="x" className="h-5 w-5" /></button>
            </div>

            {editing.kind === "categories" ? (
              <div className="grid gap-3">
                <div><label className={labelCls}>{t("نام")}</label><input className={inputCls} value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>slug</label><input className={inputCls} value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} /></div>
                  <div><label className={labelCls}>{t("ترتیب")}</label><input type="number" className={inputCls} value={form.sortOrder ?? 0} onChange={(e) => set("sortOrder", e.target.value)} /></div>
                </div>
                <div><label className={labelCls}>{t("آیکون")}</label><input className={inputCls} value={form.icon ?? ""} onChange={(e) => set("icon", e.target.value)} /></div>
                <div><label className={labelCls}>{t("توضیحات")}</label><textarea className={inputCls} rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>{t("عنوان")}</label><input className={inputCls} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
                  <div><label className={labelCls}>slug</label><input className={inputCls} value={form.slug ?? ""} onChange={(e) => set("slug", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t("دسته‌بندی")}</label>
                    <select className={inputCls} value={form.category ?? ""} onChange={(e) => set("category", e.target.value)}>
                      {categories.map((c) => <option key={c.id} value={c.slug}>{t(c.name)}</option>)}
                    </select>
                  </div>
                  <div><label className={labelCls}>{t("آیکون")}</label><input className={inputCls} value={form.icon ?? ""} onChange={(e) => set("icon", e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t("طبقه‌بندی (نیاز به وکیل/نظارت)")}</label>
                    <select className={inputCls} value={form.classification ?? "LEGAL_INFO"} onChange={(e) => set("classification", e.target.value)}>
                      {CLASS_KEYS.map((k) => <option key={k} value={k}>{t(CLASSIFICATION_LABELS[k])}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t("نوع قیمت‌گذاری")}</label>
                    <select className={inputCls} value={form.priceType ?? "FIXED"} onChange={(e) => set("priceType", e.target.value)}>
                      {PRICE_KEYS.map((k) => <option key={k} value={k}>{t(PRICE_TYPE_LABELS[k])}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelCls}>{t("قیمت پایه (تومان)")}</label><MoneyInput className={inputCls} value={String(form.basePrice ?? "")} onValueChange={(raw) => set("basePrice", raw)} /></div>
                  <div><label className={labelCls}>{t("زمان تقریبی")}</label><input className={inputCls} value={form.estimatedTime ?? ""} onChange={(e) => set("estimatedTime", e.target.value)} /></div>
                </div>
                <div><label className={labelCls}>{t("توضیح کوتاه")}</label><input className={inputCls} value={form.shortDescription ?? ""} onChange={(e) => set("shortDescription", e.target.value)} /></div>
                <div><label className={labelCls}>{t("توضیحات")}</label><textarea className={inputCls} rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
                <div className="flex flex-wrap gap-4 pt-1">
                  {[
                    ["requiresLawyer", "نیاز به وکیل"],
                    ["requiresSupervision", "نیاز به نظارت"],
                    ["requiresDocuments", "نیاز به مدارک"],
                    ["requiresCaseInfo", "نیاز به شماره پرونده"],
                    ["active", "فعال"],
                    ["featured", "ویژه"],
                  ].map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean(form[k])} onChange={(e) => set(k, e.target.checked)} />
                      {t(label as string)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-2 text-sm text-danger">{t(error)}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>{t("انصراف")}</Button>
              <Button onClick={save} disabled={busy}>{busy ? t("در حال ذخیره…") : t("ذخیره")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function faNumSafe(n: any): string {
  const s = String(n ?? "");
  const map: Record<string, string> = { "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴", "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹" };
  return s.replace(/[0-9]/g, (d) => map[d]);
}

type RowSnapshot = Row;
