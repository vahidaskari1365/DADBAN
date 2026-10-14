import type { Metadata } from "next";
import Link from "next/link";
import { Container, Card, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { PageContentBlocks } from "@/components/page-content-blocks";
import { ForumComposer } from "@/components/forum/forum-composer";
import { getForumTopics, FORUM_CATEGORIES, forumRoleLabel } from "@/lib/cms";
import { getCurrentUser } from "@/lib/user-auth";
import { faNum } from "@/lib/data";
import { relativeTimeJalali } from "@/lib/jalali";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const st = makeT(await getServerLocale());
  return {
    title: st("تالار گفتگو دادورزان"),
    description: st(
      "تالار گفتگو برای همه — پرسش حقوقی، تجربه‌ها، نظرها و گفتگوی آزاد؛ کاربران و وکلا و مهمان‌ها همه می‌توانند بنویسند.",
    ),
    alternates: { canonical: "/forum" },
  };
}

/** بج رنگی نقش نویسنده */
function roleTone(role: string): "accent" | "success" | "primary" | "neutral" {
  if (role === "lawyer" || role === "employee") return "primary";
  if (role === "admin" || role === "supervisor" || role === "staff") return "accent";
  if (role === "client") return "success";
  return "neutral";
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const t = await getT();
  const { cat } = await searchParams;
  const category = cat && FORUM_CATEGORIES.includes(cat) ? cat : undefined;
  const [topics, user] = await Promise.all([
    getForumTopics(category, 60),
    getCurrentUser().catch(() => null),
  ]);

  const totalReplies = topics.reduce((s, x) => s + x.replyCount, 0);

  return (
    <>
      <PageHero
        title={t("تالار گفتگو")}
        desc={t("جای همه‌چیز و همه‌کس — پرسش حقوقی، تجربه، نظر و گفتگوی آزاد؛ بدون نیاز به ثبت‌نام بنویسید.")}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("تالار گفتگو") }]}
        chips={[
          { icon: "chat", label: t("برای همه") },
          { icon: "shield", label: t("با مدیریت ادمین") },
        ]}
      />

      <PageContentBlocks page="forum" position="top" />

      <Container className="py-8">
        {/* دسته‌ها */}
        <nav aria-label={t("دسته‌های تالار گفتگو")} className="mb-6 flex flex-wrap gap-2" data-testid="forum-cats">
          <Link
            href="/forum"
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition ${
              !category ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-foreground-soft hover:bg-surface-2"
            }`}
          >
            <Icon name="home" className="h-3.5 w-3.5" />
            {t("همه")}
          </Link>
          {FORUM_CATEGORIES.map((c) => (
            <Link
              key={c}
              href={`/forum?cat=${encodeURIComponent(c)}`}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition ${
                category === c ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-foreground-soft hover:bg-surface-2"
              }`}
            >
              {t(c)}
            </Link>
          ))}
        </nav>

        {/* فرم موضوع جدید — برای همه */}
        <div className="mb-8">
          <ForumComposer categories={FORUM_CATEGORIES} me={user ? { name: user.name, role: user.role } : null} />
        </div>

        {/* آمار کوچک */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge tone="neutral">{tfTopics(topics.length, t)}</Badge>
          <Badge tone="neutral">{tfReplies(totalReplies, t)}</Badge>
          {category && <Badge tone="primary">{t(category)}</Badge>}
        </div>

        {/* فهرست موضوع‌ها */}
        {topics.length === 0 ? (
          <Card hover={false} className="p-10 text-center" data-testid="forum-empty">
            <Icon name="chat" className="mx-auto h-10 w-10 text-muted opacity-50" />
            <p className="mt-3 text-sm font-black text-foreground">{t("هنوز موضوعی در این دسته نیست")}</p>
            <p className="mt-1 text-xs text-muted">{t("اولین نفر باشید — با دکمهٔ «موضوع جدید» گفتگو را شروع کنید.")}</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3" data-testid="forum-topics">
            {topics.map((topic) => (
              <Link key={topic.id} href={`/forum/${topic.id}`} className="block" data-testid="forum-topic-card">
                <Card className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-black text-foreground">
                      {topic.pinned ? <span title={t("سنجاق‌شده")} aria-label={t("سنجاق‌شده")}>📌</span> : null}
                      <span className="line-clamp-2">{topic.title}</span>
                    </p>
                    {topic.body && (
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted">{topic.body}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="font-bold text-foreground-soft">{topic.authorName}</span>
                      <Badge tone={roleTone(topic.authorRole)}>{t(forumRoleLabel(topic.authorRole))}</Badge>
                      <Badge tone="neutral">{t(topic.category)}</Badge>
                      <span aria-hidden>·</span>
                      <span>{relativeTimeJalali(topic.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="chat" className="h-3.5 w-3.5" />
                      {faNum(topic.replyCount)} {t("پاسخ")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="search" className="h-3.5 w-3.5" />
                      {faNum(topic.views)} {t("بازدید")}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-6 flex items-center gap-1.5 text-[11px] leading-6 text-muted">
          <Icon name="shield" className="h-3.5 w-3.5 shrink-0 text-success" />
          {t("قواعد تالار: احترام به همه، بدون اطلاعات شخصی حساس (کد ملی، آدرس). نوشته‌های نامناسب توسط مدیر پنهان می‌شود.")}
        </p>
      </Container>

      <PageContentBlocks page="forum" position="bottom" />
    </>
  );
}

/* ---- helperهای کوچک محلی ---- */
function tfTopics(n: number, t: (s: string) => string): string {
  return `${faNum(n)} ${t("موضوع")}`;
}
function tfReplies(n: number, t: (s: string) => string): string {
  return `${faNum(n)} ${t("پاسخ")}`;
}
