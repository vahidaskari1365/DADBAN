import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { creditRequests } from "@/db/schema-marketplace";
import { cases } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { PageHero } from "@/components/page-hero";
import { Card, Badge, Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { toFa, shortToman } from "@/lib/money";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";
import ProvidersClient from "./providers-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("تأمین‌کنندگان اعتبار — پنل مدیریت دادپیو"),
    description: t("وضعیت اتصال ازکی‌وام و بانک همکار، و پیگیری درخواست‌های تأمین اعتبار حق‌الوکاله."),
  };
}
export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const t = await getT();
  const tf = templateT(t);

  let rows: {
    id: number;
    caseId: number;
    caseSubject: string | null;
    provider: string;
    amount: string;
    months: number;
    status: string;
    statusDetail: string;
    referenceCode: string;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  try {
    const data = await db
      .select({
        id: creditRequests.id,
        caseId: creditRequests.caseId,
        caseSubject: cases.subject,
        provider: creditRequests.provider,
        amount: creditRequests.amount,
        months: creditRequests.months,
        status: creditRequests.status,
        statusDetail: creditRequests.statusDetail,
        referenceCode: creditRequests.referenceCode,
        createdAt: creditRequests.createdAt,
        updatedAt: creditRequests.updatedAt,
      })
      .from(creditRequests)
      .leftJoin(cases, eq(creditRequests.caseId, cases.id))
      .orderBy(desc(creditRequests.createdAt))
      .limit(60);
    rows = Array.isArray(data) ? data : [];
  } catch {
    rows = [];
  }

  const azkiCount = rows.filter((r) => r.provider === "azki").length;
  const bankCount = rows.filter((r) => r.provider === "partner_bank").length;

  return (
    <>
      <PageHero
        badge={t("Admin · تأمین اعتبار")}
        title={t("تأمین‌کنندگان اعتبار")}
        desc={t("وضعیت اتصال تأمین‌کنندگان حق‌الوکاله و پیگیری چرخهٔ درخواست‌های اعتباری موکلان")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت"), href: "/admin" }, { label: t("تأمین‌کنندگان") }]}
      />
      <Container className="py-10">
        {/* ---------------- کارت تأمین‌کنندگان ---------------- */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card hover={false}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <Icon name="bolt" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">{t("ازکی‌وام")}</h2>
                  <p className="mt-0.5 text-xs text-muted">{t("تأمین اعتبار حق‌الوکاله — پرداخت اقساطی")}</p>
                </div>
              </div>
              <Badge tone="success">
                <span className="ml-1 inline-block h-2 w-2 rounded-full bg-success" />
                {t("متصل (Adapter)")}
              </Badge>
            </div>
            <p className="mt-4 rounded-xl bg-surface-2/60 p-3.5 text-xs leading-6 text-muted">
              {t("اتصال در حالت Adapter فعال است؛ نرخ سود، سقف مبلغ و کارمزد در نسخهٔ نهایی از API رسمی تأمین‌کننده خوانده می‌شود. تا آن زمان درخواست‌ها با وضعیت‌های چرخهٔ داخلی (ارسال → اعتبارسنجی → تأیید/رد → واریز) پیگیری می‌شوند.")}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-foreground-soft">
              <span>{tf("درخواست‌های ثبت‌شده: {n}", { n: toFa(azkiCount) })}</span>
              <span>{t("حجم:")} {shortToman(rows.filter((r) => r.provider === "azki").reduce((s, r) => s + Number(r.amount || 0), 0))}</span>
            </div>
          </Card>

          <Card hover={false}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-foreground-soft">
                  <Icon name="landmark" className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">{t("بانک همکار")}</h2>
                  <p className="mt-0.5 text-xs text-muted">{t("تسهیل حقوقی و چک صیادی — در حال مذاکره")}</p>
                </div>
              </div>
              <Badge tone="neutral">Placeholder</Badge>
            </div>
            <p className="mt-4 rounded-xl bg-surface-2/60 p-3.5 text-xs leading-6 text-muted">
              {t("این اتصال به‌صورت رزرو (Placeholder) نگهداری می‌شود؛ پس از امضای توافق‌نامهٔ بانکی، همان چرخهٔ وضعیت ازکی‌وام برای این تأمین‌کننده نیز فعال خواهد شد و درخواست‌ها به‌صورت موازی ارسال می‌گردند.")}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-foreground-soft">
              <span>{tf("درخواست‌های ثبت‌شده: {n}", { n: toFa(bankCount) })}</span>
              <span>{t("حجم:")} {shortToman(rows.filter((r) => r.provider === "partner_bank").reduce((s, r) => s + Number(r.amount || 0), 0))}</span>
            </div>
          </Card>
        </div>

        {/* ---------------- جدول درخواست‌ها ---------------- */}
        <div className="mt-6">
          <ProvidersClient rows={rows} />
        </div>
      </Container>
    </>
  );
}
