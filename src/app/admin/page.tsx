import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { lawyers, articles, contracts, qaQuestions, cases, consultations, tickets, pageViews } from "@/db/schema";
import { count, desc, sum } from "drizzle-orm";
import { getAdminSession, hasPerm } from "@/lib/admin-auth";
import { roleLabel } from "@/lib/admin-permissions";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { PageHero } from "@/components/page-hero";
import { getT } from "@/lib/i18n/server";
import { templateT } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

async function getStats() {
  const empty = { value: 0 };
  try {
    const [l, a, c, q, cs, co, t, pv] = await Promise.all([
      db.select({ value: count() }).from(lawyers),
      db.select({ value: count() }).from(articles),
      db.select({ value: count() }).from(contracts),
      db.select({ value: count() }).from(qaQuestions),
      db.select({ value: count() }).from(cases),
      db.select({ value: count() }).from(consultations),
      db.select({ value: count() }).from(tickets),
      db.select({ value: sum(pageViews.views) }).from(pageViews),
    ]);
    return {
      lawyers: l[0]?.value ?? 0,
      articles: a[0]?.value ?? 0,
      contracts: c[0]?.value ?? 0,
      qa: q[0]?.value ?? 0,
      cases: cs[0]?.value ?? 0,
      consultations: co[0]?.value ?? 0,
      tickets: t[0]?.value ?? 0,
      views: Number(pv[0]?.value ?? 0),
    };
  } catch {
    return { lawyers: 0, articles: 0, contracts: 0, qa: 0, cases: 0, consultations: 0, tickets: 0, views: 0 };
  }
}

