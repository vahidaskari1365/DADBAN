import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { media } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { ensureCmsSchema } from "@/lib/auto-seed";
import { desc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * مدیریت رسانه‌های اپلودی ادمین — لیستِ سبک (بدون محتوای base64) و حذف.
 * GET  /api/admin/media  → { ok, rows: [{id, filename, mime, size, url, createdAt}] }
 * DELETE /api/admin/media?id=N
 */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: true, rows: [] });
  try {
    await ensureCmsSchema();
    const rows = await db
      .select({
        id: media.id,
        filename: media.filename,
        mime: media.mime,
        size: media.size,
        createdAt: media.createdAt,
      })
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(200);
    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({ ...r, url: `/api/media/${r.id}` })),
    });
  } catch {
    return NextResponse.json({ ok: true, rows: [] });
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  try {
    await db.delete(media).where(eq(media.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "delete failed" }, { status: 500 });
  }
}
