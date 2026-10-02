import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Reveal } from "@/components/reveal";
import { faNum } from "@/lib/data";

export const metadata: Metadata = { title: "مرکز اعلان‌ها" };

const NOTIFS = [
  { icon: "calendar" as const, title: "جلسه دادگاه فردا", desc: "پرونده طلاق — ساعت ۱۰:۰۰", time: "۱۰ دقیقه پیش", unread: true, tone: "primary" as const },
  { icon: "chat" as const, title: "پیام جدید از وکیل", desc: "دکتر سهراب محمدی: مدارک دریافت شد.", time: "۱ ساعت پیش", unread: true, tone: "accent" as const },
  { icon: "clock" as const, title: "مهلت تجدیدنظر نزدیک است", desc: "۳ روز تا پایان مهلت", time: "۳ ساعت پیش", unread: true, tone: "danger" as const },
  { icon: "document" as const, title: "سند جدید", desc: "قرارداد اجاره آماده شد.", time: "دیروز", unread: false, tone: "success" as const },
  { icon: "money" as const, title: "پرداخت موفق", desc: "مشاوره ۳۰ دقیقه‌ای پرداخت شد.", time: "۲ روز پیش", unread: false, tone: "neutral" as const },
  { icon: "folder" as const, title: "به‌روزرسانی پرونده", desc: "وضعیت پرونده ۱۲۵۸ تغییر کرد.", time: "۳ روز پیش", unread: false, tone: "neutral" as const },
];

export default function NotificationsPage() {
  return (
    <>
      <PageHero
        title="مرکز اعلان‌ها"
        desc="جدیدترین اعلان‌های پرونده، مشاوره، پیام‌ها و مهلت‌های شما."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "اعلان‌ها" }]}
      />
      <Container className="py-10">
        <div className="space-y-3">
          {NOTIFS.map((n, i) => (
            <Reveal key={i} delay={i * 30}>
              <div className={`flex items-start gap-3 rounded-2xl border bg-surface p-4 card-shadow ${n.unread ? "border-primary/30" : "border-border"}`}>
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  n.tone === "primary" ? "bg-primary-soft text-primary" :
                  n.tone === "accent" ? "bg-accent-soft text-accent" :
                  n.tone === "danger" ? "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger" :
                  n.tone === "success" ? "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success" : "bg-surface-2 text-foreground-soft"
                }`}>
                  <Icon name={n.icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{n.title}</p>
                    {n.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted">{n.desc}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">{n.time}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted">{faNum(NOTIFS.length)} اعلان</p>
      </Container>
    </>
  );
}
