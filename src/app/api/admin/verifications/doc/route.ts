import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyerVerifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/verifications/doc?id=…&kind=license|idcard|degree
 * دانلود/نمایش مدرک برای مدیر سایت — با سشن ادمین محافظت می‌شود.
 * تصویر/PDF به‌صورت inline (نمایش در تب) و بقیه attachment؛ همیشه nosniff + no-store.
 */
const KINDS = {
  license: { name: "licenseName", mime: "licenseMime", data: "licenseData" },
  idcard: { name: "idName", mime: "idMime", data: "idData" },
  degree: { name: "degreeName", mime: "degreeMime", data: "degreeData" },
} as const;

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  const kindParam = url.searchParams.get("kind") ?? "";
  if (!id || !(kindParam in KINDS)) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  const kind = KINDS[kindParam as keyof typeof KINDS];

  try {
    const rows = await db
      .select({
        name: lawyerVerifications[kind.name],
        mime: lawyerVerifications[kind.mime],
        data: lawyerVerifications[kind.data],
      })
      .from(lawyerVerifications)
      .where(eq(lawyerVerifications.id, id))
      .limit(1);
    const row = rows[0];
    if (!row?.data) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

    const mime = row.mime && /^[a-z]+\/[a-z0-9.+-]+$/i.test(row.mime) ? row.mime : "application/octet-stream";
    const inline = mime === "application/pdf" || mime.startsWith("image/");
    const safeName = (row.name || `document-${id}`).replace(/[\r\n"\\]/g, "_");
    const body = new Uint8Array(row.data);
    return new Response(body, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="doc-${id}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}
