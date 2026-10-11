import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Container } from "@/components/ui";
import { BackButton } from "@/components/back-button";
import { ReferForm } from "@/components/lawyer/refer-form";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "درخواست همکاری / ارجاع پرونده",
  description: "ثبت درخواست همکاری تخصصی یا ارجاع پرونده به همکار در دایرکتوری وکلای دادبان.",
  robots: { index: false },
};

/**
 * فرم درخواست همکاری به یک همکار — فقط برای وکیل‌سمت (وکیل یا عضو تیم).
 * مسیر ورود: پروفایل همکار ← دکمهٔ «درخواست همکاری / ارجاع پرونده».
 * مسیر خروج: کارتابل «همکاری و ارجاع» پنل (/dashboard/lawyer#collab).
 */
export default async function ReferPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getT();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/lawyers/${encodeURIComponent(slug)}/refer`);
  if (!isLawyerSideRole(user.role)) {
    // موکل‌ها و مهمان‌های واردشده به جریان ارجاع راه ندارند — به پروفایل برمی‌گردند
    redirect(`/lawyers/${encodeURIComponent(slug)}`);
  }
  const senderLawyerId = user.role === "lawyer" ? user.lawyerId : user.parentLawyerId;
  if (!senderLawyerId) redirect("/dashboard/lawyer");

  let target: typeof lawyers.$inferSelect | undefined;
  try {
    const rows = await db.select().from(lawyers).where(eq(lawyers.slug, slug)).limit(1);
    target = rows[0];
  } catch (err) {
    console.error("[dadban] refer page target query failed:", err);
  }
  if (!target) notFound();

  // ارجاع به خودی خود معنا ندارد
  if (target.id === senderLawyerId) redirect("/dashboard/lawyer");

  return (
    <Container className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted" aria-label={t("مسیر صفحه")}>
          <Link href="/dashboard/lawyer" className="hover:text-primary">{t("پنل وکیل")}</Link>
          <span aria-hidden>/</span>
          <Link href="/lawyers" className="hover:text-primary">{t("دایرکتوری همکاران")}</Link>
          <span aria-hidden>/</span>
          <Link href={`/lawyers/${target.slug}`} className="hover:text-primary">{target.name}</Link>
          <span aria-hidden>/</span>
          <span className="text-foreground-soft">{t("درخواست همکاری")}</span>
        </nav>
        <BackButton variant="bar" label={t("بازگشت به پروفایل همکار")} fallback={`/lawyers/${target.slug}`} />
      </div>

      <div className="mt-6">
        <ReferForm
          senderName={user.name}
          target={{
            id: target.id,
            name: target.name,
            slug: target.slug,
            title: target.title,
            city: target.city,
            specialties: target.specialties,
            avatarColor: target.avatarColor,
            photoUrl: target.photoUrl,
            verified: target.verified,
            experienceYears: target.experienceYears,
          }}
        />
      </div>
    </Container>
  );
}
