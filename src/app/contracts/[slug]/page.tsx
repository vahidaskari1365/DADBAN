import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Container, Button, Card } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { templateT } from "@/lib/i18n/core";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getT();
  const locale = await getServerLocale();
  let c: typeof contracts.$inferSelect | undefined;
  try {
    const rows = await db.select().from(contracts).where(eq(contracts.slug, slug)).limit(1);
    c = rows[0];
  } catch (err) {
    console.error("[dadban] contract metadata query failed:", err);
  }
  if (!c) return { title: t("قرارداد یافت نشد") };
  const [cTitle, cDescription] = await Promise.all([tdyn(locale, c.title, 300), tdyn(locale, c.description, 600)]);
  return {
    title: templateT(t)("تنظیم {name}", { name: cTitle }),
    description: `${cDescription} ${t("کاربرد، بندهای مهم، ریسک‌ها و قیمت تنظیم. سفارش تنظیم اختصاصی توسط وکیل.")}`,
    alternates: { canonical: `/contracts/${slug}` },
  };
}

export default async function ContractDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getT();
  const locale = await getServerLocale();
  const rows = await db.select().from(contracts).where(eq(contracts.slug, slug)).limit(1);
  const c = rows[0];
  if (!c) notFound();

  const related = await db.select().from(contracts).where(eq(contracts.category, c.category)).then((r) =>
    r.filter((x) => x.slug !== c.slug).slice(0, 3),
  );

  // ترجمهٔ محتوای داینامیک قرارداد (عنوان/توضیح/کاربرد/بندها/ریسک‌ها/مراحل)
  const [cTitle, cDescription, cUseCase, cCategory] = await Promise.all([
    tdyn(locale, c.title, 300),
    tdyn(locale, c.description, 600),
    tdyn(locale, c.useCase, 700),
    tdyn(locale, c.category, 100),
  ]);
  const keyClausesT = await Promise.all(c.keyClauses.map((k) => tdyn(locale, k, 250)));
  const risksT = await Promise.all(c.risks.map((r) => tdyn(locale, r, 350)));
  const stepsT = await Promise.all(c.steps.map((s) => tdyn(locale, s, 250)));
  const relatedT = await Promise.all(related.map(async (r) => ({ ...r, title: await tdyn(locale, r.title, 300) })));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: cTitle,
    serviceType: t("تنظیم قرارداد حقوقی"),
    description: cDescription,
    offers: [
      { "@type": "Offer", name: t("نمونه آماده"), price: c.samplePrice, priceCurrency: "IRR" },
      { "@type": "Offer", name: t("تنظیم اختصاصی"), price: c.customPrice, priceCurrency: "IRR" },
    ],
  };

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-contracts.png"
        badge={cCategory}
        title={cTitle}
        desc={cDescription}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("قراردادها"), href: "/contracts" }, { label: cCategory }]}
      >
        {c.popular && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(230_185_78/0.35)] bg-[rgb(230_185_78/0.14)] px-3 py-1 text-xs font-semibold text-[#eec97b]"><Icon name="star" className="h-3.5 w-3.5" />{t("پرطرفدار")}</span>
        )}
      </PageHero>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="check" className="h-5 w-5 text-success" /> {t("کاربرد")}
            </h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{cUseCase}</p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="document" className="h-5 w-5 text-primary" /> {t("بندهای مهم")}
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {keyClausesT.map((k) => (
                <div key={k} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground-soft">
                  <Icon name="file" className="h-4 w-4 shrink-0 text-primary" /> {k}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="alert" className="h-5 w-5 text-warning" /> {t("ریسک‌ها")}
            </h2>
            <div className="mt-3 space-y-2">
              {risksT.map((r) => (
                <div key={r} className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--warning)_6%,transparent)] px-4 py-3 text-sm text-foreground-soft">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> {r}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="bolt" className="h-5 w-5 text-accent-text" /> {t("مراحل تنظیم")}
            </h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {stepsT.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{faNum(i + 1)}</span>
                  <span className="text-sm font-medium text-foreground">{s}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/40 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Icon name="check" className="h-4 w-4" /></span>
                <span className="text-sm font-bold text-foreground">{t("دریافت نسخه نهایی")}</span>
              </li>
            </ol>
          </section>
        </div>

        {/* Sidebar pricing */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card hover={false}>
            <h3 className="font-bold text-foreground">{t("تعرفه تنظیم")}</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("نمونه آماده")}</p>
                  <p className="text-xs text-muted">{t("قالب استاندارد قابل ویرایش")}</p>
                </div>
                <p className="text-sm font-bold text-foreground">{faPrice(c.samplePrice)}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-soft/50 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("تنظیم اختصاصی")}</p>
                  <p className="text-xs text-muted">{t("توسط وکیل متخصص + بازبینی")}</p>
                </div>
                <p className="text-sm font-bold text-primary">{faPrice(c.customPrice)}</p>
              </div>
            </div>
            <Button href="/consultation/book?subject=" icon="document" className="mt-4 w-full">{t("سفارش تنظیم قرارداد")}</Button>
            <Button href="/ai-assistant?tab=contract" variant="outline" icon="file" className="mt-2 w-full">{t("تحلیل هوشمند این قرارداد")}</Button>
          </Card>
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {t("همه قراردادهای دادورزان توسط وکلای عضو کانون تنظیم و بازبینی می‌شوند و مطابق قوانین روز هستند.")}
            </p>
          </Card>
        </aside>
      </Container>

      {related.length > 0 && (
        <Container className="pb-12">
          <h2 className="text-xl font-bold text-foreground">{t("قراردادهای مرتبط")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {relatedT.map((r) => (
              <a key={r.slug} href={`/contracts/${r.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon name={r.icon as never} className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-bold text-foreground">{r.title}</span>
                <Icon name="chevron" className="h-4 w-4 rotate-180 text-muted" />
              </a>
            ))}
          </div>
        </Container>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
