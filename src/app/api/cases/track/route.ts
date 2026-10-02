import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/api-security";
export const runtime = "nodejs";
export async function GET(req: Request) { const limited=rateLimit(req,"case-track",20,15*60_000); if(limited)return limited; const token=(new URL(req.url).searchParams.get("code")??"").trim(); if(!/^[A-Za-z0-9_-]{40,}$/.test(token)) return NextResponse.json({ok:false,found:false,error:"کد پیگیری معتبر نیست."},{status:422}); try { const [row]=await db.select({caseNumber:cases.caseNumber,status:cases.status,createdAt:cases.createdAt,lastUpdatedAt:cases.createdAt}).from(cases).where(eq(cases.trackingToken,token)).limit(1); return row ? NextResponse.json({ok:true,found:true,caseData:row}) : NextResponse.json({ok:true,found:false,error:"پرونده‌ای یافت نشد."}); } catch { return NextResponse.json({ok:false,found:false,error:"خطای داخلی رخ داد."},{status:500}); } }
