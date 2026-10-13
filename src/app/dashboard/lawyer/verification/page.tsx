import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lawyers, lawyerVerifications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/user-auth";
import { ensureProfileSchema, ensureExtendedSchema } from "@/lib/auto-seed";
import { lawyerNav } from "@/components/portal/lawyer/nav-items";
import { VerificationClient, type VerificationData } from "./verification-client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("احراز هویت — پنل وکیل"),
    description: t("بارگذاری مدارک احراز هویت (پروانهٔ وکالت، کارت ملی) و پیگیری بررسی مدیر سایت."),
  };
}
export const dynamic = "force-dynamic";

export default async function LawyerVerificationPage() {
  const t = await getT();
  await ensureProfileSchema();
  try {
    await ensureExtendedSchema();
  } catch {
    /* migration best-effort */
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "lawyer" || !user.lawyerId) redirect("/dashboard/client");

  let degraded = false;
  let l:
    | {
        id: number;
        slug: string;
        verified: boolean;
        name: string;
        city: string;
      }
    | undefined;
  let request: VerificationData["request"] = null;
  try {
    const lrows = await db
      .select({ id: lawyers.id, slug: lawyers.slug, verified: lawyers.verified, name: lawyers.name, city: lawyers.city })
      .from(lawyers)
      .where(eq(lawyers.id, user.lawyerId as number))
      .limit(1);
    l = lrows[0];
    // فقط متادیتا — بایت‌های مدارک هرگز به کلاینت وکیل برنمی‌گردد
    const vrows = await db
      .select({
        id: lawyerVerifications.id,
        status: lawyerVerifications.status,
        note: lawyerVerifications.note,
        adminNote: lawyerVerifications.adminNote,
        licenseName: lawyerVerifications.licenseName,
        idName: lawyerVerifications.idName,
        degreeName: lawyerVerifications.degreeName,
        createdAt: lawyerVerifications.createdAt,
        reviewedAt: lawyerVerifications.reviewedAt,
      })
      .from(lawyerVerifications)
      .where(eq(lawyerVerifications.lawyerId, user.lawyerId as number))
      .orderBy(desc(lawyerVerifications.createdAt))
      .limit(1);
    const v = vrows[0];
    request = v
      ? {
          id: v.id,
          status: v.status as "pending" | "approved" | "rejected",
          note: v.note,
          adminNote: v.adminNote,
          licenseName: v.licenseName,
          idName: v.idName,
          degreeName: v.degreeName,
          createdAt: v.createdAt.toISOString(),
          reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
        }
      : null;
  } catch {
    degraded = true;
  }

  const data: VerificationData = {
    degraded,
    verified: l?.verified ?? false,
    slug: l?.slug ?? "",
    name: l?.name ?? user.name,
    city: l?.city ?? "",
    request,
  };

  return (
    <DashboardShell
      role="وکیل"
      title={t("احراز هویت")}
      subtitle={t("مدارک حرفه‌ای خود را بارگذاری کنید تا پس از تأیید مدیر سایت، پروفایل شما در فهرست وکلای دادورزان نمایش داده شود.")}
      nav={lawyerNav("verification")}
      name={user.name}
      back={{ fallback: "/dashboard/lawyer" }}
    >
      <VerificationClient data={data} />
    </DashboardShell>
  );
}
