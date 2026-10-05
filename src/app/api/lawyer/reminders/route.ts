import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyerReminders } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * یادآورهای پنل وکیل — عنوان + تاریخ/ساعت (به وقت تهران) + توضیح.
 * وکیل همه را می‌بیند؛ عضو تیم با دسترسی reminders.
 */

export async function GET(req: Request) {
  const limited = rateLimit(req, "reminders-get", 90, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("reminders");
  if (!actor) return NextResponse.json({ ok: false, error: "برای یادآورها باید با حساب وکیل وارد شوید." }, { status: 401 });
  try {
    await ensureProfileSchema();
    const rows = await db
      .select()
      .from(lawyerReminders)
      .where(eq(lawyerReminders.lawyerId, actor.lawyerId))
      .orderBy(asc(lawyerReminders.done), asc(lawyerReminders.dueAt))
      .limit(100);
    return NextResponse.json({
      ok: true,
      reminders: rows.map((r) => ({
        id: r.id,
        title: r.title,
        note: r.note,
        dueAt: new Date(r.dueAt).toISOString(),
        done: r.done,
        createdAt: new Date(r.createdAt).toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "reminders-post", 30, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("reminders");
  if (!actor) return NextResponse.json({ ok: false, error: "برای یادآورها باید با حساب وکیل وارد شوید." }, { status: 401 });
  let body: { title?: string; note?: string; date?: string; hour?: string };
  try {
    body = ((await readJson(req, 6_144)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  const title = text(body.title, 160);
  const note = text(body.note, 2000) || null;
  const date = text(body.date, 10) ?? ""; // YYYY-MM-DD (میلادی ISO از تقویم جلالی)
  const hour = text(body.hour, 5) ?? ""; // "HH:MM"
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(hour)) {
    return NextResponse.json({ ok: false, error: "عنوان، تاریخ و ساعت یادآور الزامی است." }, { status: 422 });
  }
  const due = new Date(`${date}T${hour}:00+03:30`); // تهران
  if (Number.isNaN(due.getTime())) {
    return NextResponse.json({ ok: false, error: "تاریخ/ساعت نامعتبر است." }, { status: 422 });
  }
  try {
    await ensureProfileSchema();
    const [row] = await db
      .insert(lawyerReminders)
      .values({ lawyerId: actor.lawyerId, title, note, dueAt: due })
      .returning();
    return NextResponse.json({
      ok: true,
      reminder: { id: row.id, title: row.title, note: row.note, dueAt: new Date(row.dueAt).toISOString(), done: row.done, createdAt: new Date(row.createdAt).toISOString() },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "ثبت یادآور انجام نشد." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, "reminders-patch", 60, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("reminders");
  if (!actor) return NextResponse.json({ ok: false, error: "دسترسی ندارید." }, { status: 401 });
  let body: { id?: number; done?: boolean };
  try {
    body = ((await readJson(req, 2_048)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  const id = Number(body.id);
  if (!Number.isInteger(id) || typeof body.done !== "boolean") {
    return NextResponse.json({ ok: false, error: "اطلاعات نامعتبر است." }, { status: 422 });
  }
  try {
    await ensureProfileSchema();
    await db
      .update(lawyerReminders)
      .set({ done: body.done })
      .where(eq(lawyerReminders.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "به‌روزرسانی انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const limited = rateLimit(req, "reminders-delete", 40, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("reminders");
  if (!actor) return NextResponse.json({ ok: false, error: "دسترسی ندارید." }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "شناسه نامعتبر است." }, { status: 422 });
  try {
    await ensureProfileSchema();
    await db.delete(lawyerReminders).where(eq(lawyerReminders.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "حذف انجام نشد." }, { status: 500 });
  }
}
