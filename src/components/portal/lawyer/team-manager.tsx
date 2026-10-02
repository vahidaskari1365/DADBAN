"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/dashboard-shell";

export type TeamMemberView = {
  id: number;
  name: string;
  email: string;
  role: string;
  scope: string;
  status: string;
};

const STATUS_FA: Record<string, { label: string; tone: "green" | "gold" | "gray" | "red" | "cyan" }> = {
  active: { label: "فعال", tone: "green" },
  invited: { label: "دعوت‌شده", tone: "gold" },
  disabled: { label: "غیرفعال", tone: "gray" },
};

/** مدیریت تیم و کارآموزان — GET/POST/PATCH /api/portal/lawyer/team */
export function TeamManager({ initialMembers, canWrite }: { initialMembers: TeamMemberView[]; canWrite: boolean }) {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMemberView[]>(initialMembers);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("trainee");
  const [scope, setScope] = useState("پرونده‌های ارجاعی");
  const [saving, setSaving] = useState(false);

  async function invite() {
    if (name.trim().length < 3) {
      toast.error("نام عضو را وارد کنید.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("ایمیل معتبر نیست.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/lawyer/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role, scope: scope.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; members?: TeamMemberView[]; error?: string };
      if (data.ok && data.members) {
        setMembers(data.members);
        toast.success("دعوت‌نامه ارسال شد و عضو با وضعیت «دعوت‌شده» به تیم اضافه شد.");
        setName("");
        setEmail("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(data.error ?? "ثبت دعوت ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: number, status: string) {
    try {
      const res = await fetch("/api/portal/lawyer/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = (await res.json()) as { ok: boolean; members?: TeamMemberView[]; error?: string };
      if (data.ok && data.members) {
        setMembers(data.members);
        toast.success("وضعیت عضو به‌روزرسانی شد.");
      } else {
        toast.error(data.error ?? "به‌روزرسانی ناموفق بود.");
      }
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">کارآموزان و همکاران با دسترسی محدود به بخش‌های تعیین‌شده می‌توانند در پرونده‌ها فعالیت کنند.</p>
        {canWrite && !open && (
          <Button variant="primary" size="md" onClick={() => setOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            دعوت عضو
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface-2/40 p-4">
          <div className="flex items-center justify-between">
            <b className="text-sm text-foreground">دعوت عضو جدید</b>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="بستن فرم دعوت"
              className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-foreground-soft hover:bg-surface-3"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">نام و نام خانوادگی</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً علی رضایی"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">ایمیل</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                placeholder="name@example.ir"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-left text-sm outline-none focus:border-primary/40"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">نقش</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              >
                <option value="trainee">کارآموز</option>
                <option value="associate">همکار</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">دامنه دسترسی</span>
              <input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="مثلاً مدارک و پیش‌نویس‌ها"
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus:border-primary/40"
              />
            </label>
          </div>
          <Button variant="primary" size="md" onClick={() => void invite()} disabled={saving}>
            <Icon name="send" className="h-4 w-4" />
            {saving ? "در حال ارسال..." : "ارسال دعوت‌نامه"}
          </Button>
        </div>
      )}

      <div className="mt-4 max-h-96 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[560px] border-collapse text-right">
          <thead>
            <tr className="text-xs text-muted">
              <th className="border-b border-border px-3 py-2.5 font-medium">نام</th>
              <th className="border-b border-border px-3 py-2.5 font-medium">نقش</th>
              <th className="border-b border-border px-3 py-2.5 font-medium">دسترسی</th>
              <th className="border-b border-border px-3 py-2.5 font-medium">وضعیت</th>
              <th className="border-b border-border px-3 py-2.5 font-medium">مدیریت</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted">
                  عضوی در تیم ثبت نشده است.
                </td>
              </tr>
            )}
            {members.map((m) => {
              const s = STATUS_FA[m.status] ?? { label: m.status, tone: "gray" as const };
              return (
                <tr key={m.id} className="text-[13px] text-foreground">
                  <td className="border-b border-border px-3 py-3">
                    <b>{m.name}</b>
                    {m.email && <small className="mt-0.5 block text-[11px] text-muted" dir="ltr">{m.email}</small>}
                  </td>
                  <td className="border-b border-border px-3 py-3">{m.role === "trainee" ? "کارآموز" : "همکار"}</td>
                  <td className="border-b border-border px-3 py-3 text-muted">{m.scope}</td>
                  <td className="border-b border-border px-3 py-3">
                    <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                  </td>
                  <td className="border-b border-border px-3 py-3">
                    {canWrite && (
                      <select
                        value={m.status}
                        onChange={(e) => void changeStatus(m.id, e.target.value)}
                        aria-label={`تغییر وضعیت ${m.name}`}
                        className="h-10 rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:border-primary/40"
                      >
                        <option value="active">فعال</option>
                        <option value="invited">دعوت‌شده</option>
                        <option value="disabled">غیرفعال</option>
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
