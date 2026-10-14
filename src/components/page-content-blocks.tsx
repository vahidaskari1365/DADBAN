import Image from "next/image";
import { Container, Card, Button } from "@/components/ui";
import { getPageBlocks } from "@/lib/cms";
import { getT } from "@/lib/i18n/server";

/**
 * بلوک‌های محتوایی مدیریت‌شده از پنل ادمین (/admin/content) — وردپرس‌مانند.
 * هر صفحهٔ عمومی که می‌خواهد ادمین رویش محتوا بگذارد، این کامپوننت را با
 * page-key خودش رندر می‌کند (position="top" بعد از هیرو / "bottom" قبل از فوتر).
 *
 * امنیت: متن‌ها به‌صورت متن ساده (whitespace-pre-line) رندر می‌شوند — نه HTML
 * (ضد XSS). عکس از /api/media/{id} (همان دامنه) می‌آید.
 * خالی بودن بلوک‌ها = هیچ چیزی رندر نمی‌شود (fallback صادقانه).
 */
export async function PageContentBlocks({
  page,
  position = "top",
  className = "",
}: {
  page: string;
  position?: "top" | "bottom";
  className?: string;
}) {
  const t = await getT();
  const all = await getPageBlocks(page);
  /* بلوک‌های top: قبل از آن‌هایی که manager در فیلد section بنویسد bottom
     ترتیب نمایش: sort_order صعودی؛ تفکیک top/bottom با متن section */
  const rows = all.filter((b) => {
    const isBottom = (b.section || "").trim().toLowerCase() === "bottom";
    return position === "bottom" ? isBottom : !isBottom;
  });
  if (!rows.length) return null;

  return (
    <Container className={position === "top" ? `py-6 ${className}` : `py-10 ${className}`}>
      <div className="flex flex-col gap-4" data-testid={`page-content-${page}-${position}`}>
        {rows.map((b) => {
          if (b.kind === "announcement") {
            return (
              <div
                key={b.id}
                className="flex flex-col gap-2 rounded-2xl border border-accent/40 bg-accent-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  {b.imageUrl && (
                    <div className="relative hidden h-14 w-24 shrink-0 overflow-hidden rounded-xl sm:block">
                      <Image src={b.imageUrl} alt="" fill sizes="96px" className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className="min-w-0">
                    {b.title && <p className="text-sm font-black text-accent-text">{b.title}</p>}
                    {b.subtitle && <p className="mt-0.5 text-xs font-medium text-accent-text/80">{b.subtitle}</p>}
                    {b.body && <p className="mt-1 whitespace-pre-line text-sm leading-7 text-foreground-soft">{b.body}</p>}
                  </div>
                </div>
                {b.link && (
                  <Button href={b.link} size="sm" variant="accent" icon="arrow" className="shrink-0">
                    {b.linkLabel || t("مشاهده")}
                  </Button>
                )}
              </div>
            );
          }
          if (b.kind === "image" && b.imageUrl) {
            return (
              <Card key={b.id} hover={false} className="overflow-hidden p-0">
                <div className="relative aspect-[16/6] w-full sm:aspect-[21/8]">
                  <Image
                    src={b.imageUrl}
                    alt={b.title || t("تصویر صفحه")}
                    fill
                    sizes="(min-width: 1024px) 1200px, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                {(b.title || b.body) && (
                  <div className="p-5">
                    {b.title && <h2 className="text-base font-black text-foreground">{b.title}</h2>}
                    {b.subtitle && <p className="mt-0.5 text-sm font-bold text-primary">{b.subtitle}</p>}
                    {b.body && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground-soft">{b.body}</p>}
                    {b.link && (
                      <div className="mt-3">
                        <Button href={b.link} size="sm" variant="soft" icon="arrow">
                          {b.linkLabel || t("مشاهده")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          }
          if (b.kind === "faq") {
            return (
              <Card key={b.id} hover={false}>
                <h2 className="flex items-start gap-2 text-base font-black text-foreground">
                  <span aria-hidden className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-black text-primary">؟</span>
                  {b.title}
                </h2>
                {b.body && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground-soft">{b.body}</p>}
              </Card>
            );
          }
          if (b.kind === "feature") {
            return (
              <Card key={b.id}>
                <div className="flex items-start gap-3">
                  <span aria-hidden className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    ✦
                  </span>
                  <div className="min-w-0">
                    {b.title && <h2 className="text-base font-black text-foreground">{b.title}</h2>}
                    {b.subtitle && <p className="mt-0.5 text-sm font-bold text-primary">{b.subtitle}</p>}
                    {b.body && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground-soft">{b.body}</p>}
                    {b.link && (
                      <div className="mt-3">
                        <Button href={b.link} size="sm" variant="soft" icon="arrow">
                          {b.linkLabel || t("مشاهده")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          }
          /* kind === "text" — پیش‌فرض */
          return (
            <Card key={b.id} hover={false}>
              {b.title && <h2 className="text-base font-black text-foreground">{b.title}</h2>}
              {b.subtitle && <p className="mt-0.5 text-sm font-bold text-primary">{b.subtitle}</p>}
              {b.body && <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground-soft">{b.body}</p>}
              {b.link && (
                <div className="mt-3">
                  <Button href={b.link} size="sm" variant="soft" icon="arrow">
                    {b.linkLabel || t("مشاهده")}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
