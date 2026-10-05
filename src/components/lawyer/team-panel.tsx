"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";

/**
 * ساخت تیم وکیل — وکیل برای همکارانش یوزر/پسورد می‌سازد و تعیین می‌کند
 * هر عضو به کدام بخش‌ها (پیشنهادها، مشاوره‌ها، یادآورها، خدمات، پرونده‌ها)
 * و به کدام پرونده‌های مشخص دسترسی داشته باشد.
 */

const PERM_LABELS: Record<string, string> = {
  offers: "پیشنهادهای پرونده",
  consultations: "مشاوره‌ها و نوبت‌ها",
  reminders: "یادآورها",
  services: "درخواست‌های خدمات",
  cases: "پرونده‌ها",
};

interface Member {
  id: number;
  name: string;
  username: string;
  permissions: string;
  caseIds: number[];
  cases: { caseId: number; caseNumber: string; subject: string; city: string }[];
  createdAt: string;
}

interface RecentCase {
  id: number;
  caseNumber: string;
  subject: string;
  city: string;
}

export function TeamPanel() {
  const [members, setMembers] = useState<Member[]>([]);
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  /** memberId در حال ویرایش دسترسی‌ها */
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(() => {
    fetch("/api/lawyer/team", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        setMembers(d.members ?? []);
        setRecentCases(d.recentCases ?? []);
        setAllPerms(d.allPermissions ?? Object.keys(PERM_LABELS));
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setError(null);
    setFlash(null);
    setBusy(true);
    try {
      const res = await fetch("/api/lawyer/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setFlash(d.message);
      setName("");
      setUsername("");
      setPassword("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ساخت عضو انجام نشد.");
    } finally {
      setBusy(false);
    }
  };

  const saveMember = async (m: Member, perms: string[], caseIds: number[]) => {
    setError(null);
    setFlash(null);
    try {
      const res = await fetch("/api/lawyer/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: m.id, permissions: perms, caseIds }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setFlash(`دسترسی‌های ${m.name} به‌روزرسانی شد.`);
      setEditId(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "به‌روزرسانی انجام نشد.");
    }
  };

  const remove = async (m: Member) => {
    setError(null);
    setFlash(null);
    try {
      const res = await fetch(`/api/lawyer/team?userId=${m.id}`, { method: "DELETE" });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setFlash(d.message);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حذف انجام نشد.");
    }
  };

  const fieldCls =
    "h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

  return (
    <Card hover={false} id="team" className="scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="user" className="h-5 w-5 text-primary" /> تیم من
        </h2>
        {members.length > 0 && <Badge tone="primary">{faNum(members.length)} عضو</Badge>}
      </div>
      <p className="mt-1 text-xs leading-6 text-muted">
        برای همکاران دفترتان یوزر و پسورد بسازید و تعیین کنید هر عضو به کدام بخش‌ها و کدام پرونده‌ها دسترسی داشته باشد.
      </p>

      {flash && <p className="mt-3 rounded-xl border border-success/30 bg-success/5 px-3 py-2 text-xs font-bold text-success" role="status">{flash}</p>}
      {error && <p className="mt-3 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-xs font-bold text-danger" role="alert">{error}</p>}

      {/* فرم عضو جدید */}
      <div className="mt-3 rounded-xl border border-border bg-surface-2/40 p-3">
        <p className="mb-2 text-xs font-bold text-foreground">ساخت عضو جدید</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام همکار" className={fieldCls} aria-label="نام همکار" />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="نام کاربری (انگلیسی) — مثلا reza.office"
            dir="ltr"
            className={fieldCls + " text-right"}
            aria-label="نام کاربری"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="رمز عبور (حداقل ۸ کاراکتر)"
            dir="ltr"
            className={fieldCls + " text-right"}
            aria-label="رمز عبور"
          />
        </div>
        <Button onClick={create} disabled={busy || !name || !username || password.length < 8} icon="check" className="mt-2 w-full sm:w-auto">
          {busy ? "در حال ساخت…" : "ساخت عضو تیم"}
        </Button>
      </div>

      {/* اعضا */}
      {!loaded ? (
        <p className="mt-4 text-center text-sm text-muted">در حال دریافت…</p>
      ) : members.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          هنوز عضوی نساخته‌اید؛ با ساخت تیم، همکاران شما با یوزر و پسورد خود وارد پنل می‌شوند و فقط بخش‌های تعیین‌شده را می‌بینند.
        </p>
      ) : (
        <ul className="mt-4 space-y-3" data-testid="team-list">
          {members.map((m) => {
            const perms = m.permissions.split(",").map((s) => s.trim()).filter(Boolean);
            const editing = editId === m.id;
            return (
              <li key={m.id} className="rounded-xl border border-border bg-surface-2/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{m.name}</p>
                    <p className="text-[11px] text-muted" dir="ltr">{m.username}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditId(editing ? null : m.id)}>
                      {editing ? "بستن" : "دسترسی‌ها"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(m)} className="text-danger">
                      حذف
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {perms.length === 0 ? (
                    <Badge tone="danger">بدون دسترسی</Badge>
                  ) : (
                    perms.map((p) => <Badge key={p} tone="primary">{PERM_LABELS[p] ?? p}</Badge>)
                  )}
                  {perms.includes("cases") && (
                    <Badge tone="neutral">{m.caseIds.length ? `${faNum(m.caseIds.length)} پروندهٔ مشخص` : "همه پرونده‌ها"}</Badge>
                  )}
                </div>

                {editing && (
                  <PermEditor
                    member={m}
                    allPerms={allPerms}
                    recentCases={recentCases}
                    onSave={saveMember}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function PermEditor({
  member,
  allPerms,
  recentCases,
  onSave,
}: {
  member: Member;
  allPerms: string[];
  recentCases: RecentCase[];
  onSave: (m: Member, perms: string[], caseIds: number[]) => void;
}) {
  const [perms, setPerms] = useState<string[]>(member.permissions.split(",").map((s) => s.trim()).filter(Boolean));
  const [caseIds, setCaseIds] = useState<number[]>(member.caseIds);

  const togglePerm = (p: string) =>
    setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  const toggleCase = (id: number) =>
    setCaseIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div className="mt-3 rounded-xl border border-border bg-surface p-3">
      <p className="text-xs font-bold text-foreground">دسترسی به بخش‌ها</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {allPerms.map((p) => (
          <label
            key={p}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              perms.includes(p) ? "border-primary bg-primary-soft text-primary" : "border-border text-muted"
            }`}
          >
            <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="sr-only" />
            {perms.includes(p) && <Icon name="check" className="h-3 w-3" />}
            {PERM_LABELS[p] ?? p}
          </label>
        ))}
      </div>

      {perms.includes("cases") && (
        <>
          <p className="mt-3 text-xs font-bold text-foreground">
            پرونده‌های سپرده‌شده به این عضو <span className="font-normal text-muted">— اگر هیچی انتخاب نشود، همهٔ پرونده‌ها را می‌بیند</span>
          </p>
          <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pl-1">
            {recentCases.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-surface-2"
              >
                <input type="checkbox" checked={caseIds.includes(c.id)} onChange={() => toggleCase(c.id)} className="accent-[var(--primary)]" />
                <span className="font-mono text-[10px] text-muted" dir="ltr">{c.caseNumber}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{c.subject}</span>
                <span className="text-muted">{c.city}</span>
              </label>
            ))}
          </div>
        </>
      )}

      <Button size="sm" onClick={() => onSave(member, perms, caseIds)} icon="check" className="mt-3">
        ذخیره دسترسی‌ها
      </Button>
    </div>
  );
}
