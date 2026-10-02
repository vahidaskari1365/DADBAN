import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { ERD_DOMAINS, ERD_STATS } from "@/lib/erd";
import { faNum } from "@/lib/data";

export const metadata: Metadata = {
  title: "نقشه‌ی دیتابیس (ERD) — معماری دادبان",
  description: "ERD کامل دیتابیس دادبان: جداول، ستون‌ها، کلیدها، ایندکس‌ها، Enum و روابط 1:N و N:M در ۱۳ دامنه.",
  alternates: { canonical: "/developer" },
};

export default function DeveloperPage() {
  return (
    <>
      <PageHero
        badge="Developer · Data Model"
        title="نقشه‌ی دیتابیس (ERD)"
        desc="معماری ماژولار دیتابیس دادبان در ۱۳ دامنه‌ی مستقل — طرح‌نامه‌ی واقعی PostgreSQL با کلیدها، ایندکس‌ها و روابط. مبنای توسعه‌ی NestJS + Prisma/Drizzle."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "نقشه‌ی دیتابیس" }]}
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{faNum(ERD_STATS.tables)} جدول</Badge>
          <Badge tone="accent">{faNum(ERD_STATS.domains)} دامنه</Badge>
          <Badge tone="success">{faNum(ERD_STATS.enums)} Enum</Badge>
          <Badge tone="neutral">schema: core</Badge>
        </div>
      </PageHero>

      <Container className="py-12">
        <div className="space-y-10">
          {ERD_DOMAINS.map((domain, di) => (
            <Reveal key={domain.group} delay={di * 30}>
              <section>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: domain.color }}>
                    <Icon name={domain.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{domain.group}</h2>
                    <p className="text-xs text-muted">{faNum(domain.tables.length)} جدول</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {domain.tables.map((t) => (
                    <div key={t.name} className="overflow-hidden rounded-2xl border border-border bg-surface card-shadow">
                      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3">
                        <h3 className="font-mono text-sm font-bold text-foreground" dir="ltr">{t.name}</h3>
                        {t.relation && <Badge tone="accent">{t.relation}</Badge>}
                      </div>
                      <div className="p-4">
                        <p className="mb-3 text-xs leading-5 text-muted">{t.desc}</p>
                        <div className="space-y-1">
                          {t.columns.map((c) => (
                            <div key={c.name} className="flex items-center gap-2 text-xs">
                              {c.pk ? (
                                <span className="font-mono text-[10px] font-bold text-accent">PK</span>
                              ) : c.fk ? (
                                <span className="font-mono text-[10px] font-bold text-primary">FK</span>
                              ) : (
                                <span className="w-4" />
                              )}
                              <span className="font-mono text-foreground-soft" dir="ltr">{c.name}</span>
                              <span className="text-muted-soft">: {c.type}</span>
                              {c.note && <span className="text-[10px] text-accent">({c.note})</span>}
                              {c.fk && <span className="text-[10px] text-primary">→ {c.fk}</span>}
                            </div>
                          ))}
                        </div>
                        {t.indexes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                            {t.indexes.map((idx) => (
                              <span key={idx} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted" dir="ltr">{idx}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>

        <div className="mt-12">
          <Card hover={false} className="bg-primary-soft/50">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><Icon name="landmark" className="h-4 w-4 text-primary" /> سه ستون طراحی</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { t: "Data Model", d: "چه داده‌ای و با چه رابطه‌ای ذخیره می‌شود." },
                { t: "Authorization Model", d: "RBAC + دسترسی مبتنی بر عضویت در پرونده." },
                { t: "Audit Trail", d: "ردیابی کامل عملیات روی پرونده و سند." },
              ].map((x) => (
                <div key={x.t} className="rounded-xl border border-border bg-surface p-3"><p className="text-sm font-bold text-foreground">{x.t}</p><p className="mt-1 text-xs leading-5 text-muted">{x.d}</p></div>
              ))}
            </div>
          </Card>
        </div>
      </Container>
    </>
  );
}
