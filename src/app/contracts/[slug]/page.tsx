import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Container, Button, Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let c: typeof contracts.$inferSelect | undefined;
  try {
    const rows = await db.select().from(contracts).where(eq(contracts.slug, slug)).limit(1);
    c = rows[0];
  } catch (err) {
    console.error("[dadban] contract metadata query failed:", err);
  }
  if (!c) return { title: "قرارداد یافت نشد" };
  return {
    title: `تنظیم ${c.title}`,
    description: `${c.description} کاربرد، بندهای مهم، ریسک‌ها و قیمت تنظیم. سفارش تنظیم اختصاصی توسط وکیل.`,
    alternates: { canonical: `/contracts/${slug}` },
  };
}

export default async function ContractDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rows = await db.select().from(contracts).where(eq(contracts.slug, slug)).limit(1);
  const c = rows[0];
  if (!c) notFound();

  const related = await db.select().from(contracts).where(eq(contracts.category, c.category)).then((r) =>
    r.filter((x) => x.slug !== c.slug).slice(0, 3),
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: c.title,
    serviceType: "تنظیم قرارداد حقوقی",
    description: c.description,
    offers: [
      { "@type": "Offer", name: "نمونه آماده", price: c.samplePrice, priceCurrency: "IRR" },
      { "@type": "Offer", name: "تنظیم اختصاصی", price: c.customPrice, priceCurrency: "IRR" },
    ],
  };

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">خانه</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <Link href="/contracts" className="hover:text-primary">قراردادها</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">{c.category}</span>
          </nav>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Icon name={c.icon as never} className="h-7 w-7" />
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{c.category}</Badge>
                {c.popular && <Badge tone="accent" icon="star">پرطرفدار</Badge>}
              </div>
              <h1 className="mt-2 text-2xl font-extrabold text-foreground sm:text-3xl">{c.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">{c.description}</p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="check" className="h-5 w-5 text-success" /> کاربرد
            </h2>
            <p className="mt-3 text-sm leading-8 text-foreground-soft">{c.useCase}</p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="document" className="h-5 w-5 text-primary" /> بندهای مهم
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {c.keyClauses.map((k) => (
                <div key={k} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground-soft">
                  <Icon name="file" className="h-4 w-4 shrink-0 text-primary" /> {k}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="alert" className="h-5 w-5 text-warning" /> ریسک‌ها
            </h2>
            <div className="mt-3 space-y-2">
              {c.risks.map((r) => (
                <div key={r} className="flex items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--warning)_30%,transparent)] bg-[color-mix(in_oklab,var(--warning)_6%,transparent)] px-4 py-3 text-sm text-foreground-soft">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> {r}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Icon name="bolt" className="h-5 w-5 text-accent" /> مراحل تنظیم
            </h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2">
              {c.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{faNum(i + 1)}</span>
                  <span className="text-sm font-medium text-foreground">{s}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/40 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Icon name="check" className="h-4 w-4" /></span>
                <span className="text-sm font-bold text-foreground">دریافت نسخه نهایی</span>
              </li>
            </ol>
          </section>
        </div>

        {/* Sidebar pricing */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card hover={false}>
            <h3 className="font-bold text-foreground">تعرفه تنظیم</h3>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">نمونه آماده</p>
                  <p className="text-xs text-muted">قالب استاندارد قابل ویرایش</p>
                </div>
                <p className="text-sm font-bold text-foreground">{faPrice(c.samplePrice)}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary-soft/50 p-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">تنظیم اختصاصی</p>
                  <p className="text-xs text-muted">توسط وکیل متخصص + بازبینی</p>
                </div>
                <p className="text-sm font-bold text-primary">{faPrice(c.customPrice)}</p>
              </div>
            </div>
            <Button href="/consultation?subject=" icon="document" className="mt-4 w-full">سفارش تنظیم قرارداد</Button>
            <Button href="/ai-assistant?tab=contract" variant="outline" icon="file" className="mt-2 w-full">تحلیل هوشمند این قرارداد</Button>
          </Card>
          <Card hover={false} className="bg-primary-soft/50">
            <p className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
              <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              همه قراردادهای دادبان توسط وکلای عضو کانون تنظیم و بازبینی می‌شوند و مطابق قوانین روز هستند.
            </p>
          </Card>
        </aside>
      </Container>

      {related.length > 0 && (
        <Container className="pb-12">
          <h2 className="text-xl font-bold text-foreground">قراردادهای مرتبط</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
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
