import type { Metadata } from "next";
import Link from "next/link";
import { Container, SectionHeading, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ResourcesTools } from "@/components/ai/resources-tools";
import { SITE_NAME } from "@/lib/brand";
import { OPEN_SOURCE_PROJECTS } from "@/data/ai-resources";

export const metadata: Metadata = {
  title: "جعبه‌ابزار منبع‌باز هوش مصنوعی",
  description:
    "یکپارچه‌سازی شش پروژه‌ی منبع‌باز هوش مصنوعی در دادبان: کاتالوگ APIهای رایگان LLM، ابزارهای وب برای عامل‌ها، کتابخانه مهارت‌ها، آکادمی مهندسی AI، مسیریابی چندتأمین‌کننده و چک‌لیست امنیت عامل.",
  alternates: { canonical: "/ai/resources" },
  openGraph: {
    title: `جعبه‌ابزار منبع‌باز هوش مصنوعی | ${SITE_NAME}`,
    description: "کاتالوگ زنده‌ی APIهای رایگان، ابزارهای وب عامل، مهارت‌ها، آکادمی AI و امنیت عامل — همه در دادبان.",
  },
};

export default function AiResourcesPage() {
  return (
    <div className="page-wash pb-16">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden border-b border-border bg-surface-2">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-soft blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-accent-soft blur-3xl" />
        <Container className="relative">
          <div className="py-12 sm:py-16 lg:py-20">
            <Badge tone="accent" icon="sparkles">شش پروژه‌ی منبع‌باز، یک جعبه‌ابزار</Badge>
            <h1 className="mt-4 max-w-3xl text-3xl font-black leading-[1.25] text-foreground sm:text-4xl lg:text-5xl">
              جعبه‌ابزار <span className="text-primary">منبع‌باز</span> هوش مصنوعی دادبان
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted sm:text-lg sm:leading-9">
              کاتالوگ زنده‌ی APIهای رایگان، ابزارهای دسترسی وب برای عامل‌ها، کتابخانه‌ی مهارت‌ها، آکادمی آموزش و
              موتور مسیریابی چندتأمین‌کننده — چرخه‌ی کامل هوش مصنوعی، بدون هیچ هزینه‌ای.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button href="#toolbox" size="lg" icon="bolt">مشاهده‌ی ابزارها</Button>
              <Button href="/ai" variant="outline" size="lg" icon="sparkles">مرکز هوش مصنوعی</Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── پروژه‌های همکار ─── */}
      <section className="mt-14">
        <Container>
          <SectionHeading
            eyebrow="منبع‌های همکار"
            title="شش مخزن منبع‌باز، یکپارچه در دادبان"
            desc="هر مخزن یک لایه از پشته‌ی هوش مصنوعی را پوشش می‌دهد؛ همگی به‌صورت زنده و فارسی در همین صفحه قابل استفاده‌اند."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OPEN_SOURCE_PROJECTS.map((p) => (
              <Card key={p.slug} className="group flex flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon name={p.icon} className="h-5 w-5" />
                  </span>
                  <a
                    href={p.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-[11px] font-bold text-muted transition-colors hover:text-primary"
                    dir="ltr"
                    title={p.repo}
                  >
                    {p.repo.replace("https://github.com/", "")}
                  </a>
                </div>
                <h3 className="mt-4 font-bold text-foreground">{p.faTitle}</h3>
                <p className="mt-1 text-xs font-semibold text-primary" dir="ltr">{p.name}</p>
                <p className="mt-2 flex-1 text-sm leading-7 text-muted">{p.faDesc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => <Badge key={t}>{t}</Badge>)}
                </div>
                <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs font-semibold text-foreground-soft">{p.highlight}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* ─── ابزارها (تعاملی) ─── */}
      <section id="toolbox" className="mt-16 scroll-mt-24">
        <Container>
          <SectionHeading
            eyebrow="ابزارهای زنده"
            title="همین حالا استفاده کنید"
            desc="کاتالوگ را بگردید، صفحه بخوانید، مخزن تحلیل کنید و دروازه را تست کنید."
          />
          <div className="mt-8 rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-card)] sm:p-6">
            <ResourcesTools />
          </div>
        </Container>
      </section>

      {/* ─── سلب مسئولیت ─── */}
      <section className="mt-12">
        <Container>
          <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <p className="text-sm leading-7 text-foreground-soft">
              کاتالوگ APIهای رایگان از مخزن عمومی awesome-free-llm-apis استخراج شده و ممکن است شرایط هر تأمین‌کننده تغییر کند —
              پیش از استفاده‌ی تجاری، حتماً شرایط استفاده‌ی خود تأمین‌کننده را بخوانید. ابزارهای این صفحه خروجی اطلاع‌رسانی دارند و
              جایگزین مشاوره‌ی حقوقی رسمی نیستند؛ برای تصمیم‌های مهم با وکلای تأییدشده‌ی{" "}
              <Link href="/lawyers" className="font-bold text-primary hover:underline">دادبان</Link> مشورت کنید.
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}
