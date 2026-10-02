import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { isOperative, listOperatives } from "@/lib/managed-services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/operatives — staff + lawyers/supervisors for assignment dropdowns. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isOperative(user.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  try {
    const [staff, lawyers] = await Promise.all([
      listOperatives(["staff"]),
      listOperatives(["lawyer", "supervisor", "admin"]),
    ]);
    return NextResponse.json({ ok: true, staff, lawyers });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}
