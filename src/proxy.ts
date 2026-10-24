import { NextResponse, type NextRequest } from "next/server";
import { HOME_MARKDOWN } from "@/lib/ai-discovery";

/**
 * Proxy (جانشین Middleware در Next.js 16) — محافظت از صفحات حساس.
 *
 * توجه: این proxy در Edge Runtime اجرا می‌شه، بنابراین نمی‌تونه
 * از Node.js modules مثل `crypto` استفاده کنه. برای همین، فقط
 * وجود cookie رو چک می‌کنه (نه verify کامل). verify واقعی session
 * در API routes با Node.js runtime انجام می‌شه.
 *
 * این کافی هست چون:
 *  - اگه cookie نباشه، redirect به login می‌شه
 *  - اگه cookie تقلبی باشه، API routes با verify کامل reject می‌کنن
 *  - کاربر بدون session معتبر نمی‌تونه به dashboard دسترسی پیدا کنه
 */

const USER_COOKIE = "dadban_user";
const ADMIN_COOKIE = "dadban_admin";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── مذاکرهٔ محتوا برای عامل‌های هوش مصنوعی (geo-checklist.dev) ────────────
  // عامل‌هایی که «text/markdown» می‌پرسند، نسخهٔ مارک‌داون سبک صفحهٔ اصلی
  // را می‌گیرند (بدون HTML اضافه) — استاندارد AI-Discovery.
  const accept = req.headers.get("accept") ?? "";
  if (
    pathname === "/" &&
    accept.includes("text/markdown") &&
    !accept.includes("text/html")
  ) {
    return new Response(HOME_MARKDOWN, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // ─── مسیر استاندارد /.well-known/ai.txt → روت داخلی /ai/ai.txt ─────────────
  if (pathname === "/.well-known/ai.txt") {
    const url = req.nextUrl.clone();
    url.pathname = "/ai/ai.txt";
    return NextResponse.rewrite(url);
  }

  // ─── Security headers (برای همه‌ی responses) ──────────────────────────
  const res = NextResponse.next();
  res.headers.set("X-DNS-Prefetch-Control", "on");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), browsing-topics=()"
  );

  // ─── Admin routes ─────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  // ─── Dashboard routes (user auth) ─────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get(USER_COOKIE)?.value;
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  // ─── صفحات داخلی/فنی (ERD و کلیدواژه‌های سئو) — فقط برای کاربر واردشده ──
  if (pathname.startsWith("/developer") || pathname.startsWith("/keywords")) {
    const token = req.cookies.get(USER_COOKIE)?.value;
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  // ─── ناحیهٔ ابزارهای کاربری (جعبه‌ابزار/میز پرونده/شبیه‌سازی دادگاه) ──────
  if (pathname.startsWith("/workspace") || pathname.startsWith("/court-sim") || pathname.startsWith("/case-desk")) {
    const token = req.cookies.get(USER_COOKIE)?.value;
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  // ─── صفحات عملیاتی/اعلان‌ها — گارد صفحه‌ای هم دارد؛ این لایهٔ دوم است ─────
  if (pathname.startsWith("/manage") || pathname.startsWith("/notifications")) {
    const token = req.cookies.get(USER_COOKIE)?.value;
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  return res;
}

export const config = {
  /**
   * فقط مسیرهای حساس middleware رو اجرا می‌کنه (نه static assets).
   */
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/developer/:path*",
    "/keywords/:path*",
    "/workspace/:path*",
    "/court-sim/:path*",
    "/case-desk/:path*",
    "/manage/:path*",
    "/notifications/:path*",
    "/.well-known/:path*",
    "/",
  ],
};
