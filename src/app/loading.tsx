import { Container } from "@/components/ui";

/**
 * Loading سراسری — skeleton spinner برای صفحات داینامیک.
 * وقتی Next.js در حال بارگذاری داده‌ها هست، این صفحه نمایش داده می‌شه.
 */
export default function Loading() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-16">
      <div className="flex flex-col items-center gap-4">
        {/* spinner */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-4 border-surface-2" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>

        {/* متن */}
        <p className="text-sm font-medium text-muted">در حال بارگذاری...</p>

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
