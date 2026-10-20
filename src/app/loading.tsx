import { Container } from "@/components/ui";

/**
 * Loading سراسری — skeleton بدون متن برای صفحات داینامیک.
 * عمداً هیچ متن قابل‌خزشی (مثل «در حال بارگذاری…») در HTML خام قرار نمی‌گیرد
 * تا خزنده‌ها و موتورهای پاسخ‌محور محتوای بی‌معنا دریافت نکنند (استاندارد SEO/AEO).
 */
export default function Loading() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-16" aria-hidden="true">
      <div className="flex flex-col items-center gap-4">
        {/* spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-surface-2" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>

        {/* skeleton خطوط */}
        <div className="mt-4 w-full max-w-md space-y-2">
          <div className="h-3 w-full animate-pulse rounded-full bg-surface-2" />
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-surface-2" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-surface-2" />
        </div>
      </div>
    </Container>
  );
}
