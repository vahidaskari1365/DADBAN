import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultations, lawyers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { rateLimit } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/consultation/requests?lawyer=<slug>
 * کارتابل وکیل — درخواست‌های مشاورهٔ ثبت‌شده برای پروفایل وکیل
 * (همان پنلی که در /consultation/live با انتخاب پروفایل باز می‌شود).
 *
 * نکتهٔ حریم خصوصی: این endpoint بدون احراز هویت است (هم‌معماری صندوق گفتگوها)،
 * بنابراین شمارهٔ تماس موکل عمداً ماسک می‌شود و شمارهٔ کامل از این مسیر خارج نمی‌شود.
 */

const ACTIVE_STATUSES = ["paid", "confirmed", "scheduled", "in_progress", "completed"];

function maskPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length < 7) return "••••••";
  return `${d.slice(0, 4)}•••${d.slice(-3)}`;
}

export async function GET(req: Request) {
  const limited = rateLimit(req, "lawyer-requests", 60, 60_000);
  if (limited) return limited;

  const slug = (new URL(req.url).searchParams.get("lawyer") ?? "").trim().slice(0, 64);
  if (!/^[a-z0-9-]{3,64}$/i.test(slug)) {
    return NextResponse.json({ ok: false, error: "شناسه وکیل نامعتبر است" }, { status: 422 });
  }

  try {
    const lw = await db
      .select({ id: lawyers.id })
      .from(lawyers)
      .where(eq(lawyers.slug, slug))
      .limit(1);
    if (!lw[0]) {
      return NextResponse.json({ ok: true, requests: [], counts: { total: 0, paid: 0, active: 0 } });
    }

    const rows = await db
      .select()
      .from(consultations)
      .where(eq(consultations.lawyerId, lw[0].id))
      .orderBy(desc(consultations.createdAt))
      .limit(50);

    const requests = rows.map((r) => ({
      id: r.id,
      clientName: r.clientName,
      phoneMasked: maskPhone(r.clientPhone),
      type: r.type as "chat" | "voice" | "video",
      duration: r.duration,
      price: Number(r.price) || 0,
      status: r.status as string,
      startsAt: r.startsAt ? new Date(r.startsAt).toISOString() : null,
      scheduledAt: r.scheduledAt,
      createdAt: new Date(r.createdAt).toISOString(),
      subject: r.subject.slice(0, 200),
    }));

    const counts = {
      total: requests.length,
      paid: requests.filter((x) => x.status === "paid").length,
      active: requests.filter((x) => ACTIVE_STATUSES.includes(x.status)).length,
    };

    return NextResponse.json({ ok: true, requests, counts });
  } catch {
    // degraded — کارتابل نباید 500 بدهد؛ پنل حالت خالی را نشان می‌دهد
    return NextResponse.json({ ok: true, requests: [], counts: { total: 0, paid: 0, active: 0 } });
  }
}
