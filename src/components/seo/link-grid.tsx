import Link from "next/link";
import { Icon } from "@/components/icons";

/**
 * گرید لینک داخلی سئو — برای صفحات فرود (بازتوزیع PageRank + ناوبری کاربر).
 * سمت سرور رندر می‌شود (بدون JS) و با متن لنگر دقیقِ کلمات کلیدی کار می‌کند.
 */
export function SeoLinkGrid({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  if (!links.length) return null;
  return (
    <nav aria-label={title} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="text-base font-bold text-foreground sm:text-lg">{title}</h2>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="group inline-flex items-center gap-1.5 text-sm text-foreground-soft transition-colors hover:text-primary"
            >
              <Icon
                name="arrow"
                className="h-3.5 w-3.5 shrink-0 rotate-180 text-accent-text transition-transform group-hover:-translate-x-0.5"
              />
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
