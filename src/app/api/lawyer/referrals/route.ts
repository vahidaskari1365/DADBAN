import { NextResponse } from "next/server";
import { db } from "@/db";
import { lawyers, lawyerReferrals } from "@/db/schema";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { rateLimit, readJson, text } from "@/lib/api-security";
import { getLawyerActor } from "@/lib/lawyer-actor";
import { ensureProfileSchema } from "@/lib/auto-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * همکاری و ارجاع پروندهٔ وکیل↔وکیل (دایرکتوری همکاران).
 *
 * GET    → نمای پنل وکیل: درخواست‌های همکاریِ دریافتی + ارجاع‌های ارسالی من
 * POST   → ثبت درخواست همکاری/ارجاع روی پروفایل یک همکار (از /lawyers/[slug]/refer)
 * PATCH  → پذیرش یا ردِ یک درخواست توسط همکارِ گیرنده
 *
 * دسترسی: وکیل، یا عضو تیم با دسترسی offers (همان کارتابل پیشنهادهای پرونده).
 */

const KINDS = ["referral", "consult", "joint"] as const;
const KIND_FA: Record<string, string> = {
  referral: "ارجاع کامل پرونده",
  consult: "مشورت تخصصی",
  joint: "همکاری مشترک",
};

export async function GET(req: Request) {
  const limited = rateLimit(req, "referrals-get", 120, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("offers");
  if (!actor) {
    return NextResponse.json({ ok: false, error: "برای کارتابل همکاری، با حساب وکیل وارد شوید." }, { status: 401 });
  }
  try {
    await ensureProfileSchema();
    // دو طرف جریان — برای دریافتی «فرستنده» و برای ارسالی «همکار مقصد» نمایش داده می‌شود
    const fromLw = alias(lawyers, "from_lw");
    const toLw = alias(lawyers, "to_lw");
    const rows = await db
      .select({
        ref: lawyerReferrals,
        fromId: fromLw.id,
        fromName: fromLw.name,
        fromSlug: fromLw.slug,
        fromCity: fromLw.city,
        fromTitle: fromLw.title,
        fromPhoto: fromLw.photoUrl,
        fromColor: fromLw.avatarColor,
        fromVerified: fromLw.verified,
        toId: toLw.id,
        toName: toLw.name,
        toSlug: toLw.slug,
        toCity: toLw.city,
        toTitle: toLw.title,
        toPhoto: toLw.photoUrl,
        toColor: toLw.avatarColor,
        toVerified: toLw.verified,
      })
      .from(lawyerReferrals)
      .innerJoin(fromLw, eq(lawyerReferrals.fromLawyerId, fromLw.id))
      .innerJoin(toLw, eq(lawyerReferrals.toLawyerId, toLw.id))
      .where(or(eq(lawyerReferrals.toLawyerId, actor.lawyerId), eq(lawyerReferrals.fromLawyerId, actor.lawyerId)))
      .orderBy(desc(lawyerReferrals.createdAt))
      .limit(100);

    const mapPeer = (side: "from" | "to", r: (typeof rows)[number]) => ({
      id: side === "from" ? r.fromId : r.toId,
      name: side === "from" ? r.fromName : r.toName,
      slug: side === "from" ? r.fromSlug : r.toSlug,
      city: side === "from" ? r.fromCity : r.toCity,
      title: side === "from" ? r.fromTitle : r.toTitle,
      photoUrl: side === "from" ? r.fromPhoto : r.toPhoto,
      avatarColor: side === "from" ? r.fromColor : r.toColor,
      verified: side === "from" ? r.fromVerified : r.toVerified,
    });
    const mapRef = (r: (typeof rows)[number], peerSide: "from" | "to") => ({
      id: r.ref.id,
      kind: r.ref.kind,
      kindFa: KIND_FA[r.ref.kind] ?? r.ref.kind,
      subject: r.ref.subject,
      description: r.ref.description,
      city: r.ref.city,
      budget: r.ref.budget,
      message: r.ref.message,
      status: r.ref.status,
      responseNote: r.ref.responseNote,
      createdAt: r.ref.createdAt,
      respondedAt: r.ref.respondedAt,
      peer: mapPeer(peerSide, r),
    });

    return NextResponse.json({
      ok: true,
      received: rows.filter((r) => r.ref.toLawyerId === actor.lawyerId).map((r) => mapRef(r, "from")),
      sent: rows.filter((r) => r.ref.fromLawyerId === actor.lawyerId).map((r) => mapRef(r, "to")),
    });
  } catch (err) {
    console.error("[dadban] referrals GET failed:", err);
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "referrals-post", 20, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("offers");
  if (!actor) {
    return NextResponse.json({ ok: false, error: "برای ارسال درخواست همکاری، با حساب وکیل وارد شوید." }, { status: 401 });
  }
  let body: {
    toLawyerId?: number;
    kind?: string;
    subject?: string;
    description?: string;
    city?: string;
    budget?: number | string;
    message?: string;
  };
  try {
    body = ((await readJson(req, 12_288)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }

  const toLawyerId = Number(body.toLawyerId);
  const kind = KINDS.includes((body.kind ?? "") as (typeof KINDS)[number]) ? (body.kind as string) : "referral";
  const subject = text(body.subject ?? "", 160) ?? "";
  const description = text(body.description ?? "", 4000) ?? "";
  const city = text(body.city ?? "", 60) ?? "";
  const message = text(body.message ?? "", 2000) ?? "";
  const budgetRaw = Number(body.budget);
  const budget = Number.isFinite(budgetRaw) && budgetRaw > 0 ? Math.min(2_000_000_000, Math.round(budgetRaw)) : null;

  if (!Number.isInteger(toLawyerId) || !subject || description.length < 20 || !message) {
    return NextResponse.json(
      { ok: false, error: "موضوع، شرح پرونده (حداقل ۲۰ نویسه) و پیام به همکار الزامی است." },
      { status: 422 },
    );
  }
  if (toLawyerId === actor.lawyerId) {
    return NextResponse.json({ ok: false, error: "ارسال درخواست همکاری به خودتان ممکن نیست." }, { status: 422 });
  }

  try {
    await ensureProfileSchema();
    const [target] = await db.select({ id: lawyers.id, name: lawyers.name }).from(lawyers).where(eq(lawyers.id, toLawyerId)).limit(1);
    if (!target) return NextResponse.json({ ok: false, error: "وکیل مقصد یافت نشد." }, { status: 404 });

    // جلوگیری از اسپم: حداکثر ۳ درخواستِ در انتظار پاسخ به یک همکار
    const [dup] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(lawyerReferrals)
      .where(
        and(
          eq(lawyerReferrals.fromLawyerId, actor.lawyerId),
          eq(lawyerReferrals.toLawyerId, toLawyerId),
          eq(lawyerReferrals.status, "pending"),
        ),
      );
    if ((dup?.c ?? 0) >= 3) {
      return NextResponse.json({ ok: false, error: "شما سه درخواستِ در انتظار پاسخ برای این همکار دارید؛ لطفاً منتظر پاسخ بمانید." }, { status: 429 });
    }

    await db.insert(lawyerReferrals).values({
      fromLawyerId: actor.lawyerId,
      toLawyerId,
      kind,
      subject,
      description,
      city: city || null,
      budget,
      message,
    });
    return NextResponse.json({ ok: true, message: `درخواست همکاری به ${target.name} ارسال شد و در کارتابل او ثبت گردید.` });
  } catch (err) {
    console.error("[dadban] referrals POST failed:", err);
    return NextResponse.json({ ok: false, error: "ثبت درخواست همکاری انجام نشد." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const limited = rateLimit(req, "referrals-patch", 40, 60_000);
  if (limited) return limited;
  const actor = await getLawyerActor("offers");
  if (!actor) {
    return NextResponse.json({ ok: false, error: "برای پاسخ به درخواست همکاری، با حساب وکیل وارد شوید." }, { status: 401 });
  }
  let body: { id?: number; action?: string; responseNote?: string };
  try {
    body = ((await readJson(req, 4_096)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }
  const id = Number(body.id);
  const action =
    body.action === "accept"
      ? "accepted"
      : body.action === "decline"
        ? "declined"
        : body.action === "cancel"
          ? "cancelled" // لغو توسط فرستنده — تنها قبل از پاسخ همکار
          : null;
  const responseNote = text(body.responseNote ?? "", 600) || null;
  if (!Number.isInteger(id) || !action) {
    return NextResponse.json({ ok: false, error: "شناسهٔ درخواست و نوع پاسخ الزامی است." }, { status: 422 });
  }
  try {
    await ensureProfileSchema();
    const [row] = await db.select().from(lawyerReferrals).where(eq(lawyerReferrals.id, id)).limit(1);
    if (!row) return NextResponse.json({ ok: false, error: "درخواست یافت نشد." }, { status: 404 });
    // پاسخ همکاری فقط از سوی گیرنده؛ لغو فقط از سوی فرستنده
    if (action === "cancelled") {
      if (row.fromLawyerId !== actor.lawyerId) {
        return NextResponse.json({ ok: false, error: "فقط فرستندهٔ درخواست می‌تواند آن را لغو کند." }, { status: 403 });
      }
    } else if (row.toLawyerId !== actor.lawyerId) {
      return NextResponse.json({ ok: false, error: "این درخواست متعلق به کارتابل شما نیست." }, { status: 403 });
    }
    if (row.status !== "pending") {
      return NextResponse.json({ ok: false, error: "این درخواست قبلاً نهایی شده است." }, { status: 409 });
    }
    await db
      .update(lawyerReferrals)
      .set({
        status: action,
        responseNote: action === "cancelled" ? null : responseNote,
        respondedAt: action === "cancelled" ? null : new Date(),
      })
      .where(eq(lawyerReferrals.id, id));
    return NextResponse.json({
      ok: true,
      message:
        action === "accepted"
          ? "درخواست همکاری پذیرفته شد؛ نتیجه در کارتابل فرستنده نمایش داده می‌شود."
          : action === "declined"
            ? "درخواست همکاری رد شد؛ نتیجه در کارتابل فرستنده نمایش داده می‌شود."
            : "درخواست لغو شد و از صف پاسخ همکار خارج گردید.",
    });
  } catch (err) {
    console.error("[dadban] referrals PATCH failed:", err);
    return NextResponse.json({ ok: false, error: "ثبت پاسخ انجام نشد." }, { status: 500 });
  }
}
