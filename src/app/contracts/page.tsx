import type { Metadata } from "next";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { Container, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";
import { CONTRACT_CATEGORIES, faPrice } from "@/lib/data";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("کتابخانه قراردادها و سندهای حقوقی"),
    description: t("قراردادهای آماده و قابل تنظیم: اجاره، خرید و فروش، مشارکت، استخدام، NDA، سرمایه‌گذاری، دادخواست، شکواییه و اظهارنامه. با امکان سفارش تنظیم اختصاصی."),
    alternates: { canonical: "/contracts" },
  };
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>;
}) {
  const { cat, q } = await searchParams;
  const t = await getT();
  const locale = await getServerLocale();
  let all: typeof contracts.$inferSelect[] = [];
  try {
    all = await db.select().from(contracts).orderBy(contracts.title);
  } catch (err) {
    console.error("[dadban] contracts list query failed:", err);
  }

  // فیلتر روی مقادیر اصلی فارسی (منطبق DB) — سپس ترجمهٔ نمایشی ردیف‌ها
  let list = all;
  if (cat) list = list.filter((c) => c.category === cat);
  if (q) {
    const needle = q.trim();
    list = list.filter(
      (c) => c.title.includes(needle) || c.description.includes(needle) || c.category.includes(needle),
    );
  }

  // ترجمهٔ محتوای داینامیک: چیپ دسته‌ها + عنوان/توضیح هر قرارداد
  const [chipsT, listT] = await Promise.all([
    Promise.all(CONTRACT_CATEGORIES.map((c) => tdyn(locale, c, 100))),
    Promise.all(
      list.map(async (c) => ({
        ...c,
        title: await tdyn(locale, c.title, 300),
        description: await tdyn(locale, c.description, 600),
      })),
    ),
  ]);

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-surface-2/60 to-background py-8">
        <Container>
          <nav className="flex items-center gap-1.5 text-xs text-muted">
            <Link href="/" className="hover:text-primary">{t("خانه")}</Link>
            <Icon name="chevron" className="h-3 w-3 rotate-180" />
            <span className="text-foreground-soft">{t("کتابخانه قراردادها")}</span>
          </nav>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">{t("کتابخانه قراردادها و سندهای حقوقی")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            {t("قراردادهای آماده و قابل تنظیم را انتخاب کنید؛ فرم را پر کنید، سیستم سند را تولید می‌کند و در صورت نیاز وکیل آن را بازبینی می‌کند.")}
          </p>
        </Container>
      </section>

      <Container className="py-8">
        {/* Category filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/contracts"
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${!cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground-soft hover:bg-surface-2"}`}
          >
            {t("همه")}
          </Link>
          {CONTRACT_CATEGORIES.map((c, i) => (
            <Link
              key={c}
              href={`/contracts?cat=${encodeURIComponent(c)}`}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground-soft hover:bg-surface-2"}`}
            >
              {chipsT[i]}
            </Link>
          ))}
        </div>

        {listT.length === 0 ? (
          <EmptyState
          title={t("قراردادی با این فیلتر یافت نشد")}
          icon="document"
          desc={t("فیلتر دیگری را امتحان کنید یا قالب سفارشی خود را با قراردادساز بسازید.")}
          action={{ href: "/contracts/builder", label: t("ساخت قرارداد با قراردادساز") }}
        />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listT.map((c) => (
              <Link
                key={c.slug}
                href={`/contracts/${c.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
                    <Icon name={c.icon as never} className="h-5 w-5" />
                  </span>
                  {c.popular && <Badge tone="accent" icon="star">{t("پرطرفدار")}</Badge>}
                </div>
                <h3 className="mt-4 text-base font-bold leading-7 text-foreground">{c.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm leading-6 text-muted">{c.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-[11px] text-muted">{t("نمونه آماده از")}</p>
                    <p className="text-sm font-bold text-foreground">{faPrice(c.samplePrice)}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    {t("تنظیم قرارداد")}
                    <Icon name="arrow" className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>

      {/* Info band */}
      <Container className="py-8">
        <div className="grid gap-4 rounded-3xl border border-border bg-surface p-6 card-shadow sm:grid-cols-3 sm:p-8">
          {[
            { icon: "document", title: "فرم مرحله‌به‌مرحله", desc: "اطلاعات را پر کنید، سند تولید می‌شود." },
            { icon: "user", title: "بازبینی توسط وکیل", desc: "قرارداد توسط وکیل متخصص بررسی می‌شود." },
            { icon: "lock", title: "نسخه نهایی محرمانه", desc: "دریافت نسخه نهایی و امن قرارداد." },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                <Icon name={f.icon as never} className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{t(f.title)}</p>
                <p className="text-xs text-muted">{t(f.desc)}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
