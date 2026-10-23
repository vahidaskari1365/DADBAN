import { NextResponse } from "next/server";
import { isTelegramConfigured, sendTelegramMessage, linkTelegramChat, touchTelegramLink } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/webhook — دریافت آپدیت‌های ربات تلگرام دادورزان
 *
 * تنظیم در تلگرام (یک بار، پس از فعال‌سازی ربات):
 *   setWebhook?url=<SITE>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *
 * صداقت و پایداری:
 *  - توکن وبهوک تنظیم شده باشد → هدر x-telegram-bot-api-secret-token باید دقیقاً برابر باشد (وگرنه 401).
 *  - بدون TELEGRAM_BOT_TOKEN → 200 {ok:false, error:"not-configured"} (تلگرام همیشه 200 می‌خواهد؛ خطا صادقانه است).
 *  - هر خطای داخلی فقط لاگ می‌شود و پاسخ 200 {ok:true} برمی‌گردد تا تلگرام بی‌نهایت retry نکند.
 */
export async function POST(req: Request) {
  try {
    // ۱) تأیید وبهوک — در تولید fail-closed: بدون TELEGRAM_WEBHOOK_SECRET ورود ممنوع است
    //    (وگرنه هر کسی می‌تواند آپدیت جعلی بفرستد و ردیف انباشت کند)
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const isProd = process.env.NODE_ENV === "production";
    if (secret) {
      const got = req.headers.get("x-telegram-bot-api-secret-token");
      if (got !== secret) {
        return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
    } else if (isProd) {
      return NextResponse.json({ ok: false, error: "webhook secret not configured" }, { status: 401 });
    }

    // ۲) بدون توکن ربات — صادقانه ولی با 200 (قرار وبهوک تلگرام)
    if (!isTelegramConfigured()) {
      return NextResponse.json({ ok: false, error: "not-configured" });
    }

    // ۳) parse آپدیت — بدنهٔ تلگرام همیشه JSON است؛ هر خطا فقط لاگ می‌شود
    const raw = await req.text();
    if (raw.length > 65_536) {
      return NextResponse.json({ ok: true }); // بدنهٔ غیرمنتظره — نادیده گرفته می‌شود
    }
    type TgUpdate = { message?: { chat?: { id?: unknown }; text?: unknown } };
    let update: TgUpdate | null = null;
    try {
      update = JSON.parse(raw) as TgUpdate;
    } catch {
      console.error("[telegram-webhook] bad json body");
      return NextResponse.json({ ok: true });
    }

    const chatIdRaw = update?.message?.chat?.id;
    const chatId = chatIdRaw === undefined || chatIdRaw === null ? "" : String(chatIdRaw);
    const textMsg = typeof update?.message?.text === "string" ? update.message.text.trim() : "";
    if (!chatId || !textMsg) {
      // آپدیت‌های غیر متنی (عکس، استیکر، callback و…) — بدون عمل، 200
      return NextResponse.json({ ok: true });
    }

    // ۴) فرمان شروع/شناسهٔ چت → پیام خوش‌آمد + ثبت اولیهٔ لینک (بدون شماره)
    const lower = textMsg.toLowerCase();
    if (lower.startsWith("/start") || lower.startsWith("/id") || lower.startsWith("/chatid") || textMsg.startsWith("شروع")) {
      const welcome =
        "👋 به ربات دادورزان خوش آمدید\n\n" +
        `شناسهٔ چت شما:\n${chatId}\n\n` +
        "این عدد را در سایت دادورزان → پنل کاربری → پروفایل → بخش «اتصال تلگرام» وارد کنید " +
        "تا اعلان‌های پرونده (پیشنهاد جدید، پذیرش، پیام‌ها) به همین چت ارسال شود.";
      const res = await sendTelegramMessage(chatId, welcome);
      if (!res.ok) console.error("[telegram-webhook] welcome send failed:", res.error);
      // ثبت/به‌روزرسانی لینک — best-effort؛ شماره بعداً در پنل با «اتصال و پیام آزمایشی» نهایی می‌شود
      const linked = await linkTelegramChat(chatId, null);
      if (!linked) console.error("[telegram-webhook] link save failed for chat", chatId);
      await touchTelegramLink(chatId);
      return NextResponse.json({ ok: true });
    }

    // ۵) سایر پیام‌ها — فعلاً بدون پاسخ خودکار؛ فقط lastMessageAt به‌روزرسانی می‌شود
    await touchTelegramLink(chatId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // هرگز به تلگرام خطا برنگردانید — retry بی‌پایان می‌سازد
    console.error("[telegram-webhook] internal error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: true });
  }
}

/** GET /api/telegram/webhook — health-check بدون احراز */
export async function GET() {
  return NextResponse.json({ ok: true, configured: isTelegramConfigured() });
}
