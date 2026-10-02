import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { isAdmin } from "@/lib/admin-auth";
import { phone, rateLimit, readJson, text, validPhone } from "@/lib/api-security";
export const runtime = "nodejs";
const STAGES = ["ثبت اولیه", "بررسی مدارک", "تنظیم دادخواست", "ثبت در دادگاه", "تعیین شعبه", "جلسه اول", "صدور رأی", "تجدیدنظر", "در دادگاه/دادسرا", "مرحله اجرا"];
export async function POST(req: Request) {
 const body=await readJson(req,32_768); const limited=rateLimit(req,"cases",5,60*60_000); if(limited)return limited;
 const subject=text(body?.subject,160),description=text(body?.description,12_000),city=text(body?.city,100),name=text(body?.name,120), mobile=phone(body?.phone), stage=text(body?.stage,100) || "ثبت اولیه", budget=text(body?.budget,100);
 if(!subject||!description||!city||!name||!validPhone(mobile)||!STAGES.includes(stage)) return NextResponse.json({ok:false,error:"اطلاعات پرونده معتبر نیست."},{status:422});
 try { const caseNumber=`SHF-${randomBytes(6).toString("hex").toUpperCase()}`; const trackingToken=randomBytes(32).toString("base64url"); await db.insert(cases).values({caseNumber,trackingToken,subject,description,city,stage,budget:budget||null,contactName:name,contactPhone:mobile,status:"new"}); return NextResponse.json({ok:true,caseNumber,trackingToken,stageIndex:STAGES.indexOf(stage),stages:STAGES,message:"پرونده شما ثبت شد. کد پیگیری را در جای امن نگه دارید."}); } catch { return NextResponse.json({ok:false,error:"ثبت پرونده انجام نشد."},{status:500}); }
}
export async function GET() { if(!(await isAdmin())) return NextResponse.json({ok:false,error:"unauthorized"},{status:401}); try { const rows=await db.select({id:cases.id,caseNumber:cases.caseNumber,subject:cases.subject,city:cases.city,stage:cases.stage,status:cases.status,createdAt:cases.createdAt}).from(cases).limit(200); return NextResponse.json({ok:true,cases:rows}); } catch { return NextResponse.json({ok:false,error:"خطای داخلی رخ داد."},{status:500}); } }
