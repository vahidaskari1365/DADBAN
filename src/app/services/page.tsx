import type { Metadata } from "next";
import { db } from "@/db";
import { managedServices, serviceCategories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Container, SectionHeading, Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { ServiceCard } from "@/components/managed";
import { CATALOG_CATEGORIES, CATALOG_SERVICES } from "@/lib/managed-catalog";

export const metadata: Metadata = {
  title: "خدمات پیگیری و انجام امور — دادبان",
  description: "پیگیری پرونده‌ها، امور اداری، ثبتی، مالیاتی و اجرای احکام را به کارشناسان دادبان بسپارید.",
};
export const dynamic = "force-dynamic";

export default async function ServicesCatalog() {
  let categories: { slug: string; name: string; description: string; icon: string }[] = [];
  let services: any[] = [];
  try {
    [categories, services] = await Promise.all([
      db.select().from(serviceCategories).where(eq(serviceCategories.active, true)).orderBy(serviceCategories.sortOrder),
      db
        .select()
        .from(managedServices)
        .where(eq(managedServices.active, true))
        .orderBy(desc(managedServices.featured), managedServices.sortOrder),
    ]);
  } catch (err) {
    console.error("[dadban] services catalog query failed:", err);
  }
  if (categories.length === 0) {
    categories = CATALOG_CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
    }));
  }
  if (services.length === 0) {
    services = CATALOG_SERVICES.filter((s) => s.active);
  }

  const grouped = categories.map((c) => ({
    ...c,
    items: (services as any[]).filter((s) => s.category === c.slug),
  }));

  return (
    <div className="min-h-screen bg-background pb-16">
      <section className="border-b border-border bg-gradient-to-b from-primary-soft/60 to-background">
        <Container className="py-12 sm:py-16">
          <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            خدمات پیگیری و انجام امور
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            کارهای زمان‌بر حقوقی و اداری را به ما بسپارید
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
            پیگیری پرونده، امور ثبتی، مالیاتی، اجرای احکام و درخواست‌های اداری — تیم عملیات دادبان با نظارت حرفه‌ای آن‌ها را انجام می‌دهد.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/services#catalog" size="lg" icon="briefcase">
              مشاهده خدمات
            </Button>
            <Button href="/ai-assistant" variant="outline" size="lg" icon="sparkles">
              مشاوره با هوش مصنوعی
            </Button>
          </div>
        </Container>
      </section>

      <div id="catalog" className="mt-12">
        <Container>
        <SectionHeading eyebrow="فهرست خدمات" title="خدمات عملیاتی دادبان" desc="هر خدمت توسط کارشناس عملیات انجام می‌شود و در صورت نیاز با نظارت وکیل همراه است." />
        <div className="mt-10 space-y-12">
          {grouped.map((g) => (
            <div key={g.slug}>
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-primary">
                  <Icon name={(g.icon as IconKey) ?? "folder"} className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{g.name}</h2>
                  {g.description && <p className="text-sm text-muted">{g.description}</p>}
                </div>
              </div>
              {g.items.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((s: any) => (
                    <ServiceCard key={s.slug ?? s.id} service={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">در حال حاضر خدمتی در این گروه منتشر نشده است.</p>
              )}
            </div>
          ))}
          {(services as any[]).filter((s) => !categories.some((c) => c.slug === s.category)).length > 0 && (
            <div>
              <h2 className="mb-5 text-xl font-bold text-foreground">سایر خدمات</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(services as any[]).filter((s) => !categories.some((c) => c.slug === s.category)).map((s: any) => (
                  <ServiceCard key={s.slug ?? s.id} service={s} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Container>

      <Container className="mt-16">
        <Card className="bg-primary text-primary-foreground">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">نمی‌دانید کدام خدمت مناسب شماست؟</h3>
              <p className="mt-1 text-sm text-primary-foreground/80">
                از دستیار هوشمند دادبان بپرسید؛ بهترین مسیر و اقدام بعدی را به شما نشان می‌دهد.
              </p>
            </div>
            <Button href="/ai-assistant" variant="accent" icon="sparkles">
              پرسش از دستیار
            </Button>
          </div>
        </Card>
      </Container>
      </div>
    </div>
  );
}
