import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieName } from "@/lib/admin-auth";

export async function GET() {
  const store = await cookies();
  store.delete(cookieName());
  const url = new URL("/admin/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  return NextResponse.redirect(url);
}

export async function POST() {
  const store = await cookies();
  store.delete(cookieName());
  return NextResponse.json({ ok: true });
}
