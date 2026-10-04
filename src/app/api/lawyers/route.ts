import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const featuredOnly = url.searchParams.get("featured");
  const sp = url.searchParams.get("sp");

  const conds = [];
  if (featuredOnly) conds.push(eq(lawyers.featured, true));
  if (sp) conds.push(sql`${lawyers.specialties} @> ARRAY[${sp}]::text[]`);

  const rows = await db
    .select({
      slug: lawyers.slug,
      name: lawyers.name,
      city: lawyers.city,
      specialties: lawyers.specialties,
      rating: lawyers.rating,
      photoUrl: lawyers.photoUrl,
      avatarColor: lawyers.avatarColor,
      verified: lawyers.verified,
      experienceYears: lawyers.experienceYears,
    })
    .from(lawyers)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(lawyers.name);

  return NextResponse.json({ ok: true, lawyers: rows });
}
