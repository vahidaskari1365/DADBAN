import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Card, Badge } from "@/components/ui";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icons";
import { PageContentBlocks } from "@/components/page-content-blocks";
import { ForumReplyForm } from "@/components/forum/forum-reply-form";
import { getForumTopic, getForumReplies, bumpForumViews, forumRoleLabel } from "@/lib/cms";
import { getCurrentUser } from "@/lib/user-auth";
import { faNum } from "@/lib/data";
import { relativeTimeJalali, formatJalaliDateTime } from "@/lib/jalali";
import { getT, getServerLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n/core";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const st = makeT(await getServerLocale());
  const topic = await getForumTopic(Number(id)).catch(() => null);
  if (!topic) {
    /* soft-404 هماهنگ با بقیهٔ سایت (knowledge/[slug] و lawyers/[slug] هم همین‌طور) —
       ولی برای سئو صادقانه noindex می‌کنیم تا از ایندکس خارج شود */
    return {
      title: st("موضوع یافت نشد — تالار گفتگو دادورزان"),
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `${topic.title} — ${st("تالار گفتگو دادورزان")}`,
    description: topic.body.slice(0, 160) || st("گفتگوی تالار دادورزان"),
    alternates: { canonical: `/forum/${id}` },
  };
}

/** بج رنگی نقش نویسنده */
function roleTone(role: string): "accent" | "success" | "primary" | "neutral" {
  if (role === "lawyer" || role === "employee") return "primary";
  if (role === "admin" || role === "supervisor" || role === "staff") return "accent";
  if (role === "client") return "success";
  return "neutral";
}

export default async function ForumTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const t = await getT();
  const [topic, replies, user] = await Promise.all([
    getForumTopic(numId),
    getForumReplies(numId),
    getCurrentUser().catch(() => null),
  ]);
  if (!topic) notFound();

  /* بازدید — fire-and-forget؛ خطا صفحه را نمی‌شکند */
  void bumpForumViews(numId);

  return (
    <>
      <PageHero
        title={topic.title}
        desc={undefined}
        breadcrumb={[{ label: t("خانه"), href: "/" }, { label: t("تالار گفتگو"), href: "/forum" }, { label: t("موضوع") }]}
      />

      <Container className="py-8">
        {/* خود موضوع */}
        <Card hover={false} className="border-primary/20" data-testid="forum-topic-detail">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="text-sm font-black text-foreground">{topic.authorName}</span>
            <Badge tone={roleTone(topic.authorRole)}>{t(forumRoleLabel(topic.authorRole))}</Badge>
            <Badge tone="neutral">{t(topic.category)}</Badge>
            <span aria-hidden>·</span>
            <span title={formatJalaliDateTime(topic.createdAt)}>{relativeTimeJalali(topic.createdAt)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Icon name="search" className="h-3.5 w-3.5" />
              {faNum(topic.views)} {t("بازدید")}
            </span>
          </div>
          {topic.body && (
            <p className="mt-3 whitespace-pre-line text-sm leading-8 text-foreground-soft" data-testid="forum-topic-body">
              {topic.body}
            </p>
          )}
          <div className="mt-4">
            <Link href="/forum" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" />
              {t("بازگشت به تالار گفتگو")}
            </Link>
          </div>
        </Card>

        {/* پاسخ‌ها */}
        <h2 className="mt-8 mb-4 flex items-center gap-2 text-base font-black text-foreground" data-testid="forum-replies-count">
          <Icon name="chat" className="h-4 w-4 text-primary" />
          {faNum(replies.length)} {t("پاسخ")}
        </h2>
        {replies.length === 0 ? (
          <Card hover={false} className="p-8 text-center text-sm text-muted">
            {t("هنوز پاسخی نیست — اولین پاسخ را شما بنویسید.")}
          </Card>
        ) : (
          <div className="flex flex-col gap-3" data-testid="forum-replies">
            {replies.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <span className="text-sm font-bold text-foreground-soft">{r.authorName}</span>
                  <Badge tone={roleTone(r.authorRole)}>{t(forumRoleLabel(r.authorRole))}</Badge>
                  <span aria-hidden>·</span>
                  <span title={formatJalaliDateTime(r.createdAt)}>{relativeTimeJalali(r.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground-soft">{r.body}</p>
              </Card>
            ))}
          </div>
        )}

        {/* فرم پاسخ — برای همه */}
        <div className="mt-8">
          <ForumReplyForm topicId={topic.id} loggedIn={!!user} />
        </div>
      </Container>

      <PageContentBlocks page="forum" position="bottom" />
    </>
  );
}
