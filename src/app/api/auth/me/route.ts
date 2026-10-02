import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false });
  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role },
  });
}
