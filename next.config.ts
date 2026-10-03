import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone برای sandbox محلی (start.sh از standalone server استفاده می‌کند)
  // Vercel با standalone هم مشکلی ندارد — خودش بهینه‌سازی می‌کند
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()" },
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; font-src 'self' data: https:" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
        ],
      },
      // هدر کش استاتیک فقط در تولید — در توسعه با رفتار داخلی Next.js تداخل ایجاد می‌کند
      ...(process.env.NODE_ENV === "production"
        ? [{
            source: "/_next/static/:path*",
            headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
          }]
        : []),
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;
