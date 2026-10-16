import { NextResponse } from "next/server";
import { db } from "@/db";
import { platformSettings } from "@/db/schema-marketplace";
import { permDenied } from "@/lib/admin-guard";
import { rateLimit, readJson, publicError } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** کلیدهای مجاز تنظیمات پلتفرم — خارج از این لیست پذیرفته نمی‌شود */
const ALLOWED_KEYS = [
  "commission_rate",
  "payout_min",
  "min_lawyer_score",
  "credit_providers",
  "matching_model",
] as const;

type SettingsMap = Partial<Record<(typeof ALLOWED_KEYS)[number], string>>;

function defaults(): SettingsMap {
  return {
    commission_rate: "10",
    payout_min: "10000000",
    min_lawyer_score: "60",
    credit_providers: "azki,partner_bank",
    matching_model: "dadpayo-heuristic-v1",
  };
}

/**
 * GET /api/admin/marketplace/settings
 * خواندن platform_settings با مقادیر پیش‌فرض برای کلیدهای خالی.
 */
export async function GET(req: Request) {
  const limited = rateLimit(req, "admin-settings", 120, 60_000);
  if (limited) return limited;
  const _denied = await permDenied("settings");
  if (_denied) return _denied;

  try {
    const rows = await db.select().from(platformSettings);
    const list = Array.isArray(rows) ? rows : [];
    const settings = defaults();
    for (const row of list) {
      if ((ALLOWED_KEYS as readonly string[]).includes(row.key)) {
        settings[row.key as (typeof ALLOWED_KEYS)[number]] = row.value;
      }
    }
    return NextResponse.json({ ok: true, settings, allowedKeys: ALLOWED_KEYS });
  } catch {
    return publicError();
  }
}

/**
 * PUT /api/admin/marketplace/settings  { settings: [{ key, value }] }
 * ذخیرهٔ تنظیمات پلتفرم (upsert) — فقط کلیدهای مجاز.
 */
export async function PUT(req: Request) {
  const limited = rateLimit(req, "admin-settings-put", 30, 60_000);
  if (limited) return limited;
  const _denied = await permDenied("settings");
  if (_denied) return _denied;

  const body = await readJson(req, 4_000);
  const rawItems = body?.settings;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ ok: false, error: "آرایهٔ تنظیمات الزامی است." }, { status: 422 });
  }

  const items: { key: (typeof ALLOWED_KEYS)[number]; value: string }[] = [];
  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const key = String((item as Record<string, unknown>).key ?? "");
    const value = String((item as Record<string, unknown>).value ?? "").trim().slice(0, 200);
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) continue;
    items.push({ key: key as (typeof ALLOWED_KEYS)[number], value });
  }
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "هیچ کلید مجازی برای ذخیره یافت نشد." }, { status: 422 });
  }

  try {
    await Promise.all(
      items.map((item) =>
        db
          .insert(platformSettings)
          .values({ key: item.key, value: item.value })
          .onConflictDoUpdate({
            target: platformSettings.key,
            set: { value: item.value, updatedAt: new Date() },
          }),
      ),
    );
    return NextResponse.json({ ok: true, saved: items.length });
  } catch {
    return publicError();
  }
}
