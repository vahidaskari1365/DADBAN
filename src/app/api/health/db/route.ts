import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { isAdmin } from "@/lib/admin-auth";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){ if(!(await isAdmin())) return NextResponse.json({ok:false,error:"unauthorized"},{status:401}); try { await db.execute(sql`select 1`); return NextResponse.json({ok:true,db:"connected"}); } catch { return NextResponse.json({ok:false,db:"error"},{status:503}); } }
