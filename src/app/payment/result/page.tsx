import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { faNum } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نتیجهٔ پرداخت",
  robots: { index: false },
};

/**
 * /payment/result — صفحهٔ نتیجهٔ پرداخت (مقصد callback زرین‌پال).
 * فقط وضعیت صادقانهٔ ثبت‌شده در سرور نمایش داده می‌شود؛ تأیید نهایی همیشه
 * در سرور با verify.json درگاه انجام شده است — این صفحه فقط گزارش است.
 */
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; ref?: string }>;
}) {
  const sp = await searchParams;
  const state = (sp.state ?? "").toLowerCase();
  const ref = (sp.ref ?? "").slice(0, 80);

  const STATES = {
    ok: {
      tone: "success" as const,
      emoji: "✅",
      title: "پرداخت با موفقیت انجام شد",
      desc: "رسید برای شما ثبت شد. در صورت نیاز تیم دادبان با شما در تماس خواهد بود.",
    },
    cancelled: {
      tone: "neutral" as const,
      emoji: "↩️",
      title: "پرداخت لغو شد",
      desc: "تراکنش تکمیل نشد. هر وقت بخواهید می‌توانید دوباره از همان مسیر پرداخت را انجام دهید.",
    },
    failed: {
      tone: "danger" as const,
      emoji: "⚠️",
      title: "پرداخت ناموفق بود",
      desc: "تأیید درگاه انجام نشد. اگر مبلغ از حساب شما کسر شده باشد، به‌صورت خودکار طی چند روز بازمی‌گردد؛ یا با پشتیبانی تماس بگیرید.",
    },
    notfound: {
      tone: "danger" as const,
      emoji: "🔍",
      title: "پرداخت پیدا نشد",
      desc: "چنین ارجاعی در سیستم ثبت نشده است. کد پیگیری را با رسید مقایسه کنید.",
    },
    invalid: {
      tone: "danger" as const,
      emoji: "🔗",
      title: "لینک نتیجهٔ پرداخت ناقص است",
      desc: "کد ارجاع در لینک نبود. از داشبورد خود وضعیت پرداخت‌ها را دنبال کنید.",
    },
    error: {
      tone: "danger" as const,
      emoji: "🛠",
      title: "خطای داخلی در بررسی پرداخت",
      desc: "مشکلی موقت پیش آمد. چند لحظه بعد دوباره تلاش کنید یا با پشتیبانی در تماس باشید.",
    },
  } as const;
  const config = STATES[(state in STATES ? state : "error") as keyof typeof STATES];

  const borderClass =
    config.tone === "success"
      ? "border-success/40 bg-[color-mix(in_oklab,var(--success)_10%,transparent)]"
      : config.tone === "danger"
        ? "border-danger/40 bg-[color-mix(in_oklab,var(--danger)_10%,transparent)]"
        : "border-border bg-surface";

  return (
    <Container className="py-14">
      <div className={`mx-auto max-w-lg rounded-3xl border p-8 text-center card-shadow ${borderClass}`}>
        <div className="mb-3 text-5xl">{config.emoji}</div>
        <h1 className="mb-2 text-xl font-black text-foreground">{config.title}</h1>
        <p className="mb-5 text-sm leading-6 text-muted">{config.desc}</p>
        {ref ? (
          <p className="mb-5 inline-block rounded-xl bg-surface-2 px-4 py-2 text-xs text-muted" dir="ltr">
            {faNum(ref)}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            بازگشت به خانه
          </Link>
          <Link
            href="/support"
            className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-bold text-foreground transition hover:bg-surface-2"
          >
            پشتیبانی
          </Link>
        </div>
      </div>
    </Container>
  );
}
