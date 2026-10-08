"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/icons";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";

/**
 * منوی «همه خدمات» — دکمه شناور همبرگری که یک منوی تمام‌صفحه با همهٔ
 * بخش‌های سایت باز می‌کند. با framer-motion: ورود فنری پنل + ورود پلکانی آیتم‌ها.
 */

type MenuItem = { label: string; href: string; icon: IconKey; desc?: string };
type MenuGroup = { title: string; items: MenuItem[] };

const MENU_GROUPS: MenuGroup[] = [
  {
    title: "مسیرهای اصلی",
    items: [
      { label: "وکیل‌یابی", href: "/lawyers", icon: "search", desc: "جست‌وجوی وکیل با فیلتر تخصص و شهر" },
      { label: "رزرو مشاوره", href: "/consultation", icon: "calendar", desc: "متنی، صوتی و تصویری" },
      { label: "ثبت پرونده", href: "/case/new", icon: "folder", desc: "ارزیابی اولیه و معرفی وکیل" },
      { label: "بازار پرونده‌ها", href: "/case-board", icon: "gavel", desc: "پرونده‌های باز و پیشنهاد قیمت وکلا" },
      { label: "پیگیری پرونده", href: "/track-case", icon: "clock", desc: "وضعیت لحظه‌ای پرونده" },
    ],
  },
  {
    title: "ابزارهای هوشمند",
    items: [
      { label: "دستیار هوش مصنوعی", href: "/ai-assistant", icon: "sparkles", desc: "پاسخ فوری با استناد قانونی" },
      { label: "تحلیل قرارداد", href: "/contracts/review", icon: "file", desc: "کشف بندهای پرریسک" },
      { label: "قراردادساز", href: "/contracts/builder", icon: "document", desc: "ساخت قرارداد گام‌به‌گام" },
      { label: "فرم‌های حقوقی", href: "/legal-forms", icon: "mail", desc: "دادخواست، شکواییه، اظهارنامه" },
    ],
  },
  {
    title: "خدمات ویژه",
    items: [
      { label: "خدمات حضوری و اداری", href: "/services", icon: "signature", desc: "نماینده دادبان به‌جای شما" },
      { label: "وکیل کارمندان", href: "/employee-lawyers", icon: "briefcase", desc: "حقوق کار و تأمین اجتماعی" },
      { label: "تعرفه خدمات", href: "/pricing", icon: "coins", desc: "قیمت شفاف پیش از تصمیم" },
      { label: "برای کسب‌وکارها", href: "/business", icon: "briefcase", desc: "حقوق شرکت‌ها و B2B" },
    ],
  },
  {
    title: "دانش حقوقی",
    items: [
      { label: "مقالات", href: "/knowledge", icon: "book", desc: "بانک مقالات حقوقی" },
      { label: "قوانین", href: "/laws", icon: "landmark", desc: "مرکز قوانین" },
      { label: "آرای قضایی", href: "/judgments", icon: "gavel", desc: "رویه قضایی" },
      { label: "پرسش و پاسخ", href: "/qa", icon: "chat", desc: "پاسخ وکلای متخصص" },
      { label: "واژه‌نامه حقوقی", href: "/glossary", icon: "book", desc: "اصطلاحات حقوقی" },
    ],
  },
];

export function SiteMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  /* Intopia Keyboard & Focus: فوکوس هنگام باز شدن به دکمهٔ بستن،
     هنگام بستن به دکمهٔ فراخوان (FAB) برمی‌گردد */
  const fabRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // بستن با Escape + قفل اسکرول بدنه
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        fabRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // بستن هنگام تغییر مسیر
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  // FAB همیشه رندر می‌شود (SSR هم دارد)؛ دراور فقط با کلیک باز می‌شود → فقط کلاینت
  return (
    <>
      {/* دکمه شناور — بالای FAB «مشاور همراه» (چت) چیده می‌شود تا تداخل نکند */}
      <motion.button
        ref={fabRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("همه خدمات دادبان")}
        aria-haspopup="dialog"
        aria-expanded={open}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, type: "spring", stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-40 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/40 bg-surface/90 text-accent-text shadow-[var(--shadow-lift)] backdrop-blur sm:bottom-24 sm:right-6"
      >
        <Icon name="menu" className="h-6 w-6" />
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
          <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-black leading-4 text-accent-foreground">+</span>
        </span>
      </motion.button>

      {open &&
        createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[95]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              role="dialog"
              aria-modal="true"
              aria-label={t("همه خدمات دادبان")}
            >
              {/* پس‌زمینه */}
              <motion.div
                className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              {/* پنل از راست (RTL) */}
              <motion.div
                className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface shadow-[var(--shadow-lift)]"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 32 }}
              >
                {/* هدر */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 p-4 backdrop-blur">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                      <Icon name="menu" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-foreground">{t("همه خدمات دادبان")}</p>
                      <p className="text-[11px] text-muted">{t("هر بخش سایت، یک‌جا در دسترس")}</p>
                    </div>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      fabRef.current?.focus();
                    }}
                    aria-label={t("بستن منو")}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-all hover:bg-surface-2 hover:text-foreground active:scale-90"
                  >
                    <Icon name="x" className="h-5 w-5" />
                  </button>
                </div>

                {/* گروه‌ها */}
                <div className="flex-1 space-y-5 p-4">
                  {MENU_GROUPS.map((group, gi) => (
                    <motion.section
                      key={group.title}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + gi * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-muted">{t(group.title)}</p>
                      <div className="overflow-hidden rounded-2xl border border-border">
                        {group.items.map((item, ii) => (
                          <motion.div
                            key={item.href}
                            initial={{ opacity: 0, x: 24 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.14 + gi * 0.07 + ii * 0.045, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          >
                            <Link
                              href={item.href}
                              className={`group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-surface-2 active:bg-surface-3 ${
                                ii > 0 ? "border-t border-border" : ""
                              }`}
                            >
                              <span
                                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
                                  item.icon === "sparkles" ? "bg-accent-soft text-accent-text" : "bg-primary-soft text-primary"
                                }`}
                              >
                                <Icon name={item.icon} className="h-4 w-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-foreground">{t(item.label)}</span>
                                {item.desc && <span className="block truncate text-[11px] text-muted">{t(item.desc)}</span>}
                              </span>
                              <Icon name="chevron" className="h-4 w-4 shrink-0 rotate-180 text-muted opacity-40 transition-opacity group-hover:opacity-100" />
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </motion.section>
                  ))}
                </div>

                {/* پایین — ورود */}
                <div className="sticky bottom-0 border-t border-border bg-surface/95 p-4 backdrop-blur">
                  <Link
                    href="/dashboard/client"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-hover active:scale-[0.98]"
                  >
                    <Icon name="user" className="h-4 w-4" />
                    {t("ورود / ثبت‌نام")}
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
