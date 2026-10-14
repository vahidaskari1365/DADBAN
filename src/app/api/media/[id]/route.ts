import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { media } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/media/[id] — سرو عمومی تصاویر آپلودی ادمین.
 * - Content-Type واقعی از دیتابیس (نه از ورودی کاربر)
 * - X-Content-Type-Options: nosniff
 * - Cache immutable: id یکتاست و محتوا هرگز تغییر نمی‌کند.
 * - 404 صادقانه در نبود رکورد.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0 || numId > 2_147_483_647) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  if (!isDbConfigured()) return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });

  try {
    const rows = await db.select({ mime: media.mime, data: media.data }).from(media).where(eq(media.id, numId)).limit(1);
    const row = rows[0];
    if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    const buf = Buffer.from(row.data, "base64");
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": row.mime,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}
