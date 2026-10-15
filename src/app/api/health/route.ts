import { db } from "@/db";
import { sql } from "drizzle-orm";

function causeChain(e: unknown, depth = 0): string {
  if (!e || depth > 3) return "";
  const err = e as { message?: string; code?: string; cause?: unknown };
  const part = [err.code, err.message].filter(Boolean).join(": ");
  const rest = causeChain((err as { cause?: unknown }).cause, depth + 1);
  return part + (rest ? " | cause: " + rest : "");
}

export async function GET(req: Request) {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (e) {
    // جزئیات خطا فقط با کلید ادمین — برای عیب‌یابی عملیاتی؛ بدون کلید هیچ اطلاعی نشت نمی‌کند
    const key = new URL(req.url).searchParams.get("key") ?? "";
    const secret = process.env.ADMIN_SECRET ?? "";
    const detail =
      secret && key === secret ? causeChain(e).slice(0, 800) || String(e) : undefined;
    return Response.json({ ok: false, ...(detail ? { error: detail } : {}) }, { status: 500 });
  }
}
