import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc } from "drizzle-orm";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";

/**
 * RSS 2.0 Feed برای مقالات حقوقی.
 * آدرس: /knowledge/feed
 * کاربرد: خبرخوان‌ها، شبکه‌های اجتماعی، و syndication محتوا.
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600; // هر ساعت refresh

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  let recentArticles: typeof articles.$inferSelect[] = [];
  try {
    recentArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(20);
  } catch {
    /* degrade gracefully */
  }

  const pubDate = new Date().toUTCString();
  const lastBuildDate = recentArticles[0]?.publishedAt
    ? new Date(recentArticles[0].publishedAt).toUTCString()
    : pubDate;

  const items = recentArticles
    .map((a) => {
      const url = `${SITE_URL}/knowledge/${a.slug}`;
      const date = new Date(a.publishedAt).toUTCString();
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.excerpt)}</description>
      <category>${escapeXml(a.category)}</category>
      <author>${escapeXml(a.author)} (${escapeXml(a.authorRole)})</author>
      <pubDate>${date}</pubDate>
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)} — مقالات حقوقی</title>
    <link>${SITE_URL}/knowledge</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>fa-IR</language>
    <pubDate>${pubDate}</pubDate>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>dadpayo</generator>
    <atom:link href="${SITE_URL}/knowledge/feed" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/icon-512.png</url>
      <title>${escapeXml(SITE_NAME)}</title>
      <link>${SITE_URL}</link>
      <width>512</width>
      <height>512</height>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
