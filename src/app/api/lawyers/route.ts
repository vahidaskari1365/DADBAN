import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const featuredOnly = url.searchParams.get("featured");

  const rows = await db
    .select({
      slug: lawyers.slug,
      name: lawyers.name,
      city: lawyers.city,
      specialties: lawyers.specialties,
    })
    .from(lawyers)
    .where(featuredOnly ? eq(lawyers.featured, true) : undefined)
    .orderBy(lawyers.name);

  return NextResponse.json({ ok: true, lawyers: rows });
}
