import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { Container, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { tdyn } from "@/lib/i18n/dynamic";
import { LAWS } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("مرکز قوانین"),
    description: t("جستجو و مطالعه‌ی قوانین ایران: قانون مدنی، حمایت خانواده، تجارت، مجازات اسلامی، کار و آیین‌های دادرسی."),
    alternates: { canonical: "/laws" },
  };
}

export default async function LawsPage() {
  const t = await getT();
  const locale = await getServerLocale();

  // ترجمهٔ عنوان/توضیح قوانین برای زبان غیرفارسی (موازی، با کش) — متن مواد رسمی و verbatim می‌ماند
  const laws = await Promise.all(
    LAWS.map(async (l) => {
      if (locale === "fa") return l;
      const [name, summary, authority, ...subjects] = await Promise.all([
        tdyn(locale, l.name, 300),
        tdyn(locale, l.summary, 700),
        tdyn(locale, l.authority, 200),
        ...l.subjects.map((s) => tdyn(locale, s, 200)),
      ]);
      return { ...l, name, summary, authority, subjects };
    }),
  );

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-laws.png"
        badge={t("مرکز قوانین")}
        title={t("قوانین و مقررات، در دسترس شما")}
        desc={t("مهم‌ترین قوانین کشور را جستجو و مطالعه کنید؛ همراه با موضوعات مرتبط و خلاصه‌ی کاربردی.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("قوانین") }]}
      />
      <Container className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {laws.map((l, i) => (
            <Reveal key={l.slug} delay={(i % 6) * 40}>
              <Link href={`/laws/${l.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 card-shadow transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="landmark" className="h-5 w-5" /></span>
                  {/* منطق tone روی مقدار اصلی status است؛ فقط نمایش ترجمه می‌شود */}
                  <Badge tone={l.status === "معتبر" ? "success" : "accent"}>{t(l.status)}</Badge>
                </div>
                <h2 className="mt-3 text-base font-bold text-foreground">{l.name}</h2>
                <p className="mt-1 flex-1 text-xs leading-6 text-muted">{l.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {l.subjects.slice(0, 3).map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
                </div>
                <p className="mt-3 text-[11px] text-muted">{t("تصویب {year} • {authority}").replace("{year}", l.year).replace("{authority}", l.authority)}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  );
}
