import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/db";
import { telegramLinks } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson } from "@/lib/api-security";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { isTelegramConfigured, sendTelegramMessage, linkTelegramChat } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_LOGGED_IN = "برای این کار اول وارد حساب خود شوید.";
const NOT_CONFIGURED = "ربات تلگرام هنوز فعال نشده است. بعد از فعال‌سازی دوباره تلاش کنید.";

/** یکسان‌سازی ارقام فارسی/عربی → لاتین و حذف هر نویسهٔ غیررقمی */
function normalizeChatId(v: unknown): string {
  return String(v ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
}

/** GET /api/telegram/connect — وضعیت ربات + لینک‌های چت متصل به حساب من */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "tg-connect-get", 60, 60_000);
    if (limited) return limited;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: NOT_LOGGED_IN }, { status: 401 });

    const configured = isTelegramConfigured();
    if (!isDbConfigured()) {
      return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
    }
    await ensureExtendedSchema(); // best-effort

    const links = user.phone
      ? await db
          .select({ id: telegramLinks.id, chatId: telegramLinks.chatId, active: telegramLinks.active, createdAt: telegramLinks.createdAt })
          .from(telegramLinks)
          .where(eq(telegramLinks.phone, user.phone))
          .orderBy(desc(telegramLinks.createdAt))
          .limit(20)
      : [];

    return NextResponse.json({ ok: true, configured, links });
  } catch {
    // DB در دسترس نیست — صادقانه 500، نه حالت موفق ساختگی
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

/**
 * POST /api/telegram/connect — اتصال چت تلگرام به حساب + پیام آزمایشی
 * body: { chatId } — فقط رقم، ۵ تا ۱۶ رقم (ارقام فارسی هم پذیرفته می‌شود)
 * صداقت: اتصال بدون موفق بودن «ارسال واقعی» پیام آزمایشی ثبت نمی‌شود.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: NOT_LOGGED_IN }, { status: 401 });

    const limited = rateLimit(req, "tg-connect", 10, 60 * 60_000);
    if (limited) return limited;

    const body = await readJson(req, 2_048);
    const chatId = normalizeChatId(body?.chatId);
    if (chatId.length < 5 || chatId.length > 16) {
      return NextResponse.json(
        { ok: false, error: "شناسهٔ چت فقط باید عدد باشد (۵ تا ۱۶ رقم) — همان عددی که ربات با /start برایتان فرستاده است." },
        { status: 422 },
      );
    }

    if (!isTelegramConfigured()) {
      return NextResponse.json({ ok: false, error: NOT_CONFIGURED }, { status: 503 });
    }

    // پیام آزمایشی واقعی — اگر تلگرام آن را نپذیرد، اتصال ثبت نمی‌شود
    const sent = await sendTelegramMessage(
      chatId,
      "✅ اتصال دادبان موفق شد\nاز این پس اعلان‌های پروندهٔ شما به همین چت ارسال می‌شود.",
    );
    if (!sent.ok) {
      const detail = sent.error === "not-configured" ? NOT_CONFIGURED : sent.error ?? "خطای نامشخص تلگرام";
      return NextResponse.json(
        { ok: false, error: `پیام آزمایشی ارسال نشد: ${detail} — ابتدا در ربات دکمهٔ Start را بزنید.` },
        { status: 502 },
      );
    }

    const linked = await linkTelegramChat(chatId, user.phone);
    if (!linked) {
      // پیام رفت ولی ثبت در DB نشد — صادقانه، نه موفق ساختگی
      return NextResponse.json(
        { ok: false, error: "پیام آزمایشی ارسال شد اما ثبت اتصال موقتاً ممکن نشد؛ لطفاً چند لحظه بعد دوباره تلاش کنید." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
  }
}

/**
 * DELETE /api/telegram/connect?id=<id> — قطع اتصال چت خود کاربر
 * فقط ردیف‌هایی که phone آن‌ها برابر شمارهٔ حساب جاری است حذف می‌شوند.
 */
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: NOT_LOGGED_IN }, { status: 401 });

    const limited = rateLimit(req, "tg-connect-del", 30, 60 * 60_000);
    if (limited) return limited;

    if (!isDbConfigured()) {
      return NextResponse.json({ ok: false, error: "خطای داخلی رخ داد." }, { status: 500 });
    }
    await ensureExtendedSchema(); // best-effort

    const id = Number(new URL(req.url).searchParams.get("id") ?? "");
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: "شناسهٔ لینک نامعتبر است." }, { status: 422 });
    }
    if (!user.phone) {
      return NextResponse.json({ ok: false, error: "لینک پیدا نشد." }, { status: 404 });
    }

    const deleted = await db
      .delete(telegramLinks)
      .where(and(eq(telegramLinks.id, id), eq(telegramLinks.phone, user.phone)))
      .returning({ id: telegramLinks.id });
    if (!deleted.length) {
      return NextResponse.json({ ok: false, error: "لینک پیدا نشد یا به حساب شما متصل نیست." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "قطع اتصال موقتاً در دسترس نیست." }, { status: 500 });
  }
}
