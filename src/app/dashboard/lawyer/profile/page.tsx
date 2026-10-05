import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { Card, Badge, Button, EmptyState, StarRating } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LawyerPhoto } from "@/components/lawyer-photo";
import { faNum, faPrice } from "@/lib/data";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema } from "@/lib/auto-seed";
import { LawyerProfileForm } from "@/components/profile/lawyer-profile-form";

export const metadata: Metadata = {
  title: "پروفایل حرفه‌ای من — پنل وکیل",
  description: "ویرایش اطلاعات حرفه‌ای که مستقیماً در پروفایل عمومی و جستجوی وکلا نمایش داده می‌شود.",
};
export const dynamic = "force-dynamic";

export default async function LawyerProfileEditorPage() {
  await ensureProfileSchema();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const linked = user.role === "lawyer" && !!user.lawyerId;

  let l: typeof lawyers.$inferSelect | undefined;
  if (linked) {
    try {
      const rows = await db.select().from(lawyers).where(eq(lawyers.id, user.lawyerId as number)).limit(1);
      l = rows[0];
    } catch {
      /* degraded */
    }
  }

  return (
    <DashboardShell
      role="وکیل"
      title="پروفایل حرفه‌ای من"
      name={user.name}
      back={{ fallback: "/dashboard/lawyer", label: "بازگشت به داشبورد" }}
      nav={[
        { label: "نمای کلی", icon: "home", href: "/dashboard/lawyer" },
        { label: "پروفایل حرفه‌ای من", icon: "badge", active: true, href: "/dashboard/lawyer/profile" },
        { label: "دایرکتوری وکلا", icon: "user", href: "/lawyers" },
        { label: "پرسش‌های نیازمند پاسخ", icon: "chat", href: "/qa" },
        { label: "پشتیبانی", icon: "shield", href: "/support" },
      ]}
    >
      {!linked || !l ? (
        /* حساب متصل نیست — حالت صادقانه با توضیح مسیر */
        <>
          <EmptyState
            icon="id"
            title="این حساب به پروفایل وکیلی متصل نیست"
            desc="برای ویرایش پروفایل حرفه‌ای، حساب شما باید به یک پروفایل تأییدشده در دایرکتوری وکلا متصل شود. اتصال پس از راستی‌آزمایی شماره پروانه توسط کارشناسان دادبان انجام می‌شود."
          />
          <Card hover={false}>
            <h2 className="flex items-center gap-2 font-bold text-foreground">
              <Icon name="document" className="h-5 w-5 text-primary" /> پروفایل حرفه‌ای چه چیزی به شما می‌دهد؟
            </h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-7 text-foreground-soft">
              {[
                "ویرایش نام، عنوان، معرفی کوتاه و متن کامل «درباره وکیل»",
                "تعیین حوزه‌های تخصص و خدمات — همان چیزی که در فیلتر تخصص صفحه وکلا جستجو می‌شود",
                "انتخاب استان و شهر — نمایش در پیشنهادهای هم‌استان موکلان",
                "تعیین تعرفه مشاوره متنی، صوتی و تصویری که پیش از پرداخت به موکل نشان داده می‌شود",
                "زمان پاسخ‌گویی معمول که در پروفایل عمومی نمایش داده می‌شود",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Icon name="check" className="mt-1.5 h-4 w-4 shrink-0 text-success" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button href="/support" icon="mail">درخواست اتصال حساب به پروفایل</Button>
              <Button href="/lawyers" variant="ghost" icon="arrow">مشاهده دایرکتوری وکلا</Button>
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* هدر پروفایل */}
          <Card hover={false} className="flex flex-wrap items-center gap-4">
            <LawyerPhoto name={l.name} color={l.avatarColor} photoUrl={l.photoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-foreground">{l.name}</h2>
                {l.verified && <Badge tone="primary" icon="badge">تأییدشده</Badge>}
                {l.topRated && <Badge tone="accent" icon="star">وکیل برتر</Badge>}
              </div>
              <p className="mt-1 text-sm text-foreground-soft">{l.title} • {l.city} — {l.province}</p>
              <div className="mt-2">
                <StarRating rating={l.rating} count={l.reviewCount} size="md" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-extrabold text-foreground">{faNum(l.caseCount)}</p>
                <p className="text-[11px] text-muted">پرونده</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-foreground">{faNum(l.views.toLocaleString("en-US"))}</p>
                <p className="text-[11px] text-muted">بازدید پروفایل</p>
              </div>
              <div>
                <p className="text-xl font-extrabold text-foreground">{faNum(l.rating.toFixed(1))}</p>
                <p className="text-[11px] text-muted">امتیاز</p>
              </div>
            </div>
          </Card>

          {/* Completeness — صادقانه، از روی فیلدهای واقعی */}
          <CompletenessCard
            fields={{
              bio: l.bio,
              about: l.about,
              specialties: l.specialties,
              services: l.services,
              prices: [l.priceChat, l.priceVoice, l.priceVideo],
              photo: l.photoUrl,
              responseTime: l.responseTime,
            }}
          />

          {/* فرم ویرایش */}
          <Card hover={false}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-bold text-foreground">
                <Icon name="badge" className="h-5 w-5 text-primary" /> ویرایش اطلاعات حرفه‌ای
              </h2>
              <span className="text-xs text-muted">تغییرات بلافاصله در پروفایل عمومی اعمال می‌شود.</span>
            </div>
            <LawyerProfileForm
              slug={l.slug}
              initial={{
                name: l.name,
                title: l.title,
                bio: l.bio,
                about: l.about,
                specialties: l.specialties,
                services: l.services,
                province: l.province,
                city: l.city,
                responseTime: l.responseTime,
                priceChat: l.priceChat,
                priceVoice: l.priceVoice,
                priceVideo: l.priceVideo,
              }}
            />
          </Card>

          <Card hover={false} className="bg-primary-soft/40">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              اطلاعات پروانه، امتیاز و تعداد پرونده توسط سیستم مدیریت می‌شود و از این فرم قابل تغییر نیست؛ این تضمین
              اعتماد موکلان به پروفایل شماست. تعرفه‌ها پیش از پرداخت به موکل نمایش داده می‌شود و بازگشت وجه طبق سیاست
              شفاف دادبان انجام می‌شود.
            </p>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}

/** سنجش کامل بودن پروفایل — فقط از روی داده واقعی */
function CompletenessCard({
  fields,
}: {
  fields: {
    bio: string;
    about: string;
    specialties: string[];
    services: string[];
    prices: number[];
    photo: string | null;
    responseTime: string;
  };
}) {
  const items = [
    { label: "معرفی کوتاه", done: fields.bio.trim().length >= 30, href: "#", icon: "user" as const },
    { label: "متن کامل درباره وکیل", done: fields.about.trim().length >= 120, href: "#", icon: "document" as const },
    { label: "حوزه‌های تخصص (حداقل ۲)", done: fields.specialties.length >= 2, href: "#", icon: "scale" as const },
    { label: "فهرست خدمات", done: fields.services.length >= 3, href: "#", icon: "check" as const },
    { label: "تعرفه هر سه نوع مشاوره", done: fields.prices.every((p) => p > 0), href: "#", icon: "money" as const },
    { label: "عکس پروفایل", done: !!fields.photo, href: "/support", icon: "id" as const },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <Card hover={false}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-foreground">
          <Icon name="check" className="h-5 w-5 text-success" /> کامل بودن پروفایل
        </h2>
        <p className="text-sm font-extrabold text-foreground">{faNum(pct)}٪</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-gradient-to-l from-primary to-accent transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="درصد کامل بودن پروفایل"
        />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div
            key={i.label}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${
              i.done ? "border-success/30 bg-success/10 text-success" : "border-border bg-surface-2/60 text-muted"
            }`}
          >
            <Icon name={i.done ? "check" : i.icon} className="h-4 w-4 shrink-0" />
            {i.label}
          </div>
        ))}
      </div>
      {pct < 100 && (
        <p className="mt-3 text-xs leading-6 text-muted">
          پروفایل کامل‌تر، شانس دیده‌شدن در پیشنهادها و جستجوی موکلان را بالا می‌برد — همان چیزی که الگوریتم
          پیشنهاد دادبان به آن وزن می‌دهد.
        </p>
      )}
    </Card>
  );
}
