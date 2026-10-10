import type { Metadata } from "next";
import { db } from "@/db";
import { managedServices, serviceCategories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Container, SectionHeading, Card, Button } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import Link from "next/link";
import type { IconKey } from "@/lib/data";
import { ServiceCard } from "@/components/managed";
import { CATALOG_CATEGORIES, CATALOG_SERVICES } from "@/lib/managed-catalog";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("خدمات پیگیری و انجام امور — دادبان"),
    description: t("پیگیری پرونده‌ها، امور اداری، ثبتی، مالیاتی و اجرای احکام را به کارشناسان دادبان بسپارید."),
  };
}
export const dynamic = "force-dynamic";

export default async function ServicesCatalog() {
  const t = await getT();
  const locale = await getServerLocale();
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

  // ترجمهٔ محتوای داینامیک (DB یا فال‌بک کاتالوگ) — عنوان/توضیح هر گروه و خدمت
  [categories, services] = await Promise.all([
    Promise.all(
      categories.map(async (c) => ({
        ...c,
        name: await tdyn(locale, c.name, 200),
        description: await tdyn(locale, c.description, 500),
      })),
    ),
    Promise.all(
      (services as any[]).map(async (s) => ({
        ...s,
        title: await tdyn(locale, s.title, 300),
        shortDescription: await tdyn(locale, s.shortDescription, 400),
      })),
    ),
  ]);

  const grouped = categories.map((c) => ({
    ...c,
    items: (services as any[]).filter((s) => s.category === c.slug),
  }));

  return (
    <div className="min-h-screen pb-16">
      <PageHero
        variant="market"
        image="/images/hero-services.png"
        badge={t("خدمات پیگیری و انجام امور")}
        title={t("کارهای زمان‌بر حقوقی و اداری را به ما بسپارید")}
        desc={t("کارهایی که باید حضوری در اجرای احکام، اداره ثبت، دارایی، شهرداری و تأمین اجتماعی انجام شود — با یک وکالت‌نامه رسمی، نماینده دادبان به‌جای شما صف می‌ایستد و پیش می‌برد.")}
      >
        <div className="flex flex-wrap gap-3">
          <Button href="/services#catalog" variant="accent" size="lg" icon="briefcase">
            {t("مشاهده خدمات")}
          </Button>
          <Link href="/ai-assistant" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 text-base font-bold text-white transition-colors hover:bg-white/20">
            <Icon name="sparkles" className="h-5 w-5" />
            {t("مشاوره با هوش مصنوعی")}
          </Link>
        </div>
      </PageHero>

      <div id="catalog" className="mt-12">
        <Container>
        <SectionHeading eyebrow={t("فهرست خدمات")} title={t("خدمات عملیاتی دادبان")} desc={t("هر خدمت توسط کارشناس عملیات انجام می‌شود و در صورت نیاز با نظارت وکیل همراه است.")} />
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
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
                  {g.items.map((s: any) => (
                    <ServiceCard key={s.slug ?? s.id} service={s} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t("در حال حاضر خدمتی در این گروه منتشر نشده است.")}</p>
              )}
            </div>
          ))}
          {(services as any[]).filter((s) => !categories.some((c) => c.slug === s.category)).length > 0 && (
            <div>
              <h2 className="mb-5 text-xl font-bold text-foreground">{t("سایر خدمات")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
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
              <h3 className="text-lg font-bold">{t("نمی‌دانید کدام خدمت مناسب شماست؟")}</h3>
              <p className="mt-1 text-sm text-primary-foreground/80">
                {t("از دستیار هوشمند دادبان بپرسید؛ بهترین مسیر و اقدام بعدی را به شما نشان می‌دهد.")}
              </p>
            </div>
            <Button href="/ai-assistant" variant="accent" icon="sparkles">
              {t("پرسش از دستیار")}
            </Button>
          </div>
        </Card>
      </Container>
      </div>
    </div>
  );
}
