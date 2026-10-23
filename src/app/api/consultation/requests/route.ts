import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultations, lawyers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { rateLimit } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/consultation/requests — کارتابل درخواست‌های مشاورهٔ وکیلِ واردشده.
 *
 * فیکس امنیتی (قبلاً نشت اطلاعات بود): این endpoint بدون احراز هویت، نام/موضوع/مبلغ
 * موکل‌های هر وکیل را با دانستن slug برمی‌گرداند. حالا فقط وکیل/عضو تیمِ واردشده
 * می‌تواند کارتابلِ «خودش» را ببیند — slug همیشه از پیوند حساب (users.lawyerId)
 * گرفته می‌شود و پارامتر query نادیده گرفته می‌شود.
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

  // فیکس: فقط وکیل واردشده؛ slug از پیوند حساب — نه از ورودی کلاینت
  const actor = await getLawyerActor();
  if (!actor) {
    return NextResponse.json({ ok: false, error: "برای مشاهدهٔ کارتابل، با حساب وکیل خود وارد شوید." }, { status: 401 });
  }

  try {
    const [lw] = await db
      .select({ id: lawyers.id })
      .from(lawyers)
      .where(eq(lawyers.id, actor.lawyerId))
      .limit(1);
    if (!lw) {
      return NextResponse.json({ ok: true, requests: [], counts: { total: 0, paid: 0, active: 0 } });
    }

    const rows = await db
      .select()
      .from(consultations)
      .where(eq(consultations.lawyerId, lw.id))
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
