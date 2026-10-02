import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { desc } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const rows = await db.select().from(articles).orderBy(desc(articles.publishedAt));
    return NextResponse.json({ ok: true, articles: rows });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const row = {
      slug: String(body.slug ?? "").trim(),
      title: String(body.title ?? "").trim(),
      category: String(body.category ?? "آموزش").trim(),
      excerpt: String(body.excerpt ?? "").trim(),
      content: String(body.content ?? ""),
      readTime: Number(body.readTime) || 5,
      author: String(body.author ?? "تیم تحریریه دادبان").trim(),
      authorRole: String(body.authorRole ?? "پژوهشگر حقوق").trim(),
    };
    if (!row.slug || !row.title || !row.content) {
      return NextResponse.json({ ok: false, error: "slug, title و content الزامی است" }, { status: 400 });
    }
    const [created] = await db.insert(articles).values(row).returning();
    return NextResponse.json({ ok: true, article: created });
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
