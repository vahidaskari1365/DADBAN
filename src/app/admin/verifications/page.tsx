import type { Metadata } from "next";
import { db } from "@/db";
import { lawyers, lawyerVerifications, users } from "@/db/schema";
import { desc, eq, and, inArray, sql } from "drizzle-orm";
import { guardAdminPage } from "@/lib/admin-auth";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { Container, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import VerificationsClient from "./verifications-client";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("احراز هویت وکلا — پنل مدیریت دادورزان") },
    description: t("بررسی مدارک احراز هویت وکلا: پروانهٔ وکالت، کارت ملی و مدرک تحصیلی — تأیید یا رد با پیغام به وکیل."),
  };
}
export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  await guardAdminPage("lawyers");
  const t = await getT();

  try {
    await ensureExtendedSchema();
  } catch {
    /* best-effort */
  }

  let rows: Awaited<ReturnType<typeof loadRows>> = [];
  let pendingRegs: Awaited<ReturnType<typeof loadPendingRegistrations>> = [];
  let degraded = false;
  try {
    rows = await loadRows();
  } catch {
    degraded = true;
  }
  if (!degraded) {
    try {
      pendingRegs = await loadPendingRegistrations();
    } catch {
      /* best-effort — بخش ثبت‌نام‌های بدون مدرک مخفی می‌ماند */
    }
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <Container className="py-10">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
          <Icon name="fingerprint" className="h-6 w-6 text-primary" />
          {t("احراز هویت وکلا")}
        </h1>
        <p className="mt-1 text-sm text-foreground-soft">
          {t("مدارک وکلا (پروانه، کارت ملی، مدرک) را بررسی کنید؛ با تأیید، وکیل وارد فهرست عمومی سایت می‌شود و به او پیغام می‌رود.")}
        </p>
        <p className="mt-2 text-xs font-bold text-foreground-soft" data-testid="verifications-count">
          {t("در انتظار بررسی")}: {pendingCount.toLocaleString("fa-IR")}
          {pendingRegs.length > 0 && (
            <span className="ms-3 text-warning">{t("ثبت‌نام بدون مدرک")}: {pendingRegs.length.toLocaleString("fa-IR")}</span>
          )}
        </p>
      </div>
      {degraded ? (
        <Card hover={false} className="p-8 text-center text-sm text-muted">
          {t("دیتابیس در دسترس نیست — بعداً تلاش کنید.")}
        </Card>
      ) : (
        <VerificationsClient
          initialRows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null }))}
          pendingRegs={pendingRegs.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
      )}
    </Container>
  );
}

async function loadRows() {
  return db
    .select({
      id: lawyerVerifications.id,
      lawyerId: lawyerVerifications.lawyerId,
      status: lawyerVerifications.status,
      licenseName: lawyerVerifications.licenseName,
      licenseSize: lawyerVerifications.licenseSize,
      idName: lawyerVerifications.idName,
      idSize: lawyerVerifications.idSize,
      degreeName: lawyerVerifications.degreeName,
      degreeSize: lawyerVerifications.degreeSize,
      note: lawyerVerifications.note,
      adminNote: lawyerVerifications.adminNote,
      reviewedAt: lawyerVerifications.reviewedAt,
      createdAt: lawyerVerifications.createdAt,
      lawyerName: lawyers.name,
      lawyerSlug: lawyers.slug,
      lawyerCity: lawyers.city,
      lawyerType: lawyers.lawyerType,
      licenseNo: lawyers.licenseNo,
      specialties: lawyers.specialties,
      employeeLawyer: lawyers.employeeLawyer,
      verified: lawyers.verified,
      userPhone: users.phone,
    })
    .from(lawyerVerifications)
    .leftJoin(lawyers, eq(lawyers.id, lawyerVerifications.lawyerId))
    .leftJoin(users, eq(users.id, lawyerVerifications.userId))
    .orderBy(desc(lawyerVerifications.createdAt))
    .limit(200);
}

/**
 * ثبت‌نام‌شده‌های بدون مدارک — حلقهٔ قبلاً قطع:
 * کاربر به‌عنوان وکیل/کارشناس ثبت‌نام کرده (پروفایل verified=false) ولی هنوز
 * هیچ درخواست احراز هویتی (آپلود مدارک) ثبت نکرده؛ قبلاً هیچ‌جای پنل دیده نمی‌شد
 * و مدیر از وجودش بی‌خبر می‌ماند. حالا بالای همین صفحه با امکان تماس و تأیید دستی.
 */
async function loadPendingRegistrations() {
  return db
    .select({
      lawyerId: lawyers.id,
      name: lawyers.name,
      slug: lawyers.slug,
      city: lawyers.city,
      lawyerType: lawyers.lawyerType,
      specialties: lawyers.specialties,
      employeeLawyer: lawyers.employeeLawyer,
      createdAt: lawyers.createdAt,
      phone: users.phone,
    })
    .from(lawyers)
    .leftJoin(users, eq(users.lawyerId, lawyers.id))
    .where(
      and(
        eq(lawyers.verified, false),
        inArray(lawyers.lawyerType, ["expert", "karamooz"]),
        sql`NOT EXISTS (SELECT 1 FROM lawyer_verifications v WHERE v.lawyer_id = ${lawyers.id})`,
      ),
    )
    .orderBy(desc(lawyers.createdAt))
    .limit(100);
}
