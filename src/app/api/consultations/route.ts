import { NextResponse } from "next/server";
import { db } from "@/db";
import { consultations, lawyers, lawyerAvailability, payments } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { faNum } from "@/lib/data";
import { randomBytes } from "crypto";
import { phone as normalizePhone, rateLimit, readJson, text, validPhone } from "@/lib/api-security";
import { computeSlots, parseTehranDay } from "@/lib/availability";
import { getPaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";

// Server-side price list (integer Toman). The client only *displays* these;
// the price recorded in the database always comes from here / the lawyer row.
const PRICES: Record<string, number> = {
  "chat-15": 120000,
  "chat-30": 200000,
  "voice-15": 250000,
  "voice-30": 350000,
  "voice-60": 600000,
  "video-30": 500000,
  "video-60": 800000,
};

export async function POST(req: Request) {
  let body: {
    lawyer?: string;
    type?: "chat" | "voice" | "video";
    duration?: number;
    name?: string;
    phone?: string;
    subject?: string;
    date?: string;
    time?: string;
    /** ISO instant of the chosen real slot (preferred over date/time) */
    startsAt?: string;
  };
  try {
    body = ((await readJson(req, 16_384)) ?? {}) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "درخواست نامعتبر" }, { status: 400 });
  }

  const limited = rateLimit(req, "consultations", 5, 60 * 60_000);
  if (limited) return limited;
  const { lawyer, type, duration, date, time, startsAt: startsAtRaw } = body;
  const name = text(body.name, 120);
  const phone = normalizePhone(body.phone);
  const subject = text(body.subject, 1000);

  if (!name || !phone || !subject || !type) {
    return NextResponse.json(
      { ok: false, error: "لطفاً همه فیلدهای ضروری را پر کنید." },
      { status: 422 },
    );
  }

  if (!validPhone(phone)) {
    return NextResponse.json(
      { ok: false, error: "شماره موبایل معتبر نیست (مثال: 09123456789)." },
      { status: 422 },
    );
  }

  const dur = duration ?? (type === "video" ? 30 : type === "voice" ? 30 : 15);
  const priceKey = `${type}-${dur}`;
  let price = PRICES[priceKey] ?? 150000;

  let lawyerName: string | null = null;
  let lawyerId: number | null = null;
  if (lawyer) {
    const rows = await db.select().from(lawyers).where(eq(lawyers.slug, lawyer)).limit(1);
    if (rows[0]) {
      lawyerName = rows[0].name;
      lawyerId = rows[0].id;
      if (type === "chat") price = rows[0].priceChat || price;
      if (type === "voice") price = rows[0].priceVoice || price;
      if (type === "video") price = rows[0].priceVideo || price;
    }
  }

  // Real-slot validation: only when a specific slot was picked for a lawyer.
  let startsAt: Date | null = null;
  if (startsAtRaw) {
    const d = new Date(startsAtRaw);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ ok: false, error: "زمان انتخاب‌شده نامعتبر است." }, { status: 422 });
    }
    if (!lawyerId) {
      return NextResponse.json(
        { ok: false, error: "برای انتخاب نوبت قطعی، ابتدا وکیل را مشخص کنید." },
        { status: 422 },
      );
    }
    if (d.getTime() < Date.now()) {
      return NextResponse.json({ ok: false, error: "این زمان گذشته است؛ لطفاً زمانی دیگر انتخاب کنید." }, { status: 422 });
    }

    // Recompute the valid slot set on the server — never trust the client.
    const dayStart = parseTehranDay(
      new Date(d.getTime() + 3.5 * 60 * 60 * 1000).toISOString().slice(0, 10),
    )!;
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const [rules, booked] = await Promise.all([
      db.select().from(lawyerAvailability).where(eq(lawyerAvailability.lawyerId, lawyerId)),
      db
        .select({ startsAt: consultations.startsAt })
        .from(consultations)
        .where(
          and(
            eq(consultations.lawyerId, lawyerId),
            gte(consultations.startsAt, dayStart),
            lt(consultations.startsAt, dayEnd),
            sql`${consultations.status}::text NOT IN ('cancelled','expired','refunded')`,
          ),
        ),
    ]);
    const validSlots = computeSlots({
      rules: rules.map((r) => ({ weekday: r.weekday, startMin: r.startMin, endMin: r.endMin })),
      dayStartUtc: dayStart,
      durationMin: dur,
      takenStarts: booked.map((b) => b.startsAt).filter((x): x is Date => x instanceof Date),
    });
    if (!validSlots.some((s) => s.start === d.toISOString())) {
      return NextResponse.json(
        { ok: false, error: "این نوبت دیگر آزاد نیست؛ لطفاً زمان دیگری انتخاب کنید.", slotTaken: true },
        { status: 409 },
      );
    }
    startsAt = d;
  }

  const ticketNo = "C-" + randomBytes(8).toString("hex").toUpperCase();
  const provider = getPaymentProvider();

  let inserted: { id: number } | null = null;
  try {
    const rows = await db
      .insert(consultations)
      .values({
        lawyerName,
        lawyerId,
        type,
        duration: dur,
        clientName: name,
        clientPhone: phone,
        subject,
        scheduledAt: date && time ? `${date} ${time}` : null,
        startsAt,
        paymentRef: ticketNo,
        price: String(price), // integer Toman, computed server-side only
        status: provider.mode === "sandbox" ? "payment_pending" : "pending",
      })
      .returning({ id: consultations.id });
    inserted = rows[0] ?? null;
  } catch (err) {
    // The partial unique index on (lawyer_id, starts_at) catches concurrent
    // double-bookings atomically — report a conflict instead of 500.
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("consultations_timeslot_uniq")) {
      return NextResponse.json(
        { ok: false, error: "این نوبت هم‌اکنون توسط شخص دیگری رزرو شد؛ لطفاً زمان دیگری انتخاب کنید.", slotTaken: true },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }

  // Payment record: idempotent on the ticket reference — retries are free.
  const payment = await provider.createPayment({
    reference: ticketNo,
    amount: price,
    description: `مشاوره ${type} (${dur} دقیقه)${lawyerName ? ` با ${lawyerName}` : ""}`,
    orderId: inserted?.id ?? null,
    orderType: "consultation",
  });
  try {
    await db
      .insert(payments)
      .values({
        reference: ticketNo,
        orderType: "consultation",
        consultationId: inserted?.id ?? null,
        amount: price,
        provider: provider.id,
        status: payment.status === "manual_review" ? "pending" : payment.status,
      })
      .onConflictDoNothing({ target: payments.reference });
  } catch {
    /* payment bookkeeping must never fail the booking itself */
  }

  const slotLabel =
    startsAt && date
      ? `${date} — ساعت ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" }).format(startsAt)}`
      : null;

  return NextResponse.json({
    ok: true,
    ticketNo,
    price,
    priceLabel: faNum(price.toLocaleString("en-US")) + " تومان",
    slot: slotLabel,
    payment: {
      mode: provider.mode,
      status: payment.status,
      message: payment.message,
    },
    message:
      provider.mode === "sandbox"
        ? "درخواست مشاوره ثبت شد (حالت آزمایکی). برای شبیه‌سازی پرداخت، گزینه پرداخت آزمایشی را بزنید."
        : startsAt
          ? "نوبت شما موقتاً رزرو شد. کارشناسان ما برای تأیید نهایی و هماهنگی پرداخت با شما تماس می‌گیرند."
          : "درخواست مشاوره شما ثبت شد. کارشناسان ما به‌زودی برای تعیین زمان و پرداخت با شما تماس می‌گیرند.",
  });
}
