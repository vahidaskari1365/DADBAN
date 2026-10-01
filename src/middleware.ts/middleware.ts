import { NextResponse, type NextRequest } from "next/server";
import { verifyUserSession, userCookieName } from "@/lib/user-auth";
import { verifySession as verifyAdminSession, cookieName as adminCookieName } from "@/lib/admin-auth";

/**
 * Middleware — محافظت از صفحات حساس.
 *
 * صفحات محافظت‌شده:
 *  - /dashboard/* → نیاز به user session معتبر
 *  - /admin/*     → نیاز به admin session معتبر (به‌جز /admin/login)
 *
 * همچنین: افزودن security headers به همه‌ی responses.
 */
export async function middleware(req: NextRequest) {
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
    const token = req.cookies.get(adminCookieName())?.value;
    if (!verifyAdminSession(token)) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  // ─── Dashboard routes (user auth) ─────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get(userCookieName())?.value;
    const session = verifyUserSession(token);
    if (!session) {
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
