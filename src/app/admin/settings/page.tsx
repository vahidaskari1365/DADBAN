import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { platformSettings } from "@/db/schema-marketplace";
import { isAdmin } from "@/lib/admin-auth";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import SettingsClient from "./settings-client";

export const metadata: Metadata = {
  title: "تنظیمات پلتفرم — پنل مدیریت دادپیو",
  description: "نرخ کمیسیون، حداقل برداشت، امتیاز تطبیق، تأمین‌کنندگان اعتبار و مدل موتور تطبیق دادپیو.",
};
export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, string> = {
  commission_rate: "10",
  payout_min: "10000000",
  min_lawyer_score: "60",
  credit_providers: "azki,partner_bank",
  matching_model: "dadpayo-heuristic-v1",
};

export default async function AdminSettingsPage() {
  if (!(await isAdmin())) redirect("/admin/login");

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

  return (
    <>
      <PageHero
        badge="Admin · تنظیمات"
        title="تنظیمات پلتفرم"
        desc="پارامترهای کلیدی مارکت‌پلیس دادپیو — کمیسیون، تسویه، آستانهٔ تطبیق و تأمین‌کنندگان"
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "پنل مدیریت", href: "/admin" }, { label: "تنظیمات" }]}
      />
      <Container className="py-10">
        <SettingsClient settings={settings} />
      </Container>
    </>
  );
}
