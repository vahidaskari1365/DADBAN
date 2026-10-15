import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (e) {
    // جزئیات خطا فقط با کلید ادمین — برای عیب‌یابی عملیاتی؛ بدون کلید هیچ اطلاعی نشت می‌کند
    const key = new URL(req.url).searchParams.get("key") ?? "";
    const secret = process.env.ADMIN_SECRET ?? "";
    const detail =
      secret && key === secret
        ? String(e instanceof Error ? e.message : e).slice(0, 500)
        : undefined;
    return Response.json({ ok: false, ...(detail ? { error: detail } : {}) }, { status: 500 });
  }
}
