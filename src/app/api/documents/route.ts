import { NextResponse } from "next/server";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const rows = await db.select().from(documents).where(eq(documents.userPhone, user.phone)).orderBy(desc(documents.createdAt));
    return NextResponse.json({ ok: true, documents: rows });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: { name?: string; type?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "نام سند الزامی است" }, { status: 422 });
  try {
    const [doc] = await db
      .insert(documents)
      .values({ userPhone: user.phone, name, type: String(body.type ?? "مدرک").trim() || "مدرک", size: Number(body.size ?? 0) })
      .returning({ id: documents.id, name: documents.name, type: documents.type });
    return NextResponse.json({ ok: true, document: doc });
  } catch {
    return NextResponse.json({ ok: false, error: "db unavailable" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  try {
    const [existing] = await db.select().from(documents).where(eq(documents.id, id));
    if (!existing || existing.userPhone !== user.phone) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    await db.delete(documents).where(eq(documents.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "delete failed" }, { status: 500 });
  }
}