/** منوی کامل مدیریت — هر آیتم با کلید دسترسی محافظت می‌شود و فقط با اجازه نمایش می‌آید */
const MENU: { label: string; href: string; icon: Parameters<typeof Icon>[0]["name"]; perm: string }[] = [
  { label: "مدیریت مقالات", href: "/admin/articles", icon: "book", perm: "articles" },
  { label: "مقاله جدید", href: "/admin/articles/new", icon: "plus", perm: "articles" },
  { label: "مدیریت وکلا", href: "/admin/lawyers", icon: "badge", perm: "lawyers" },
  { label: "روی‌بوردینگ وکلا", href: "/admin/onboarding", icon: "badge", perm: "lawyers" },
  { label: "احراز هویت وکلا", href: "/admin/verifications", icon: "fingerprint", perm: "lawyers" },
  { label: "مدیریت قراردادها", href: "/admin/contracts", icon: "file", perm: "contracts" },
  { label: "مدیریت پرسش و پاسخ", href: "/admin/qa", icon: "chat", perm: "qa" },
  { label: "درخواست‌های پرسش", href: "/admin/qa-submissions", icon: "chat", perm: "qa" },
  { label: "مدیریت واژه‌نامه حقوقی", href: "/admin/glossary", icon: "book", perm: "knowledge" },
  { label: "مدیریت قوانین", href: "/admin/laws", icon: "scale", perm: "knowledge" },
  { label: "مدیریت آرای قضایی", href: "/admin/judgments", icon: "gavel", perm: "knowledge" },
  { label: "مدیریت فرم‌های حقوقی", href: "/admin/legal-forms", icon: "file", perm: "knowledge" },
  { label: "مدیریت پلن‌های عضویت", href: "/admin/plans", icon: "briefcase", perm: "knowledge" },
  { label: "محتوای صفحات سایت", href: "/admin/content", icon: "document", perm: "content" },
  { label: "تالار گفتگو", href: "/admin/forum", icon: "chat", perm: "forum" },
  { label: "پاسخ‌های تالار گفتگو", href: "/admin/forum/replies", icon: "chat", perm: "forum" },
  { label: "مدیریت پرونده‌ها", href: "/admin/cases", icon: "folder", perm: "cases" },
  { label: "مدیریت مشاوره‌ها", href: "/admin/consultations", icon: "calendar", perm: "consultations" },
  { label: "مدیریت تیکت‌ها", href: "/admin/tickets", icon: "mail", perm: "tickets" },
  { label: "خدمات مدیریت‌شده", href: "/admin/managed-services", icon: "briefcase", perm: "services" },
  { label: "کاربران سایت", href: "/admin/users", icon: "user", perm: "users" },
  { label: "پرداخت‌ها", href: "/admin/payments", icon: "money", perm: "finance" },
  { label: "مالی و تسویه", href: "/admin/finance", icon: "calculator", perm: "finance" },
  { label: "تامین‌کنندگان اعتبار", href: "/admin/providers", icon: "landmark", perm: "finance" },
  { label: "تطبیق هوشمند", href: "/admin/matching", icon: "sparkles", perm: "matching" },
  { label: "تنظیمات پلتفرم", href: "/admin/settings", icon: "shield", perm: "settings" },
  { label: "مدیریت ادمین‌ها و دسترسی‌ها", href: "/admin/admins", icon: "id", perm: "admins" },
  { label: "صندوق ایمیل و خبرنامه", href: "/admin/outbox", icon: "send", perm: "outbox" },
  { label: "مانیتور خطاها", href: "/admin/errors", icon: "alert", perm: "errors" },
  { label: "بازگشت به سایت", href: "/", icon: "home", perm: "" },
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const t = await getT();
  const tf = templateT(t);
  const sp = await searchParams;
  const s = await getStats();
  let recent: { id: number; slug: string; title: string; views: number; publishedAt: Date }[] = [];
  try {
    recent = await db
      .select({ id: articles.id, slug: articles.slug, title: articles.title, views: articles.views, publishedAt: articles.publishedAt })
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(8);
  } catch {
    recent = [];
  }

  const stats = [
    { label: "وکلا", value: s.lawyers, icon: "badge" as const, tone: "primary" as const, href: "/lawyers" },
    { label: "مقالات", value: s.articles, icon: "book" as const, tone: "accent" as const, href: "/knowledge" },
    { label: "قراردادها", value: s.contracts, icon: "file" as const, tone: "success" as const, href: "/contracts" },
    { label: "پرسش و پاسخ", value: s.qa, icon: "chat" as const, tone: "neutral" as const, href: "/qa" },
    { label: "پرونده‌ها", value: s.cases, icon: "folder" as const, tone: "primary" as const, href: "/case/new" },
    { label: "مشاوره‌ها", value: s.consultations, icon: "calendar" as const, tone: "accent" as const, href: "/consultation" },
    { label: "تیکت‌ها", value: s.tickets, icon: "chat" as const, tone: "neutral" as const, href: "/support" },
    { label: "بازدید صفحات", value: s.views, icon: "sparkles" as const, tone: "success" as const, href: "#tracking" },
  ];

  const menu = MENU.filter((m) => !m.perm || hasPerm(session, m.perm));
  const canArticles = hasPerm(session, "articles");

  return (
    <>
      <PageHero
        variant="market"
        image="/images/hero-admin.png"
        badge={t("Admin · پنل مدیریت")}
        title={t("داشبورد مدیریت دادورزان")}
        desc={t("مدیریت محتوا، داده‌های سایت و آمار بازدید — با ورود امن مدیر.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("پنل مدیریت") }]}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
            <Icon name="user" className="h-3.5 w-3.5" />
            {session.name} — {t(roleLabel(session.role))}
          </span>
          {canArticles && <Button href="/admin/articles/new" variant="accent" icon="plus" size="sm">{t("مقاله جدید")}</Button>}
          {canArticles && (
            <Link href="/admin/articles" className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20"><Icon name="book" className="h-3.5 w-3.5" />{t("مدیریت مقالات")}</Link>
          )}
          <Link href="/api/admin/logout" className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-bold text-white transition-colors hover:bg-white/20"><Icon name="x" className="h-3.5 w-3.5" />{t("خروج")}</Link>
        </div>
      </PageHero>
      <Container className="py-12">
        {sp.denied && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive" data-testid="denied-notice">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            {t("به این بخش دسترسی ندارید — با مدیر کل تماس بگیرید.")}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((st) => (
            <Link key={st.label} href={st.href}>
              <Card hover className="flex items-center gap-3">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${st.tone === "primary" ? "bg-primary-soft text-primary" : st.tone === "accent" ? "bg-accent-soft text-accent-text" : st.tone === "success" ? "bg-success/15 text-success" : "bg-surface-2 text-foreground-soft"}`}>
                  <Icon name={st.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xl font-black text-foreground">{faNum(st.value)}</span>
                  <span className="text-xs font-semibold text-foreground-soft">{t(st.label)}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {canArticles ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-foreground">{t("آخرین مقالات")}</h2>
                  <Button href="/admin/articles" variant="ghost" size="sm">{t("همه مقالات")}</Button>
                </div>
                <div className="space-y-3">
                  {recent.length === 0 && <Card hover={false}><p className="text-sm text-foreground-soft">{t("دیتابیس در دسترس نیست یا مقاله‌ای ثبت نشده است.")}</p></Card>}
                  {recent.map((a) => (
                    <Card key={a.id} hover className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{a.title}</p>
                        <p className="mt-0.5 text-xs text-foreground-soft" dir="ltr">/{a.slug}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone="neutral">{tf("{n} بازدید", { n: faNum(a.views) })}</Badge>
                        <Link href={`/admin/articles/${a.id}/edit`} className="text-sm font-semibold text-primary hover:underline">{t("ویرایش")}</Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card hover={false}>
                <div className="flex items-center gap-3 p-2">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Icon name="shield" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{t("خوش آمدید")}</p>
                    <p className="mt-0.5 text-xs text-foreground-soft">
                      {t("شما به بخش‌های محدودشدهٔ منوی «مدیریت سریع» دسترسی دارید — بخش‌های دیگر پنهان شده‌اند.")}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div id="tracking">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground">{t("مدیریت سریع")}</h2>
            </div>
            <div className="max-h-[32rem] space-y-3 overflow-y-auto pl-1 [scrollbar-width:thin]" data-testid="admin-menu">
              {menu.map((m) => (
                <Link key={m.label + m.href} href={m.href}>
                  <Card hover className="flex items-center gap-3">
                    <Icon name={m.icon} className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">{t(m.label)}</span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
