import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { permDenied } from "@/lib/admin-guard";
import { submitIndexNow } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const _denied = await permDenied("articles"); if (_denied) return _denied;
  const { id } = await params;
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["slug", "title", "category", "excerpt", "content", "author", "authorRole"] as const) {
      if (typeof body[k] === "string") patch[k] = body[k].trim();
    }
    if (body.readTime != null) patch.readTime = Number(body.readTime) || 5;
    // هر ویرایش تحریریه = بازبینی جدید — تاریخ واقعی برای dateModified (E-E-A-T)
    patch.updatedAt = new Date();
    const [updated] = await db.update(articles).set(patch).where(eq(articles.id, Number(id))).returning();

    // اطلاع‌رسانی فوری به IndexNow — بهترین تلاش؛ خطای آن جریان ویرایش را نمی‌شکند
    let indexnow: { ok: boolean; status?: number; submitted: number } | null = null;
    if (updated?.slug) {
      try {
        const res = await submitIndexNow([`/knowledge/${updated.slug}`, "/knowledge"]);
        indexnow = { ok: res.ok, status: res.status, submitted: res.submitted };
      } catch {
        indexnow = null;
      }
    }

    return NextResponse.json({ ok: true, article: updated, indexnow });
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const _denied = await permDenied("articles"); if (_denied) return _denied;
  const { id } = await params;
  try {
    await db.delete(articles).where(eq(articles.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
