import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { caseEvents, appointments } from "@/db/schema-marketplace";
import { count, desc, eq, gte, isNotNull, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/trainee/summary
 * خلاصهٔ کارتابل کارآموز/همکار دادپیو: آمار + پرونده‌های ارجاعی + اقدامات ثبت‌شدهٔ من
 * + مهلت‌ها و جلسات پیش‌رو (تقویم تیم).
 * گیت: هر کاربر لاگین‌شده (کارتابل ارجاعی — حالت نمایشی).
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "trainee-summary", 60, 60_000);
  if (limited) return limited;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "برای مشاهدهٔ کارتابل ابتدا وارد حساب شوید." }, { status: 401 });
  }

  try {
    /* پرونده‌های ارجاعی — اولویت: پرونده‌های دارای وکیل تعیین‌شده؛ در نبود آن‌ها (demo) پرونده‌های فعال */
    const assignedRows = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        subject: cases.subject,
        specialty: cases.specialty,
        city: cases.city,
        status: cases.status,
        progress: cases.progress,
        urgency: cases.urgency,
      })
      .from(cases)
      .where(isNotNull(cases.assignedLawyerId))
      .orderBy(desc(cases.createdAt))
      .limit(12);

    let referred = Array.isArray(assignedRows) ? assignedRows : [];
    let demo = false;
    if (referred.length === 0) {
      demo = true;
      referred = await db
        .select({
          id: cases.id,
          caseNumber: cases.caseNumber,
          subject: cases.subject,
          specialty: cases.specialty,
          city: cases.city,
          status: cases.status,
          progress: cases.progress,
          urgency: cases.urgency,
        })
        .from(cases)
        .where(or(eq(cases.status, "active"), eq(cases.status, "matched")))
        .orderBy(desc(cases.createdAt))
        .limit(12);
      if (!Array.isArray(referred)) referred = [];
    }

    /* اقدامات ثبت‌شدهٔ من — رویدادهایی که نام من یا نقش کارآموز دارند */
    const myEvents = await db
      .select({
        id: caseEvents.id,
        caseId: caseEvents.caseId,
        title: caseEvents.title,
        description: caseEvents.description,
        visibleToClient: caseEvents.visibleToClient,
        createdAt: caseEvents.createdAt,
        caseSubject: cases.subject,
      })
      .from(caseEvents)
      .leftJoin(cases, eq(caseEvents.caseId, cases.id))
      .where(or(eq(caseEvents.actorName, user.name), eq(caseEvents.actor, "trainee")))
      .orderBy(desc(caseEvents.createdAt))
      .limit(10);
    const events = Array.isArray(myEvents) ? myEvents : [];

    const [actionsTotal] = await db
      .select({ v: count() })
      .from(caseEvents)
      .where(or(eq(caseEvents.actorName, user.name), eq(caseEvents.actor, "trainee")));

    /* مهلت‌ها و جلسات پیش‌رو (از دیروز به بعد — نزدیک‌ترین اول) */
    const upcoming = await db
      .select({
        id: appointments.id,
        caseId: appointments.caseId,
        title: appointments.title,
        kind: appointments.kind,
        location: appointments.location,
        startsAt: appointments.startsAt,
      })
      .from(appointments)
      .where(gte(appointments.startsAt, new Date(Date.now() - 24 * 3600 * 1000)))
      .orderBy(appointments.startsAt)
      .limit(8);
    const appts = Array.isArray(upcoming) ? upcoming : [];

    return NextResponse.json({
      ok: true,
      stats: {
        referredCases: referred.length,
        myActions: Number(actionsTotal?.v ?? events.length),
        upcomingDeadlines: appts.filter((a) => a.kind === "deadline" || a.kind === "hearing").length,
      },
      demo,
      referred,
      myActions: events,
      appointments: appts,
      user: { name: user.name, role: user.role },
    });
  } catch {
    return publicError();
  }
}
