import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["slug", "title", "category", "excerpt", "content", "author", "authorRole"] as const) {
      if (typeof body[k] === "string") patch[k] = body[k].trim();
    }
    if (body.readTime != null) patch.readTime = Number(body.readTime) || 5;
    const [updated] = await db.update(articles).set(patch).where(eq(articles.id, Number(id))).returning();
    return NextResponse.json({ ok: true, article: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await db.delete(articles).where(eq(articles.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
