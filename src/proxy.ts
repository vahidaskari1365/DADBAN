import { NextResponse, type NextRequest } from "next/server";

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

const USER_COOKIE = "dadpayo_user";
const ADMIN_COOKIE = "dadpayo_admin";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── Security headers (برای همه‌ی responses) ──────────────────────────
  const res = NextResponse.next();
  res.headers.set("X-DNS-Prefetch-Control", "on");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
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

  return res;
}

export const config = {
  /**
   * فقط مسیرهای حساس middleware رو اجرا می‌کنه (نه static assets).
   */
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
