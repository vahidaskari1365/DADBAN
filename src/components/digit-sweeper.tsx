"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/provider";

/**
 * جاروب خودکار ارقام برای زبان‌های LTR (en/tr/zh) — لایهٔ ۳ تبدیل خودکار ارقام.
 *
 * خروجی کمکی‌های نمایش (formatToman/formatJalali/faNum/toFa/counter و…) مستقیم
 * در DOM می‌نشیند و از t() عبور نمی‌کند؛ این کامپوننت پس از هیدریشن یک‌بار کل
 * متن‌های صفحه را جاروب می‌کند و با MutationObserver محتوای داینامیک (پنل‌ها،
 * فچ‌های بعدی، مارکی و…) را هم پوشش می‌دهد — بدون اینکه هیچ فراخوانی‌گاهی لازم
 * باشد دستی اصلاح شود. در fa/ar هیچ کاری نمی‌کند (ارقام بومی درست است).
 *
 * ایمنی‌ها:
 *  - فقط گره‌های متنی؛ ورودی‌ها (value)، contenteditable و script/style دست‌نخورده می‌مانند
 *  - تبدیل‌ها همگرا هستند: بعد از تبدیل دیگری رقم فارسی/عربی نمی‌ماند → حلقهٔ بی‌پایان ندارد
 *  - کارهای MutationObserver با rAF دسته‌جمعی می‌شوند تا صفحه‌های سنگین کند نشوند
 */

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT", "OPTION"]);
const FA_MAP = "۰۱۲۳۴۵۶۷۸۹";
const AR_MAP = "٠١٢٣٤٥٦٧٨٩";
const HAS_DIGIT = /[۰-۹٠-٩]/;

function convertDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const fi = FA_MAP.indexOf(d);
    if (fi >= 0) return String(fi);
    return String(AR_MAP.indexOf(d));
  });
}

function shouldSkipNode(n: Node): boolean {
  const el = n.parentElement;
  if (!el) return false;
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

function sweepText(text: Text): void {
  const data = text.data;
  if (!data || !HAS_DIGIT.test(data)) return;
  if (shouldSkipNode(text)) return;
  const next = convertDigits(data);
  if (next !== data) text.data = next;
}

function sweepSubtree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    sweepText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let cur: Node | null = walker.nextNode();
  while (cur) {
    sweepText(cur as Text);
    cur = walker.nextNode();
  }
}

export function DigitSweeper() {
  const locale = useLocale();

  useEffect(() => {
    /* فقط زبان‌های LTR — fa/ar رقم بومی خودشان را نگه می‌دارند */
    if (locale !== "en" && locale !== "tr" && locale !== "zh") return;

    /* جاروب اولیه — کل صفحه پس از هیدریشن */
    sweepSubtree(document.body);

    /* پوشش محتوای داینامیک بعدی (فچ پنل‌ها، به‌روزرسانی وضعیت، مارکی و…) */
    const pending = new Set<Node>();
    let scheduled = false;

    const flush = () => {
      scheduled = false;
      for (const n of pending) sweepSubtree(n);
      pending.clear();
    };

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") {
          if (m.target) pending.add(m.target);
        } else if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.ELEMENT_NODE || n.nodeType === Node.TEXT_NODE) pending.add(n);
          });
        }
      }
      if (!scheduled && pending.size > 0) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    });

    mo.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => mo.disconnect();
  }, [locale]);

  return null;
}
