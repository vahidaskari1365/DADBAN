import type { Metadata } from "next";
import { db } from "@/db";
import { lawyerOnboarding } from "@/db/schema";
import { desc, eq, or } from "drizzle-orm";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { JoinLawyerForm } from "@/components/lawyer/join-lawyer-form";
import type { MyOnboardingRequest } from "@/components/lawyer/join-lawyer-form";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("همکاری با دادورزان — ثبت‌نام وکلای واقعی"),
    description: t(
      "درخواست همکاری بدهید؛ پس از احراز و بررسی پروانه، پروفایل عمومی وکیل شما ساخته و حساب کاربری‌تان به آن متصل می‌شود.",
    ),
    alternates: { canonical: "/join-as-lawyer" },
  };
}

const STEPS: { icon: "send" | "fingerprint" | "badge"; title: string; desc: string }[] = [
  {
    icon: "send",
    title: "ثبت درخواست و امضای قرارداد",
    desc: "مشخصات حرفه‌ای، تخصص‌ها و پذیرش قرارداد همکاری را در فرم ثبت می‌کنید.",
  },
  {
    icon: "fingerprint",
    title: "احراز و بررسی کارشناس",
    desc: "کارشناسان دادورزان پروانه و اطلاعات شما را راستی‌آزمایی می‌کنند (۳ تا ۵ روز کاری).",
  },
  {
    icon: "badge",
    title: "پروفایل فعال + اتصال حساب",
    desc: "پروفایل عمومی وکیل شما ساخته، حساب کاربری‌تان متصل و می‌توانید پیشنهاد بفرستید.",
  },
];

export default async function JoinAsLawyerPage() {
  const t = await getT();

  // جدول روی‌بوردینگ — best-effort (در نبود دیتابیس فرم همچنان رندر می‌شود و خطای شفاف می‌دهد)
  try {
    await ensureExtendedSchema();
  } catch {
    /* non-fatal */
  }

  // اگر کاربر لاگین است: درخواست قبلی‌اش را نشان بده (pending/approved به‌جای فرم)
  let loggedIn = false;
  let alreadyLinked = false;
  let myRequest: MyOnboardingRequest = null;
  try {
    const me = await getCurrentUser();
    if (me) {
      loggedIn = true;
      alreadyLinked = me.role === "lawyer" && typeof me.lawyerId === "number" && me.lawyerId > 0;
      if (!alreadyLinked) {
        const rows = await db
          .select({
            id: lawyerOnboarding.id,
            status: lawyerOnboarding.status,
            adminNote: lawyerOnboarding.adminNote,
            reviewedAt: lawyerOnboarding.reviewedAt,
            createdAt: lawyerOnboarding.createdAt,
          })
          .from(lawyerOnboarding)
          .where(
            me.phone
              ? or(eq(lawyerOnboarding.userId, me.id), eq(lawyerOnboarding.phone, me.phone))
              : eq(lawyerOnboarding.userId, me.id),
          )
          .orderBy(desc(lawyerOnboarding.createdAt))
          .limit(1);
        const row = Array.isArray(rows) ? rows[0] : undefined;
        if (row) {
          myRequest = {
            id: row.id,
            status: String(row.status),
            adminNote: row.adminNote,
            reviewedAt: row.reviewedAt ? new Date(row.reviewedAt).toISOString() : null,
            createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)).toISOString(),
          };
        }
      }
    }
  } catch {
    /* دیتابیس در دسترس نیست — فرم عمومی بدون وضعیت قبلی رندر می‌شود */
  }

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-lawyers.png"
        badge={t("روی‌بوردینگ وکلای واقعی")}
        title={t("به شبکهٔ وکلای دادورزان بپیوندید")}
        desc={t(
          "وکیل رسمی یا کارآموز وکالت هستید؟ مشخصات و پروانهٔ خود را ثبت کنید؛ پس از احراز هویت و تأیید کارشناس، پروفایل عمومی شما در دایرکتوری ساخته می‌شود، حساب کاربری‌تان به آن متصل می‌شود و پرونده‌های موکلان را دریافت می‌کنید.",
        )}
        breadcrumb={[
          { label: t("خانه"), href: "/" },
          { label: t("وکلای دادورزان"), href: "/lawyers" },
          { label: t("همکاری با دادورزان") },
        ]}
      />

      <Container className="py-8 sm:py-10">
        {/* گام‌های عضویت — سه‌گانهٔ شفاف */}
        <div className="mx-auto mb-8 grid max-w-3xl gap-4 sm:grid-cols-3" aria-label={t("گام‌های عضویت")}>
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-surface p-4">
              <span className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon name={s.icon} className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-bold text-muted">{t("گام")} {["۱", "۲", "۳"][i]}</span>
              </span>
              <p className="mt-2.5 text-sm font-bold text-foreground">{t(s.title)}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted">{t(s.desc)}</p>
            </div>
          ))}
        </div>

        <JoinLawyerForm loggedIn={loggedIn} alreadyLinked={alreadyLinked} myRequest={myRequest} />

        {/* تضمین‌های اعتماد */}
        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-bold text-foreground-soft">
            <Icon name="lock" className="h-3.5 w-3.5 text-success" /> {t("اطلاعات شما محرمانه می‌ماند")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-bold text-foreground-soft">
            <Icon name="fingerprint" className="h-3.5 w-3.5 text-success" /> {t("راستی‌آزمایی پروانه توسط کارشناس")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] font-bold text-foreground-soft">
            <Icon name="handshake" className="h-3.5 w-3.5 text-success" /> {t("قرارداد همکاری شفاف با نسخهٔ تاریخ‌دار")}
          </span>
        </div>
      </Container>
    </>
  );
}
