import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, publicError } from "@/lib/api-security";
import { fetchMarketItems, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/portal/cases/market?specialty=&city=&q=&limit=
 * پرونده‌های باز مارکت‌پلیس (isPublic, بدون وکیل, new/reviewing)
 * + matchScore بر اساس تخصص وکیل جاری و امتیاز AI ذخیره‌شده.
 */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "portal-cases-market", 60, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const url = new URL(req.url);
    const specialty = url.searchParams.get("specialty") ?? undefined;
    const city = url.searchParams.get("city") ?? undefined;
    const q = url.searchParams.get("q") ?? undefined;
    const limitRaw = Number(url.searchParams.get("limit") ?? 24);
    const limit = Number.isFinite(limitRaw) ? Math.min(48, Math.max(1, Math.floor(limitRaw))) : 24;

    const ctx = await resolveLawyerContext(user);
    const items = await fetchMarketItems(ctx.lawyer, { specialty, city, q, limit });

    return NextResponse.json({ ok: true, items, demo: ctx.demo });
  } catch {
    return publicError();
  }
}
