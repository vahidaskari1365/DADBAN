"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/icons";
import { faNum, faPrice } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/**
 * «کارهای حضوری، با نمایندهٔ دادورزان» — معرفی ۸ خدمت حضوری/اداری با قیمت.
 * تصویر بنر + کارت‌های اسکرول-اسنپ افقی (موبایل) و گرید (دسکتاپ).
 * داده از CATALOG_SERVICES (فیلتر ADMINISTRATIVE) به‌صورت اسلیم از سرور می‌آید.
 */

export type InPersonService = {
  slug: string;
  title: string;
  desc: string;
  icon: string;
  basePrice: number;
  estimatedTime: string;
};

const spring = { type: "spring" as const, stiffness: 200, damping: 24 };

export function InPersonServices({ services, totalCount }: { services: InPersonService[]; totalCount: number }) {
  const t = useT();
  const tf = templateT(t);
  if (services.length === 0) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr] lg:gap-8">
      {/* بنر تصویری */}
      <motion.div
        initial={{ opacity: 0, x: 34, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "0px 0px -60px 0px" }}
        transition={{ ...spring, delay: 0.05 }}
        className="relative min-h-64 overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-lift)] lg:min-h-full"
      >
        <div className="absolute inset-0 animate-[kenburns_30s_ease-in-out_infinite_alternate]">
          <Image
            src="/images/inperson-services.png"
            alt={t("نماینده حقوقی دادورزان با پرونده در راهرو دادگستری")}
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-black text-accent-foreground shadow-md">
            <Icon name="badge" className="h-3.5 w-3.5" />
            {t("با وکالت‌نامه رسمی")}
          </span>
          <p className="mt-3 text-lg font-black leading-7 text-primary-foreground">
            {t("صف اداره‌ها با ما؛")}
            <br />
            {t("کارتان با شما.")}
          </p>
          <p className="mt-1.5 text-xs leading-6 text-primary-foreground/70">
            {t("نمایندهٔ دادورزان به‌جای شما حاضر می‌شود و هر گام در پنل‌تان گزارش می‌شود.")}
          </p>
        </div>
      </motion.div>

      {/* کارت‌های خدمات */}
      <div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s, i) => (
            <motion.div
              key={s.slug}
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "0px 0px -40px 0px" }}
              transition={{ ...spring, delay: 0.08 + i * 0.05 }}
            >
              <Link
                href={`/services/${s.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <Icon name={s.icon as IconKey} className="h-5 w-5" />
                  </span>
                  <Icon name="arrow" className="h-4 w-4 text-muted opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100" />
                </div>
                <h3 className="mt-3 text-sm font-black leading-6 text-foreground">{s.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-[11px] leading-5 text-muted">{s.desc}</p>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                  <span className="text-[11px] font-bold text-accent-text">{tf("از {p} تومان", { p: faPrice(s.basePrice) })}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                    <Icon name="clock" className="h-3 w-3" />
                    {s.estimatedTime}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* کارت پایانی: همه خدمات */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...spring, delay: 0.08 + services.length * 0.05 }}
          >
            <Link
              href="/services"
              className="group flex h-full min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/40 p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-accent-soft/70"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-transform duration-300 group-hover:rotate-90">
                <Icon name="plus" className="h-5 w-5" />
              </span>
              <p className="text-sm font-black text-foreground">
                {tf("همهٔ {n} خدمت دادورزان", { n: faNum(totalCount) })}
              </p>
              <p className="text-[11px] text-muted">{t("مشاهدهٔ فهرست کامل خدمات")}</p>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
