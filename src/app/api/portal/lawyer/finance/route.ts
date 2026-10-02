import { NextResponse } from "next/server";
import { db } from "@/db";
import { payoutRequests } from "@/db/schema-marketplace";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/user-auth";
import { rateLimit, readJson, text, publicError } from "@/lib/api-security";
import { computeLawyerFinance, isLawyerRole, parseAmount, resolveLawyerContext } from "@/components/portal/lawyer/portal-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYOUT_MIN = 1_000_000; // حداقل مبلغ برداشت (تومان)

function normalizeIban(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, "").toUpperCase();
  const withIR = cleaned.startsWith("IR") ? cleaned : `IR${cleaned}`;
  return /^IR\d{24}$/.test(withIR) ? withIR : null;
}

/** GET /api/portal/lawyer/finance → موجودی، در انتظار تسویه، کمیسیون ماه، تراکنش‌ها و درخواست‌های برداشت */
export async function GET(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-finance-get", 60, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });

    const ctx = await resolveLawyerContext(user);
    const finance = await computeLawyerFinance(ctx.lawyerId);
    return NextResponse.json({ ok: true, demo: ctx.demo, ...finance, payoutMin: PAYOUT_MIN });
  } catch {
    return publicError();
  }
}

/**
 * POST /api/portal/lawyer/finance — ثبت درخواست برداشت (فقط وکیل/کارآموز)
 * body: { amount, iban, note? }
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimit(req, "portal-lawyer-finance-post", 15, 60_000);
    if (limited) return limited;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "ابتدا وارد حساب خود شوید." }, { status: 401 });
    if (!isLawyerRole(user.role)) {
      return NextResponse.json({ ok: false, error: "درخواست برداشت فقط برای وکیل مجاز است." }, { status: 403 });
    }

    const ctx = await resolveLawyerContext(user);

    const body = await readJson(req, 4_000);
    if (!body) return NextResponse.json({ ok: false, error: "بدنه درخواست نامعتبر است." }, { status: 422 });

    const amount = parseAmount(body.amount);
    if (!amount || amount < PAYOUT_MIN) {
      return NextResponse.json({ ok: false, error: "حداقل مبلغ برداشت ۱ میلیون تومان است." }, { status: 422 });
    }

    const ibanRaw = String(body.iban ?? "");
    const iban = normalizeIban(ibanRaw);
    if (!iban) {
      return NextResponse.json({ ok: false, error: "شماره شبا معتبر نیست (۲۴ رقم پس از IR)." }, { status: 422 });
    }

    const finance = await computeLawyerFinance(ctx.lawyerId);
    if (amount > finance.available) {
      return NextResponse.json({ ok: false, error: "مبلغ درخواستی بیشتر از موجودی قابل برداشت است." }, { status: 422 });
    }

    await db.insert(payoutRequests).values({
      lawyerId: ctx.lawyerId,
      amount: String(Math.round(amount)),
      status: "requested",
      iban,
      note: text(body.note, 300) ?? "",
    });

    const updated = await computeLawyerFinance(ctx.lawyerId);
    return NextResponse.json({ ok: true, ...updated });
  } catch {
    return publicError();
  }
}
