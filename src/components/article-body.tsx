import Link from "next/link";
import type { ReactNode } from "react";

/**
 * پارسر سبک مارک‌داون برای محتوای مقالات:
 * ## / ### تیترها، بولت و لیست شماره‌دار، [متن](آدرس) لینک‌ها و **بولد**.
 * لینک‌های داخلی با <Link> (ناوبری کلاینت) و لینک‌های بیرونی با rel nofollow opener رندر می‌شوند.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // ابتدا لینک‌ها، سپس بولد — توکن‌بندی ساده و امن (بدون dangerouslySetInnerHTML)
  const nodes: ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) nodes.push(...renderBold(text.slice(last, m.index), `${keyPrefix}-t${i}`));
    const [, label, href] = m;
    const isInternal = href.startsWith("/") || href.startsWith("#");
    nodes.push(
      isInternal ? (
        <Link key={`${keyPrefix}-l${i}`} href={href} className="font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary">
          {label}
        </Link>
      ) : (
        <a key={`${keyPrefix}-l${i}`} href={href} target="_blank" rel="noopener nofollow" className="font-semibold text-primary underline decoration-primary/30 underline-offset-4">
          {label}
        </a>
      ),
    );
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(...renderBold(text.slice(last), `${keyPrefix}-t${i}`));
  return nodes;
}

function renderBold(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldRe = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = boldRe.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(<strong key={`${keyPrefix}-b${i}`} className="font-bold text-foreground">{m[1]}</strong>);
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function ArticleBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = (key: string) => {
    if (!list) return;
    const items = list.items.map((it, j) => (
      <li key={`${key}-li${j}`} className="leading-8 text-foreground-soft">
        {renderInline(it, `${key}-li${j}`)}
      </li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={key} className="my-4 list-decimal space-y-1.5 pr-5 text-[15px]">{items}</ol>
      ) : (
        <ul key={key} className="my-4 list-disc space-y-1.5 pr-5 text-[15px] marker:text-accent-text">{items}</ul>
      ),
    );
    list = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const ulMatch = /^[-*]\s+(.*)$/.exec(line);
    const olMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ulMatch) {
      if (!list || list.ordered) {
        flushList(`blk-${idx}-prev`);
        list = { ordered: false, items: [ulMatch[1]] };
      } else list.items.push(ulMatch[1]);
      return;
    }
    if (olMatch) {
      if (!list || !list.ordered) {
        flushList(`blk-${idx}-prev`);
        list = { ordered: true, items: [olMatch[1]] };
      } else list.items.push(olMatch[1]);
      return;
    }
    flushList(`blk-${idx}-prev2`);
    if (!line.trim()) return;
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`blk-${idx}`} className="mt-7 text-base font-extrabold text-foreground sm:text-lg">
          {renderInline(line.slice(4), `h3-${idx}`)}
        </h3>,
      );
      return;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`blk-${idx}`} className="mt-9 border-r-4 border-accent pr-3 text-lg font-black leading-8 text-foreground sm:text-xl">
          {renderInline(line.slice(3), `h2-${idx}`)}
        </h2>,
      );
      return;
    }
    blocks.push(
      <p key={`blk-${idx}`} className="text-[15px] leading-9 text-foreground-soft">
        {renderInline(line, `p-${idx}`)}
      </p>,
    );
  });
  flushList("blk-end");

  return <div className="space-y-4">{blocks}</div>;
}
