import "server-only";
import { db } from "@/db";
import { telegramLinks, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { ensureExtendedSchema } from "@/lib/auto-seed";

/**
 * ماژول ربات تلگرام دادبان — اطلاع‌رسانی زندهٔ پرونده بدون نیاز به کلید SMS.
 *
 * صادقانه مثل بقیهٔ ماژول‌ها: بدون TELEGRAM_BOT_TOKEN هیچ «موفقیت ساختگی»ای
 * وجود ندارد؛ sendTelegramMessage {ok:false, error:"not-configured"} برمی‌گرداند
 * و هیچ throwای به مسیر اصلی نشت نمی‌کند. فعال‌سازی: فقط دو متغیر محیطی در Vercel:
 *   TELEGRAM_BOT_TOKEN       → توکن ربات از @BotFather
 *   TELEGRAM_WEBHOOK_SECRET  → (اختیاری) توکن تأیید وبهوک
 */

const API = "https://api.telegram.org";

/** آیا ربات تلگرام پیکربندی شده؟ */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

interface TgResult {
  ok: boolean;
  error?: string;
}

async function callMethod(method: string, payload: Record<string, unknown>): Promise<TgResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "not-configured" };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    const json = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !json?.ok) return { ok: false, error: json?.description ?? `http-${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network" };
  }
}

/** ارسال پیام متنی (بدون parse_mode — متن سادهٔ فارسی امن است). هرگز throw نمی‌کند. */
export async function sendTelegramMessage(chatId: string, text: string): Promise<TgResult> {
  if (!isTelegramConfigured()) return { ok: false, error: "not-configured" };
  const cid = String(chatId ?? "").trim();
  const body = String(text ?? "").trim();
  if (!cid || !body) return { ok: false, error: "bad-input" };
  return callMethod("sendMessage", { chat_id: cid, text: body.slice(0, 4000) });
}

/** به‌روزرسانی زمان آخرین پیام — best-effort، هرگز throw نمی‌کند. */
export async function touchTelegramLink(chatId: string): Promise<void> {
  try {
    await ensureExtendedSchema();
    await db.update(telegramLinks).set({ lastMessageAt: new Date() }).where(eq(telegramLinks.chatId, String(chatId)));
  } catch {
    /* non-fatal */
  }
}

/** ثبت/اتصال chat_id به یک شمارهٔ موبایل — صادقانه؛ در نبود DB هم خطا نمی‌دهد (false). */
export async function linkTelegramChat(chatId: string, phone: string | null): Promise<boolean> {
  try {
    await ensureExtendedSchema();
    const cid = String(chatId ?? "").trim();
    if (!cid) return false;
    await db
      .insert(telegramLinks)
      .values({ chatId: cid, phone: phone ?? null, active: true, lastMessageAt: new Date() })
      .onConflictDoUpdate({
        target: telegramLinks.chatId,
        set: { phone: phone ?? null, active: true, lastMessageAt: new Date() },
      });
    return true;
  } catch {
    return false;
  }
}

/**
 * اعلان تلگرامی برای شناسه‌های کاربر (مکمل اعلان درون‌برنامه‌ای در notify.ts).
 * نگاشت userId → phone از جدول کاربران، سپس ارسال به همهٔ چت‌های فعال متصل به
 * آن شماره‌ها. best-effort و سقف‌دار (≤۱۰ چت) — هرگز مسیر اصلی را نمی‌شکند.
 */
export async function notifyTelegramByUserIds(userIds: number[], text: string): Promise<void> {
  try {
    if (!userIds.length || !isTelegramConfigured()) return;
    await ensureExtendedSchema();
    const urows = await db.select({ phone: users.phone }).from(users).where(inArray(users.id, userIds.slice(0, BROADCAST_USERS_CAP)));
    const phones = Array.from(new Set(urows.map((u) => u.phone).filter((p): p is string => Boolean(p))));
    if (!phones.length) return;
    const rows = await db
      .select({ chatId: telegramLinks.chatId })
      .from(telegramLinks)
      .where(and(inArray(telegramLinks.phone, phones), eq(telegramLinks.active, true)));
    await Promise.all(rows.slice(0, 10).map((r) => sendTelegramMessage(r.chatId, text)));
  } catch {
    /* non-fatal — اعلان تلگرام هرگز مسیر اصلی را نمی‌شکند */
  }
}

/** اعلان تلگرامی مستقیم با شمارهٔ موبایل — best-effort. */
export async function notifyTelegramByPhone(phone: string | null | undefined, text: string): Promise<void> {
  try {
    if (!phone || !isTelegramConfigured()) return;
    await ensureExtendedSchema();
    const rows = await db
      .select({ chatId: telegramLinks.chatId })
      .from(telegramLinks)
      .where(and(eq(telegramLinks.phone, phone), eq(telegramLinks.active, true)));
    await Promise.all(rows.slice(0, 5).map((r) => sendTelegramMessage(r.chatId, text)));
  } catch {
    /* non-fatal */
  }
}

/** سقف کاربران در هر فراخوانی اعلان (هم‌راستا با BROADCAST_CAP موتور اعلان) */
const BROADCAST_USERS_CAP = 80;
