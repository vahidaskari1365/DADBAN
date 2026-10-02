import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultations, serviceRequests, reviews, cases, lawyers, managedServices } from "@/db/schema";
import { desc, gte, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/activity/recent — فید فعالیت واقعی و ناشناس پلتفرم.
 *
 * سیاست مهم: هیچ عدد یا رخدادی جعل نمی‌شود. فقط رکوردهای واقعی دیتابیس
 * (۷ روز اخیر) با حذف کامل اطلاعات شخصی برمی‌گردد. اگر دیتابیس خالی یا
 * در دسترس نباشد، آرایه خالی برمی‌گردد و UI نمایش را کلاً مخفی می‌کند.
 */
export async function GET() {
  type Item = { kind: string; text: string; ts: string };
  const items: Item[] = [];

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [consultRows, requestRows, reviewRows, caseRows] = await Promise.all([
      db
        .select({ createdAt: consultations.createdAt, type: consultations.type })
        .from(consultations)
        .where(gte(consultations.createdAt, since))
        .orderBy(desc(consultations.createdAt))
        .limit(4),
      db
        .select({ createdAt: serviceRequests.createdAt, title: managedServices.title })
        .from(serviceRequests)
        .innerJoin(managedServices, sql`${managedServices.id} = ${serviceRequests.serviceId}`)
        .where(gte(serviceRequests.createdAt, since))
        .orderBy(desc(serviceRequests.createdAt))
        .limit(3),
      db
        .select({ createdAt: reviews.createdAt, lawyerName: lawyers.name, rating: reviews.rating })
        .from(reviews)
        .innerJoin(lawyers, sql`${lawyers.id} = ${reviews.lawyerId}`)
        .where(gte(reviews.createdAt, since))
        .orderBy(desc(reviews.createdAt))
        .limit(3),
      db
        .select({ createdAt: cases.createdAt, city: cases.city })
        .from(cases)
        .where(gte(cases.createdAt, since))
        .orderBy(desc(cases.createdAt))
        .limit(3),
    ]);

    const typeLabel: Record<string, string> = {
      chat: "متنی",
      voice: "صوتی",
      video: "تصویری",
      inperson: "حضوری",
    };

    for (const r of consultRows) {
      items.push({
        kind: "consultation",
        text: `یک مشاوره ${typeLabel[r.type] ?? "حقوقی"} با وکیل متخصص رزرو شد`,
        ts: (r.createdAt ?? new Date()).toISOString(),
      });
    }
    for (const r of requestRows) {
      items.push({
        kind: "request",
        text: `درخواست «${r.title}» ثبت شد`,
        ts: r.createdAt.toISOString(),
      });
    }
    for (const r of reviewRows) {
      items.push({
        kind: "review",
        text: `امتیاز ${r.rating} ستاره برای ${r.lawyerName} ثبت شد`,
        ts: r.createdAt.toISOString(),
      });
    }
    for (const r of caseRows) {
      items.push({
        kind: "case",
        text: `پرونده جدید${r.city ? ` در ${r.city}` : ""} ثبت و ارزیابی شد`,
        ts: r.createdAt.toISOString(),
      });
    }

    items.sort((a, b) => b.ts.localeCompare(a.ts));
    return NextResponse.json(
      { ok: true, items: items.slice(0, 8) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // degraded mode — هیچ فعالیت جعلی نمایش داده نمی‌شود
    return NextResponse.json(
      { ok: true, items: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
