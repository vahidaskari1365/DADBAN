import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { userCookieName } from "@/lib/user-auth";

export async function POST() {
  const store = await cookies();
  store.delete(userCookieName());
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const store = await cookies();
  store.delete(userCookieName());
  return NextResponse.redirect("/");
}
