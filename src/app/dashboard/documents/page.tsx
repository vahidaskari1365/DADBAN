import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { getCurrentUser } from "@/lib/user-auth";
import { isLawyerSideRole } from "@/lib/roles";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("مدیریت اسناد و مدارک") };
}

const FOLDERS = [
  { name: "پرونده‌ها", count: 4, icon: "folder" as const },
  { name: "قراردادها", count: 7, icon: "document" as const },
  { name: "مدارک شخصی", count: 3, icon: "id" as const },
  { name: "اسناد دریافتی", count: 5, icon: "mail" as const },
  { name: "اسناد ارسالی", count: 9, icon: "send" as const },
];

const FILES = [
  { name: "قرارداد اجاره ۱۴۰۳.pdf", type: "قرارداد", folder: "قراردادها", date: "امروز", size: "۲۴۰ ک‌ب" },
  { name: "دادخواست طلاق توافقی.docx", type: "دادخواست", folder: "پرونده‌ها", date: "دیروز", size: "۶۸ ک‌ب" },
  { name: "کارت ملی.jpg", type: "هویتی", folder: "مدارک شخصی", date: "۳ روز پیش", size: "۱۲۰ ک‌ب" },
  { name: "چک برگشتی.jpg", type: "سند", folder: "پرونده‌ها", date: "۵ روز پیش", size: "۹۵ ک‌ب" },
  { name: "اظهارنامه مطالبه وجه.pdf", type: "اظهارنامه", folder: "قراردادها", date: "۱ هفته پیش", size: "۸۰ ک‌ب" },
  { name: "سند مالکیت.pdf", type: "سند", folder: "مدارک شخصی", date: "۲ هفته پیش", size: "۳۱۰ ک‌ب" },
];

export default async function DocumentsPage() {
  const t = await getT();
  const tf = templateT(t);
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isLawyerSideRole(user.role)) redirect("/dashboard/lawyer");
  return (
    <>
      <PageHero badge={t("پنل موکل")} title={t("مدیریت اسناد و مدارک")} desc={t("آپلود، دسته‌بندی، مشاهده و اشتراک امن اسناد حقوقی شما — با رمزنگاری و تاریخچه‌ی نسخه‌ها.")} breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("اسناد و مدارک") }]}>
        <Button icon="plus">{t("آپلود سند جدید")}</Button>
      </PageHero>

      <Container className="py-10">
        {/* Folders */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FOLDERS.map((f, i) => (
            <Reveal key={f.name} delay={i * 40}>
              <button className="flex w-full flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={f.icon} className="h-5 w-5" /></span>
                <span className="text-sm font-bold text-foreground">{t(f.name)}</span>
                <Badge tone="neutral">{tf("{n} فایل", { n: String(f.count) })}</Badge>
              </button>
            </Reveal>
          ))}
        </div>

        {/* Files */}
        <h2 className="mt-10 text-xl font-bold text-foreground">{t("آخرین اسناد")}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FILES.map((f, i) => (
            <Reveal key={f.name} delay={(i % 6) * 40}>
              <Card hover={false} className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-foreground-soft"><Icon name="file" className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{t(f.name)}</p>
                  <p className="text-xs text-muted">{t(f.folder)} • {t(f.size)} • {t(f.date)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground" title={t("مشاهده")}><Icon name="search" className="h-4 w-4" /></span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-success" title={t("امن")}><Icon name="lock" className="h-4 w-4" /></span>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
