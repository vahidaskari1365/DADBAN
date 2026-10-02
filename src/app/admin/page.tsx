import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { lawyers, articles, contracts, qaQuestions, cases, consultations, tickets, pageViews } from "@/db/schema";
import { count, desc, sum } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
import { Container, Card, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import { PageHero } from "@/components/page-hero";

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

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
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

  return (
    <>
      <PageHero
        badge="Admin · پنل مدیریت"
        title="داشبورد مدیریت دادبان"
        desc="مدیریت محتوا، داده‌های سایت و آمار بازدید — با ورود امن مدیر."
        breadcrumb={[{ label: "خانه", href: "/" }, { label: "پنل مدیریت" }]}
      >
        <div className="flex flex-wrap gap-2">
          <Button href="/admin/articles/new" variant="primary" icon="plus" size="sm">مقاله جدید</Button>
          <Button href="/admin/articles" variant="outline" icon="book" size="sm">مدیریت مقالات</Button>
          <Button href="/api/admin/logout" variant="ghost" icon="x" size="sm">خروج</Button>
        </div>
      </PageHero>
      <Container className="py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((st) => (
            <Link key={st.label} href={st.href}>
              <Card hover className="flex items-center gap-3">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${st.tone === "primary" ? "bg-primary-soft text-primary" : st.tone === "accent" ? "bg-accent-soft text-accent" : st.tone === "success" ? "bg-success/15 text-success" : "bg-surface-2 text-foreground-soft"}`}>
                  <Icon name={st.icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xl font-black text-foreground">{faNum(st.value)}</span>
                  <span className="text-xs font-semibold text-foreground-soft">{st.label}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground">آخرین مقالات</h2>
              <Button href="/admin/articles" variant="ghost" size="sm">همه مقالات</Button>
            </div>
            <div className="space-y-3">
              {recent.length === 0 && <Card hover={false}><p className="text-sm text-foreground-soft">دیتابیس در دسترس نیست یا مقاله‌ای ثبت نشده است.</p></Card>}
              {recent.map((a) => (
                <Card key={a.id} hover className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{a.title}</p>
                    <p className="mt-0.5 text-xs text-foreground-soft" dir="ltr">/{a.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="neutral">{faNum(a.views)} بازدید</Badge>
                    <Link href={`/admin/articles/${a.id}/edit`} className="text-sm font-semibold text-primary hover:underline">ویرایش</Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div id="tracking">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-foreground">مدیریت سریع</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "مدیریت مقالات", href: "/admin/articles", icon: "book" as const },
                { label: "مقاله جدید", href: "/admin/articles/new", icon: "plus" as const },
                { label: "مدیریت وکلا", href: "/admin/lawyers", icon: "badge" as const },
                { label: "مدیریت قراردادها", href: "/admin/contracts", icon: "file" as const },
                { label: "مدیریت پرسش و پاسخ", href: "/admin/qa", icon: "chat" as const },
                { label: "مدیریت پرونده‌ها", href: "/admin/cases", icon: "folder" as const },
                { label: "مدیریت مشاوره‌ها", href: "/admin/consultations", icon: "calendar" as const },
                { label: "مدیریت تیکت‌ها", href: "/admin/tickets", icon: "mail" as const },
                { label: "بازگشت به سایت", href: "/", icon: "home" as const },
              ].map((m) => (
                <Link key={m.label + m.href} href={m.href}>
                  <Card hover className="flex items-center gap-3">
                    <Icon name={m.icon} className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">{m.label}</span>
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
