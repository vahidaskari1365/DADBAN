import { NextResponse } from "next/server";
import { seedAll } from "@/lib/auto-seed";
import { isAdmin } from "@/lib/admin-auth";
export const dynamic="force-dynamic"; export const runtime="nodejs";
export async function POST(){ if(process.env.NODE_ENV==="production")return NextResponse.json({ok:false,error:"not found"},{status:404}); if(!(await isAdmin()))return NextResponse.json({ok:false,error:"unauthorized"},{status:401}); try{return NextResponse.json({ok:true,counts:await seedAll()});}catch{return NextResponse.json({ok:false,error:"seed failed"},{status:500});} }
