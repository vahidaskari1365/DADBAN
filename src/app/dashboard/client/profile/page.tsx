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
import { isLawyerSideRole } from "@/lib/roles";
import { ensureProfileSchema, ensureExtendedSchema } from "@/lib/auto-seed";
import { PersonalInfoForm, PasswordForm, PhoneVerificationRow } from "@/components/profile/profile-forms";
import { FavoritesPanel } from "@/components/profile/favorites-panel";
import { formatJalaliLong as faDate } from "@/lib/jalali";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("پروفایل من — پنل موکل"),
    description: t("مشخصات حساب، استان و شهر، رمز عبور و وکلای نشان‌شده شما در دادبان."),
  };
}
export const dynamic = "force-dynamic";

export default async function ClientProfilePage() {
  const t = await getT();
  const tf = templateT(t);
  await ensureProfileSchema();
  // ستون phone_verified + جدول otp_codes — پیش‌نیاز نشان «وضعیت شماره موبایل»
  try {
    await ensureExtendedSchema();
  } catch {
    /* migration best-effort — در نبود ستون، getCurrentUser به claims برمی‌گردد */
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isLawyerSideRole(user.role)) redirect("/dashboard/lawyer");

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
    { label: t("پرونده ثبت‌شده"), value: faNum(casesCount), icon: "folder" as const },
    { label: t("مشاوره رزروشده"), value: faNum(consultsCount), icon: "calendar" as const },
    { label: t("سند بارگذاری‌شده"), value: faNum(docsCount), icon: "document" as const },
    { label: t("وکلای نشان‌شده"), value: faNum(favoritesCount), icon: "star" as const },
  ];

  return (
    <DashboardShell
      role="موکل"
      title={t("پروفایل من")}
      name={user.name}
      back={{ fallback: "/dashboard/client", label: t("بازگشت به داشبورد") }}
      nav={[
        { label: t("نمای کلی"), icon: "home", href: "/dashboard/client" },
        { label: t("پرونده‌های من"), icon: "folder", href: "/dashboard/cases" },
        { label: t("رزرو مشاوره"), icon: "calendar", href: "/consultation" },
        { label: t("پیگیری پرونده"), icon: "search", href: "/track-case" },
        { label: t("پروفایل من"), icon: "user", active: true, href: "/dashboard/client/profile" },
        // توجه: لینک خروج در nav نباید باشد — next/link آن را prefetch می‌کند و
        // GET /api/auth/logout کوکی سشن را پاک می‌کرد (باگ «لاگ‌اوت ناگهانی»).
        // دکمهٔ خروج (plain <a> بدون prefetch) در هدر DashboardShell هست.
      ]}
    >
      {/* هدر پروفایل */}
      <Card hover={false} className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} color={user.avatarColor || "#15365d"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-foreground">{user.name}</h2>
            <Badge tone="primary">{user.role === "lawyer" ? t("وکیل") : t("موکل")}</Badge>
            {user.province && <Badge tone="neutral" icon="location">{tf("استان {p}", { p: user.province })}</Badge>}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            <span dir="ltr">{faNum(user.phone)}</span>
            {user.email ? ` • ${user.email}` : ""}
            {` • ${tf("عضو از {d}", { d: faDate(user.createdAt) })}`}
          </p>
        </div>
        <div className="text-left">
          <p className="text-xs text-muted">{t("مجموع پرداخت‌های تأییدشده")}</p>
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

      {/* وضعیت شماره موبایل — تأیید پیامکی */}
      <Card hover={false}>
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="phone" className="h-5 w-5 text-primary" /> {t("وضعیت شماره موبایل")}
        </h2>
        <p className="mb-4 mt-1 text-xs text-muted">
          {t("با تأیید شماره، ورود با کد پیامکی برایتان فعال می‌شود و حساب شما مطمئن‌تر می‌شود.")}
        </p>
        <PhoneVerificationRow phone={user.phone} verified={user.phoneVerified === true} />
      </Card>

      {/* اطلاعات شخصی */}
      <Card hover={false}>
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="user" className="h-5 w-5 text-primary" /> {t("اطلاعات شخصی")}
        </h2>
        <p className="mb-4 mt-1 text-xs text-muted">
          {t("استان و شهر شما مستقیماً در پیشنهاد وکلای هم‌استان و شخصی‌سازی دستیار حقوقی هوشمند استفاده می‌شود.")}
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
          <Icon name="lock" className="h-5 w-5 text-success" /> {t("امنیت حساب")}
        </h2>
        <p className="mb-4 mt-1 text-xs text-muted">{t("برای تغییر رمز، رمز فعلی را تأیید کنید.")}</p>
        <PasswordForm />
      </Card>

      {/* وکلای نشان‌شده */}
      <Card hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-bold text-foreground">
            <Icon name="star" className="h-5 w-5 text-accent-text" /> {t("وکلای نشان‌شده من")}
          </h2>
          <Button href="/lawyers" variant="ghost" size="sm" icon="plus">
            {t("افزودن از دایرکتوری")}
          </Button>
        </div>
        <p className="mb-4 mt-1 text-xs text-muted">
          {t("وکلایی که در پروفایل‌شان نشان کرده‌اید، برای رزرو سریع مشاوره اینجا جمع شده‌اند.")}
        </p>
        <FavoritesPanel />
      </Card>
    </DashboardShell>
  );
}
