import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell, StatCard, StatusBadge, Progress } from "@/components/dashboard-shell";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { toFa } from "@/lib/money";
import { resolveLawyerContext } from "@/components/portal/lawyer/portal-server";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { ProfileForm } from "@/components/portal/lawyer/profile-form";
import { DpToaster } from "@/components/portal/lawyer/toaster";

export const metadata: Metadata = {
  title: "پنل وکیل — پروفایل حرفه‌ای",
  description: "ویرایش پروفایل حرفه‌ای و شاخص‌های اعتماد در دادپیو.",
};
export const dynamic = "force-dynamic";

export default async function LawyerProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ctx = await resolveLawyerContext(user);
  const l = ctx.lawyer;

  /* محاسبهٔ صادقانهٔ درصد تکمیل پروفایل بر اساس فیلدهای واقعی */
  const fields = [
    !!l?.name,
    (l?.specialties?.length ?? 0) > 0,
    !!l?.bio,
    !!l?.about,
    !!l?.city,
    Number(l?.experienceYears ?? 0) > 0,
  ];
  const completion = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  return (
    <DashboardShell
      role="وکیل"
      title="پروفایل حرفه‌ای"
      subtitle="معرفی حرفه‌ای شما برای موکلان در دادپیو"
      userName={l?.name ?? user.name}
      userRole={ctx.demo ? "وکیل · حالت نمایش" : ctx.lawyerTitle}
      nav={lawyerNav("profile")}
    >
      <DpToaster />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card hover={false}>
          <ProfileForm
            initial={{
              name: l?.name ?? user.name,
              bio: l?.bio ?? "",
              about: l?.about ?? "",
              specialties: l?.specialties ?? [],
            }}
            canWrite={!ctx.demo}
          />
        </Card>

        <div className="space-y-5">
          <Card hover={false}>
            <h2 className="mb-4 flex items-center gap-2 text-[16px] font-bold text-foreground">
              <Icon name="shield" className="h-5 w-5 text-primary" />
              شاخص‌های اعتماد
            </h2>
            <p className="mb-1.5 text-sm text-foreground-soft">
              تکمیل پروفایل <b className="text-foreground">{toFa(completion)}٪</b>
            </p>
            <Progress value={completion} />
            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
                <span className="text-foreground-soft">احراز هویت حرفه‌ای</span>
                {l?.verified ? <StatusBadge tone="green">تأیید شده</StatusBadge> : <StatusBadge tone="gray">در بررسی</StatusBadge>}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
                <span className="text-foreground-soft">مدارک پروانه وکالت</span>
                {l?.verified ? <StatusBadge tone="green">تأیید شده</StatusBadge> : <StatusBadge tone="gold">ناقص</StatusBadge>}
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
                <span className="text-foreground-soft">نظرات موکلان</span>
                <b className="text-foreground">{toFa(l?.reviewCount ?? 0)} نظر</b>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="امتیاز" value={toFa(Number(l?.rating ?? 0).toFixed(1))} hint="از ۵" tone="gold" icon="star" />
            <StatCard label="پرونده موفق" value={toFa(l?.caseCount ?? 0)} hint="سابقه در دادپیو" icon="briefcase" />
            <StatCard label="سابقه" value={`${toFa(l?.experienceYears ?? 0)} سال`} hint="تجربه وکالت" icon="badge" />
          </div>

          {l && (
            <Card hover={false}>
              <h3 className="mb-2 text-sm font-bold text-foreground">پیش‌نمایش عمومی پروفایل</h3>
              <p className="text-[13px] leading-7 text-muted">
                <b className="text-foreground">{l.name}</b> · {l.title} · {l.city}
                <br />
                تخصص‌ها: {(l.specialties ?? []).join("، ") || "—"}
                {l.bio && (
                  <>
                    <br />
                    {l.bio}
                  </>
                )}
              </p>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
