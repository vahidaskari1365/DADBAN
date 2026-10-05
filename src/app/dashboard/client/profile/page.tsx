import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { cases, consultations, documents, favoriteLawyers, payments } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, Avatar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { PersonalInfoForm, PasswordForm } from "@/components/profile/profile-forms";
import { FavoritesPanel } from "@/components/profile/favorites-panel";
import { formatJalaliLong as faDate } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "پروفایل من — پنل موکل",
  description: "مشخصات حساب، استان و شهر، رمز عبور و وکلای نشان‌شده شما در دادبان.",
};
export const dynamic = "force-dynamic";

export default async function ClientProfilePage() {
  await ensureProfileSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // شمارنده‌های واقعی برای خلاصه حساب (هیچ عدد جعلی نمایش داده نمی‌شود)
  let casesCount = 0;
  let consultsCount = 0;
  let docsCount = 0;
  let paidTotal = 0;
  let favoritesCount = 0;
  try {
    const [caseRows, consultRows, docRows, payRows, favRows] = await Promise.all([
      db.select({ id: cases.id }).from(cases).where(eq(cases.contactPhone, user.phone)),
      db.select({ id: consultations.id }).from(consultations).where(eq(consultations.clientPhone, user.phone)),
      db.select({ id: documents.id }).from(documents).where(eq(documents.userPhone, user.phone)),
      db
        .select({ amount: payments.amount })
        .from(payments)
        .where(inArray(payments.status, ["verified", "paid"]))
        .limit(500),
      db.select({ id: favoriteLawyers.id }).from(favoriteLawyers).where(eq(favoriteLawyers.userId, user.id)),
    ]);
    casesCount = caseRows.length;
    consultsCount = consultRows.length;
    docsCount = docRows.length;
    paidTotal = payRows.reduce((s, p) => s + p.amount, 0);
    favoritesCount = favRows.length;
  } catch {
    /* degraded mode */
  }

  const stats = [
    { label: "پرونده ثبت‌شده", value: faNum(casesCount), icon: "folder" as const },
    { label: "مشاوره رزروشده", value: faNum(consultsCount), icon: "calendar" as const },
    { label: "سند بارگذاری‌شده", value: faNum(docsCount), icon: "document" as const },
    { label: "وکلای نشان‌شده", value: faNum(favoritesCount), icon: "star" as const },
  ];

  return (
    <DashboardShell
      role="موکل"
      title="پروفایل من"
      name={user.name}
      back={{ fallback: "/dashboard/client", label: "بازگشت به داشبورد" }}
      nav={[
        { label: "نمای کلی", icon: "home", href: "/dashboard/client" },
        { label: "پرونده‌های من", icon: "folder", href: "/dashboard/cases" },
        { label: "رزرو مشاوره", icon: "calendar", href: "/consultation" },
        { label: "پیگیری پرونده", icon: "search", href: "/track-case" },
        { label: "پروفایل من", icon: "user", active: true, href: "/dashboard/client/profile" },
        { label: "خروج", icon: "x", href: "/api/auth/logout" },
      ]}
    >
      {/* هدر پروفایل */}
      <Card hover={false} className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} color={user.avatarColor || "#15365d"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-foreground">{user.name}</h2>
            <Badge tone="primary">{user.role === "lawyer" ? "وکیل" : "موکل"}</Badge>
            {user.province && <Badge tone="neutral" icon="location">استان {user.province}</Badge>}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            <span dir="ltr">{faNum(user.phone)}</span>
            {user.email ? ` • ${user.email}` : ""}
            {` • عضو از ${faDate(user.createdAt)}`}
          </p>
        </div>
        <div className="text-left">
          <p className="text-xs text-muted">مجموع پرداخت‌های تأییدشده</p>
          <p className="text-xl font-extrabold text-foreground">{faPrice(paidTotal)}</p>
        </div>
      </Card>

      {/* خلاصه فعالیت */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} hover={false} className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xl font-extrabold text-foreground">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* اطلاعات شخصی */}
      <Card hover={false}>
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="user" className="h-5 w-5 text-primary" /> اطلاعات شخصی
        </h2>
        <p className="mb-4 mt-1 text-xs text-muted">
          استان و شهر شما مستقیماً در پیشنهاد وکلای هم‌استان و شخصی‌سازی دستیار حقوقی هوشمند استفاده می‌شود.
        </p>
        <PersonalInfoForm
          initial={{
            name: user.name,
            email: user.email ?? "",
            phone: user.phone,
            province: user.province ?? "",
            city: user.city ?? "",
            avatarColor: user.avatarColor || "#15365d",
            createdAt: user.createdAt?.toISOString() ?? null,
          }}
        />
      </Card>

      {/* امنیت */}
      <Card hover={false}>
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="lock" className="h-5 w-5 text-success" /> امنیت حساب
        </h2>
        <p className="mb-4 mt-1 text-xs text-muted">برای تغییر رمز، رمز فعلی را تأیید کنید.</p>
        <PasswordForm />
      </Card>

      {/* وکلای نشان‌شده */}
      <Card hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="star" className="h-5 w-5 text-accent-text" /> وکلای نشان‌شده من
          </h2>
          <Button href="/lawyers" variant="ghost" size="sm" icon="plus">
            افزودن از دایرکتوری
          </Button>
        </div>
        <p className="mb-4 mt-1 text-xs text-muted">
          وکلایی که در پروفایل‌شان نشان کرده‌اید، برای رزرو سریع مشاوره اینجا جمع شده‌اند.
        </p>
        <FavoritesPanel />
      </Card>
    </DashboardShell>
  );
}
