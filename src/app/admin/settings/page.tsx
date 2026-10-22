import type { Metadata } from "next";
import { db } from "@/db";
import { platformSettings } from "@/db/schema-marketplace";
import { legalReviews } from "@/db/schema";
import { desc } from "drizzle-orm";
import { guardAdminPage } from "@/lib/admin-auth";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import SettingsClient from "./settings-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("تنظیمات پلتفرم — پنل مدیریت دادورزان"),
    description: t("نرخ کمیسیون، حداقل برداشت، امتیاز تطبیق، تأمین‌کنندگان اعتبار و مدل موتور تطبیق دادورزان."),
  };
}
export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  commission_rate: "10",
  payout_min: "10000000",
  min_lawyer_score: "60",
  credit_providers: "azki,partner_bank",
  matching_model: "dadpayo-heuristic-v1",
};

export default async function AdminSettingsPage() {
  await guardAdminPage("settings");
  const t = await getT();

  let settings: Record<string, string> = { ...DEFAULTS };
  try {
    const rows = await db.select().from(platformSettings);
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      if (row.key in DEFAULTS && row.value !== "") settings[row.key] = row.value;
    }
  } catch {
    /* حالت تنزل‌یافته — مقادیر پیش‌فرض */
  }

  /* بازبینی‌های حقوقی ثبت‌شده برای نشان اعتماد صفحات — try/catch، بدون دیتابیس هم امن */
  let reviews: { id: number; pageSlug: string; reviewerName: string; reviewerTitle: string; summary: string; reviewedAt: string }[] = [];
  try {
    await ensureExtendedSchema();
    const rows = await db.select().from(legalReviews).orderBy(desc(legalReviews.reviewedAt));
    reviews = (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      pageSlug: r.pageSlug,
      reviewerName: r.reviewerName,
      reviewerTitle: r.reviewerTitle,
      summary: r.summary,
      reviewedAt: (r.reviewedAt instanceof Date ? r.reviewedAt : new Date(r.reviewedAt)).toISOString(),
    }));
  } catch {
    /* حالت تنزل‌یافته — فهرست خالی */
  }

  return (
    <>
      <PageHero
        badge={t("Admin · تنظیمات")}
        title={t("تنظیمات پلتفرم")}
        desc={t("پارامترهای کلیدی مارکت‌پلیس دادورزان — کمیسیون، تسویه، آستانهٔ تطبیق و تأمین‌کنندگان")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت"), href: "/admin" }, { label: t("تنظیمات") }]}
      />
      <Container className="py-10">
        <SettingsClient settings={settings} legalReviews={reviews} />
      </Container>
    </>
  );
}
