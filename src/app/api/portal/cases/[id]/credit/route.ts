import { NextResponse } from "next/server";
import { db } from "@/db";
import { creditRequests } from "@/db/schema-marketplace";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { generateReferenceCode, getCaseRow, isLawyerRole, parseAmount } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * POST /api/portal/cases/[id]/credit — ثبت درخواست تأمین اعتبار حق‌الوکاله (فقط وکیل/کارآموز)
 * body: { provider: "azki" | "partner_bank", amount, months }
 */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const limited = rateLimit(req, "portal-credit-post", 20, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "درخواست اعتبار فقط برای وکیل مجاز است." }, { status: 403 });
    }

    const { id } = await params;
    const caseId = Number(id);
    if (!Number.isFinite(caseId) || caseId <= 0) {
      return NextResponse.json({ ok: false, error: "شناسه پرونده نامعتبر است." }, { status: 422 });
    }
    const c = await getCaseRow(caseId);
    if (!c) return NextResponse.json({ ok: false, error: "پرونده یافت نشد." }, { status: 404 });

    const body = await readJson(req, 4_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const providerRaw = String(body.provider ?? "azki");
    const provider = providerRaw === "partner_bank" ? "partner_bank" : "azki";

    const amount = parseAmount(body.amount);
    if (!amount || amount < 1_000_000 || amount > 5_000_000_000) {
      return NextResponse.json({ ok: false, error: "مبلغ تأمین اعتبار باید بین ۱ میلیون تا ۵ میلیارد تومان باشد." }, { status: 422 });
    }

    const months = Math.round(Number(body.months ?? 12));
    if (!Number.isFinite(months) || months < 3 || months > 36) {
      return NextResponse.json({ ok: false, error: "تعداد اقساط باید بین ۳ تا ۳۶ ماه باشد." }, { status: 422 });
    }

    const referenceCode = generateReferenceCode(provider);
    await db.insert(creditRequests).values({
      caseId,
      provider,
      amount: String(Math.round(amount)),
      months,
      status: "submitted",
      statusDetail: "در انتظار اعتبارسنجی موکل در پنل تأمین‌کننده",
      referenceCode,
      providerPayload: text(body.note, 500) ?? "",
    });

    return NextResponse.json({
      ok: true,
      credit: {
        provider,
        amount: String(Math.round(amount)),
        months,
        status: "submitted",
        statusDetail: "در انتظار اعتبارسنجی موکل در پنل تأمین‌کننده",
        referenceCode,
      },
    });
  } catch {
    return publicError();
  }
}
