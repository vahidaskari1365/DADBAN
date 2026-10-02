import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "مدیریت اسناد و مدارک" };

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

export default function DocumentsPage() {
  return (
    <>
      <PageHero badge="پنل موکل" title="مدیریت اسناد و مدارک" desc="آپلود، دسته‌بندی، مشاهده و اشتراک امن اسناد حقوقی شما — با رمزنگاری و تاریخچه‌ی نسخه‌ها." breadcrumb={[{ label: "خانه", href: "/" }, { label: "اسناد و مدارک" }]}>
        <Button icon="plus">آپلود سند جدید</Button>
      </PageHero>

      <Container className="py-10">
        {/* Folders */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FOLDERS.map((f, i) => (
            <Reveal key={f.name} delay={i * 40}>
              <button className="flex w-full flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={f.icon} className="h-5 w-5" /></span>
                <span className="text-sm font-bold text-foreground">{f.name}</span>
                <Badge tone="neutral">{f.count} فایل</Badge>
              </button>
            </Reveal>
          ))}
        </div>

        {/* Files */}
        <h2 className="mt-10 text-xl font-bold text-foreground">آخرین اسناد</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FILES.map((f, i) => (
            <Reveal key={f.name} delay={(i % 6) * 40}>
              <Card hover={false} className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-foreground-soft"><Icon name="file" className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{f.name}</p>
                  <p className="text-xs text-muted">{f.folder} • {f.size} • {f.date}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground" title="مشاهده"><Icon name="search" className="h-4 w-4" /></span>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-success" title="امن"><Icon name="lock" className="h-4 w-4" /></span>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
