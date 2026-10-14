import { NextResponse } from "next/server";
import { getPageBlocks, PAGE_REGISTRY } from "@/lib/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/site-content?page=home — بلوک‌های محتوایی فعال یک صفحه (عمومی).
 * فقط فیلدهای نمایشی برگردانده می‌شود.
 * برای صفحات «use client» مثل /contact که کامپوننت سرور را نمی‌پذیرند.
 */
export async function GET(req: Request) {
  const page = (new URL(req.url).searchParams.get("page") ?? "").trim().slice(0, 40);
  if (!page || !PAGE_REGISTRY.some((p) => p.key === page)) {
    return NextResponse.json({ ok: true, blocks: [] });
  }
  const rows = await getPageBlocks(page);
  return NextResponse.json({
    ok: true,
    blocks: rows.map((b) => ({
      id: b.id,
      kind: b.kind,
      section: b.section,
      title: b.title,
      subtitle: b.subtitle,
      body: b.body,
      imageUrl: b.imageUrl,
      link: b.link,
      linkLabel: b.linkLabel,
    })),
  });
}
