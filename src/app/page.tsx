import Link from "next/link";
import { Container, SectionHeading, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { HomeHero } from "@/components/home-hero";
import { TrustStrip } from "@/components/home/action-hub";
import { AISpotlight } from "@/components/home/ai-spotlight";
import { InPersonServices, type InPersonService } from "@/components/home/inperson";
import { SiteMenu } from "@/components/home/site-menu";
import { JourneyLine } from "@/components/home/journey";
import { SituationRouter } from "@/components/home/situation-router";
import { TrustLine } from "@/components/amazon/trust-line";
import { CATALOG_SERVICES } from "@/lib/managed-catalog";

// صفحهٔ اول هدفمند دادبان — بدون کوئری دیتابیس؛ محتوای اصلی کاملاً ایستا و سریع است.
// زنجیرهٔ هدفمند: هیرو فانل ← اعتماد ← «مسیر دادبان» ← مسیریاب موضوعی ← دستیار ← خدمات حضوری ← دانش ← CTA

// خدمات حضوری/اداری — از کاتالوگ مدیریت‌شده (فیلتر ADMINISTRATIVE) به‌صورت اسلیم
const IN_PERSON: InPersonService[] = CATALOG_SERVICES.filter(
  (s) => s.category === "ADMINISTRATIVE" && s.active,
).map((s) => ({
  slug: s.slug,
  title: s.title,
  desc: s.shortDescription,
  icon: s.icon,
  basePrice: s.basePrice,
  estimatedTime: s.estimatedTime,
}));
const TOTAL_SERVICES = CATALOG_SERVICES.filter((s) => s.active).length;

// دانش دادبان — سه دروازهٔ کم‌حجم به بخش‌های مرجع
const KNOWLEDGE: { icon: "book" | "chat" | "landmark"; title: string; desc: string; href: string }[] = [
  { icon: "book", title: "مقالات حقوقی", desc: "خلاصه‌های کاربردی به زبان ساده", href: "/knowledge" },
  { icon: "chat", title: "پرسش و پاسخ", desc: "پاسخ وکلای دادبان به پرسش‌های واقعی", href: "/qa" },
  { icon: "landmark", title: "قوانین و آرای قضایی", desc: "متن قوانین و رویهٔ قضایی مرتبط", href: "/laws" },
];

export default function HomePage() {
  return (
    <div className="page-wash">
      <HomeHero />

      {/* نوار اعتماد متحرک — بلافاصله زیر هیرو، باریک */}
      <section className="-mt-6" aria-label="تضمین‌های دادبان">
        <Container>
          <TrustStrip />
        </Container>
      </section>

      {/* مسیر دادبان — چهار گام از مشکل تا نتیجه */}
      <section className="mt-20">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow="چطور کار می‌کند"
              title="از مشکل تا نتیجه، در چهار گام"
              desc="دادبان فقط فهرست خدمات نیست — از لحظهٔ اول تا آخرین گام کنارت است."
            />
          </Reveal>
          <div className="mt-12">
            <JourneyLine />
          </div>
        </Container>
      </section>

      {/* مسیریاب موضوعی — انتخاب موضوع، دریافت پلن کامل */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow="مسیریاب دادبان"
              title="موضوعت را انتخاب کن؛ مسیر کامل آماده است"
              desc="به‌جای گم‌شدن میان خدمات، برای هر موضوع یک مسیر گام‌به‌گام با قیمت و زمان شفاف می‌سازیم."
            />
          </Reveal>
          <div className="mt-10">
            <SituationRouter />
          </div>
        </Container>
      </section>

      {/* اسپات‌لایت سینمایی دستیار هوش مصنوعی */}
      <section className="mt-24">
        <Container>
          <AISpotlight />
        </Container>
      </section>

      {/* خدمات حضوری و اداری */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <SectionHeading
              eyebrow="نمایندهٔ شما در اداره‌ها"
              title="کارهای حضوری، دیگر دردسر نیست"
              desc="از اجرای احکام تا انحصار وراثت — نمایندهٔ دادبان با وکالت‌نامهٔ رسمی به‌جای شما می‌رود."
            />
          </Reveal>
          <div className="mt-10">
            <InPersonServices services={IN_PERSON} totalCount={TOTAL_SERVICES} />
          </div>
        </Container>
      </section>

      {/* دانش دادبان — نوار کم‌حجم سه‌درگاهی */}
      <section className="mt-24">
        <Container>
          <Reveal variant="blur">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black text-foreground">دانش دادبان</h2>
              <span className="text-xs text-muted">رایگان برای همه</span>
            </div>
          </Reveal>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {KNOWLEDGE.map((k, i) => (
              <Reveal key={k.href} delay={i * 70} variant="start">
                <Link
                  href={k.href}
                  className="group flex h-full items-center gap-3.5 rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <Icon name={k.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-foreground">{k.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">{k.desc}</span>
                  </span>
                  <Icon name="arrow" className="h-4 w-4 shrink-0 text-muted transition-all duration-300 group-hover:-translate-x-1 group-hover:text-accent" />
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA پایانی — باریک و تک‌هدفه */}
      <section className="mt-24 pb-8">
        <Container>
          <Reveal variant="blur">
            <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-surface p-8 text-center card-shadow sm:p-10">
              <div className="pointer-events-none absolute inset-0 opacity-50" style={{ background: "linear-gradient(110deg, color-mix(in oklab, var(--primary) 12%, transparent), color-mix(in oklab, var(--accent) 10%, transparent), color-mix(in oklab, var(--primary) 12%, transparent))" }} />
              <div className="relative">
                <h2 className="text-xl font-black text-foreground sm:text-2xl">مسیرت روشن شد؟ اولین گام را همین حالا بردار</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted">
                  اولین پرسش رایگان است — دادبان تا رسیدن به نتیجه کنارت می‌ماند.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button href="/ai-assistant" size="lg" icon="sparkles" className="shadow-[var(--shadow-lift)]">
                    شروع رایگان با دستیار
                  </Button>
                  <Button href="/case/new" size="lg" variant="outline" icon="folder">
                    ثبت پرونده
                  </Button>
                </div>
                <TrustLine className="mt-5" />
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* منوی شناور «همه خدمات» — همبرگری با همهٔ بخش‌های سایت */}
      <SiteMenu />
    </div>
  );
}
