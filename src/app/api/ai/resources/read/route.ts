import { NextResponse } from "next/server";
import { getZai } from "@/lib/ai";
import { rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ابزار «خواندن صفحه وب» — الهام از Agent-Reach
 * محتوای اصلی هر صفحه وب را استخراج می‌کند (عنوان، متن، زمان انتشار).
 * امنیت: فقط http/https عمومی — مسدودسازی کامل SSRF (localhost، IP خصوصی، متادیتای ابری).
 */

const BLOCKED_HOST =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|\[fc|\[fd|\[fe80|metadata\.google\.internal)/i;

function assertPublicUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (BLOCKED_HOST.test(u.hostname)) return null;
    if (u.hostname === "" || !u.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "res-read", 15, 60 * 60_000);
  if (limited) return limited;

  const body = await readJson(req, 2_048);
  if (!body) return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });

  const raw = text(body.url, 2_048);
  if (!raw) return NextResponse.json({ ok: false, error: "لطفاً آدرس صفحه را وارد کنید." }, { status: 400 });

  const url = assertPublicUrl(raw);
  if (!url) return NextResponse.json({ ok: false, error: "این آدرس مجاز نیست — فقط آدرس‌های وب عمومی (http/https) پذیرفته می‌شود." }, { status: 400 });

  try {
    const zai = await getZai();
    const result = (await zai.functions.invoke("page_reader", { url: url.toString() })) as {
      data?: { title?: string; html?: string; publishedTime?: string; url?: string };
    };
    const title = result?.data?.title?.trim() || url.hostname;
    const textOut = htmlToText(result?.data?.html ?? "");
    if (!textOut) return NextResponse.json({ ok: false, error: "محتوای متنی از این صفحه استخراج نشد (ممکن است صفحه جاوااسکریپتی یا محافظت‌شده باشد)." }, { status: 422 });
    return NextResponse.json({
      ok: true,
      title,
      url: result?.data?.url ?? url.toString(),
      publishedTime: result?.data?.publishedTime ?? "",
      text: textOut.slice(0, 12_000),
      chars: textOut.length,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "خواندن این صفحه ممکن نشد. لطفاً آدرس دیگری را امتحان کنید." }, { status: 502 });
  }
}
