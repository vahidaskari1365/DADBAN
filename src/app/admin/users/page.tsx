import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, lawyers } from "@/db/schema";
import { and, count, desc, eq, gte, ilike, or } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { PageHero } from "@/components/page-hero";
import { Card, Badge, Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { toFa, formatJalali } from "@/lib/money";

export const metadata: Metadata = {
  title: "کاربران و وکلا — پنل مدیریت دادپیو",
  description: "مدیریت کاربران ثبت‌نام‌شده و پروفایل وکلای مارکت‌پلیس دادپیو.",
};
export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "primary" | "danger" }> = {
  client: { label: "موکل", tone: "neutral" },
  lawyer: { label: "وکیل", tone: "accent" },
  admin: { label: "مدیر", tone: "danger" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; tab?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const role = (sp.role ?? "all").trim();
  const tab = sp.tab === "lawyers" ? "lawyers" : "users";

  /* ---------------- داده‌ها ---------------- */
  let userRows: { id: number; name: string; phone: string; role: string; createdAt: Date }[] = [];
  let lawyerRows: {
    id: number;
    name: string;
    city: string;
    rating: number;
    specialties: string[];
    verified: boolean;
    caseCount: number;
  }[] = [];
  let stats = { totalUsers: 0, totalLawyers: 0, verifiedLawyers: 0, newUsersThisWeek: 0 };

  try {
    const userConds = [];
    if (q) userConds.push(or(ilike(users.name, `%${q}%`), ilike(users.phone, `%${q}%`)));
    if (role !== "all") userConds.push(eq(users.role, role));
    const lawyerConds = [];
    if (q) lawyerConds.push(or(ilike(lawyers.name, `%${q}%`), ilike(lawyers.city, `%${q}%`)));
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const [u, l, tu, tl, vl, nu] = await Promise.all([
      db
        .select({ id: users.id, name: users.name, phone: users.phone, role: users.role, createdAt: users.createdAt })
        .from(users)
        .where(userConds.length ? and(...userConds) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(60),
      db
        .select({
          id: lawyers.id,
          name: lawyers.name,
          city: lawyers.city,
          rating: lawyers.rating,
          specialties: lawyers.specialties,
          verified: lawyers.verified,
          caseCount: lawyers.caseCount,
        })
        .from(lawyers)
        .where(lawyerConds.length ? and(...lawyerConds) : undefined)
        .orderBy(desc(lawyers.rating))
        .limit(60),
      db.select({ v: count() }).from(users),
      db.select({ v: count() }).from(lawyers),
      db.select({ v: count() }).from(lawyers).where(eq(lawyers.verified, true)),
      db.select({ v: count() }).from(users).where(gte(users.createdAt, weekAgo)),
    ]);

    userRows = Array.isArray(u) ? u : [];
    lawyerRows = Array.isArray(l) ? l : [];
    stats = {
      totalUsers: Number(tu[0]?.v ?? 0),
      totalLawyers: Number(tl[0]?.v ?? 0),
      verifiedLawyers: Number(vl[0]?.v ?? 0),
      newUsersThisWeek: Number(nu[0]?.v ?? 0),
    };
  } catch {
    /* حالت تنزل‌یافته */
  }

  const searchValue = q;
  const tabHref = (t: "users" | "lawyers") =>
    `/admin/users?tab=${t}${searchValue ? `&q=${encodeURIComponent(searchValue)}` : ""}${role !== "all" ? `&role=${role}` : ""}`;

  return (
    <>
      <PageHero
        badge="Admin · کاربران"
        title="کاربران و وکلا"
        desc="کاربران ثبت‌نام‌شدهٔ پلتفرم، وضعیت تأیید وکلا و آمار رشد جامعهٔ دادپیو"
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "پنل مدیریت", href: "/admin" }, { label: "کاربران و وکلا" }]}
      />
      <Container className="py-10">
        {/* ---------------- آمار ---------------- */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "کاربران ثبت‌نام‌شده", value: toFa(stats.totalUsers), icon: "user" as const, tone: "text-foreground" },
            { label: "وکلای پلتفرم", value: toFa(stats.totalLawyers), icon: "badge" as const, tone: "text-accent" },
            { label: "وکلای تأییدشده", value: toFa(stats.verifiedLawyers), icon: "check" as const, tone: "text-success" },
            { label: "عضو جدید این هفته", value: toFa(stats.newUsersThisWeek), icon: "sparkles" as const, tone: "text-foreground" },
          ].map((s) => (
            <Card key={s.label} hover={false} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name={s.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <strong className={`block text-xl font-black ${s.tone}`}>{s.value}</strong>
                <small className="text-xs text-muted">{s.label}</small>
              </span>
            </Card>
          ))}
        </div>

        {/* ---------------- تب‌ها + جستجو ---------------- */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5 rounded-xl border border-border bg-surface p-1.5">
            <a
              href={tabHref("users")}
              className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                tab === "users" ? "bg-primary-soft text-primary" : "text-foreground-soft hover:bg-surface-2"
              }`}
            >
              کاربران ({toFa(stats.totalUsers)})
            </a>
            <a
              href={tabHref("lawyers")}
              className={`min-h-11 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                tab === "lawyers" ? "bg-primary-soft text-primary" : "text-foreground-soft hover:bg-surface-2"
              }`}
            >
              وکلا ({toFa(stats.totalLawyers)})
            </a>
          </div>

          <form method="get" action="/admin/users" className="flex flex-wrap items-center gap-2">
            {tab === "users" ? <input type="hidden" name="tab" value="users" /> : <input type="hidden" name="tab" value="lawyers" />}
            <input
              type="search"
              name="q"
              defaultValue={searchValue}
              placeholder={tab === "users" ? "جستجوی نام یا موبایل…" : "جستجوی نام یا شهر…"}
              aria-label="جستجو"
              className="h-11 w-52 rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-colors focus:border-accent"
            />
            {tab === "users" && (
              <select
                name="role"
                defaultValue={role}
                aria-label="فیلتر نقش"
                className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground"
              >
                <option value="all">همهٔ نقش‌ها</option>
                <option value="client">موکل</option>
                <option value="lawyer">وکیل</option>
                <option value="admin">مدیر</option>
              </select>
            )}
            <button type="submit" className="btn-gold inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold">
              <Icon name="search" className="h-4 w-4" />
              جستجو
            </button>
          </form>
        </div>

        {/* ---------------- جدول تب فعال ---------------- */}
        {tab === "users" ? (
          <Card hover={false} className="mt-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-right">
                <thead>
                  <tr className="border-b border-border text-xs font-bold text-muted">
                    <th className="p-3">#</th>
                    <th className="p-3">نام</th>
                    <th className="p-3">موبایل</th>
                    <th className="p-3">نقش</th>
                    <th className="p-3">تاریخ عضویت</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-sm text-muted">
                        کاربری مطابق جستجو یافت نشد.
                      </td>
                    </tr>
                  )}
                  {userRows.map((u, i) => {
                    const r = ROLE_LABELS[u.role] ?? { label: u.role, tone: "neutral" as const };
                    return (
                      <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                        <td className="p-3 text-sm text-muted">{toFa(i + 1)}</td>
                        <td className="p-3 text-sm font-bold text-foreground">{u.name}</td>
                        <td className="p-3 text-sm text-muted" dir="ltr">
                          {toFa(u.phone)}
                        </td>
                        <td className="p-3">
                          <Badge tone={r.tone}>{r.label}</Badge>
                        </td>
                        <td className="p-3 text-sm text-muted">{formatJalali(u.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card hover={false} className="mt-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right">
                <thead>
                  <tr className="border-b border-border text-xs font-bold text-muted">
                    <th className="p-3">#</th>
                    <th className="p-3">نام</th>
                    <th className="p-3">شهر</th>
                    <th className="p-3">امتیاز</th>
                    <th className="p-3">تخصص‌ها</th>
                    <th className="p-3">پرونده</th>
                    <th className="p-3">وضعیت تأیید</th>
                  </tr>
                </thead>
                <tbody>
                  {lawyerRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-sm text-muted">
                        وکیلی مطابق جستجو یافت نشد.
                      </td>
                    </tr>
                  )}
                  {lawyerRows.map((l, i) => (
                    <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-surface-2/40">
                      <td className="p-3 text-sm text-muted">{toFa(i + 1)}</td>
                      <td className="p-3 text-sm font-bold text-foreground">{l.name}</td>
                      <td className="p-3 text-sm text-muted">{l.city}</td>
                      <td className="p-3 text-sm font-bold text-accent">{toFa(l.rating.toFixed(1))} ★</td>
                      <td className="max-w-[240px] p-3">
                        <div className="flex flex-wrap gap-1">
                          {l.specialties.slice(0, 3).map((s) => (
                            <Badge key={s} tone="accent">
                              {s}
                            </Badge>
                          ))}
                          {l.specialties.length > 3 && <Badge tone="neutral">+{toFa(l.specialties.length - 3)}</Badge>}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted">{toFa(l.caseCount)}</td>
                      <td className="p-3">
                        {l.verified ? <Badge tone="success">تأییدشده</Badge> : <Badge tone="neutral">در انتظار تأیید</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Container>
    </>
  );
}
