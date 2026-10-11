"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";
import { formatJalali } from "@/lib/jalali";

/**
 * کارت «اتصال تلگرام» در پروفایل موکل — اطلاع‌رسانی زندهٔ پرونده.
 *
 * صداقت: وضعیت ربات همیشه از GET /api/telegram/connect خوانده می‌شود؛
 * اگر ربات فعال نباشد بنر کهربایی صادقانه نمایش داده می‌شود و هیچ
 * موفقیتی ساختگی ادعا نمی‌شود. اتصال فقط پس از موفق بودن «پیام آزمایشی واقعی»
 * ثبت می‌شود (سرور اعمال می‌کند).
 */

type TgLink = { id: number; chatId: string; active: boolean; createdAt: string };

/** نام کاربری ربات — اختیاری؛ در نبودش فقط متن راهنما نشان داده می‌شود */
const BOT_USER = (process.env.NEXT_PUBLIC_TELEGRAM_BOT ?? "").replace(/^@/, "").trim();

/** یکسان‌سازی ارقام فارسی/عربی → لاتین (هم‌الگو با PhoneVerificationRow) */
const toEnDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export function TelegramConnect() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [links, setLinks] = useState<TgLink[]>([]);
  const [chatId, setChatId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);

  /**
   * بارگذاری وضعیت از سرور. withSpinner=false برای لود اولیه است (وضعیت از قبل
   * «در حال بارگذاری» است) تا هیچ setState همگانی در بدنهٔ useEffect رخ ندهد.
   */
  const load = useCallback(async (withSpinner = true) => {
    if (withSpinner) {
      setLoading(true);
      setLoadFailed(false);
    }
    try {
      const res = await fetch("/api/telegram/connect", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; configured?: boolean; links?: TgLink[]; error?: string };
      if (res.ok && data.ok) {
        setConfigured(data.configured === true);
        setLinks(Array.isArray(data.links) ? data.links : []);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/telegram/connect", { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; configured?: boolean; links?: TgLink[]; error?: string };
        if (cancelled) return;
        if (res.ok && data.ok) {
          setConfigured(data.configured === true);
          setLinks(Array.isArray(data.links) ? data.links : []);
        } else {
          setLoadFailed(true);
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    const cid = toEnDigits(chatId).replace(/\D/g, "");
    if (cid.length < 5 || cid.length > 16) {
      toast.error(t("شناسهٔ چت فقط باید عدد باشد (۵ تا ۱۶ رقم)."));
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: cid }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        toast.success(t("اتصال تلگرام ثبت شد؛ پیام آزمایشی به چت شما ارسال شد."));
        setChatId("");
        await load();
      } else {
        toast.error(data.error ?? t("اتصال تلگرام ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setConnecting(false);
    }
  }

  async function unlink(id: number) {
    setUnlinkingId(id);
    try {
      const res = await fetch(`/api/telegram/connect?id=${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (res.ok && data.ok) {
        toast.success(t("اتصال قطع شد."));
        setLinks((prev) => prev.filter((l) => l.id !== id));
      } else {
        toast.error(data.error ?? t("قطع اتصال ناموفق بود."));
        await load();
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setUnlinkingId(null);
    }
  }

  const inputCls =
    "h-12 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:opacity-50";

  return (
    <Card hover={false} data-testid="tg-card">
      <h2 className="flex items-center gap-2 font-bold text-foreground">
        <Icon name="send" className="h-5 w-5 text-primary" /> {t("اتصال تلگرام")}
      </h2>
      <p className="mb-4 mt-1 text-xs leading-6 text-muted">
        {t("۱) در ربات دادبان دکمهٔ Start را بزنید تا شناسهٔ چت شما ارسال شود.")}{" "}
        {t("۲) شناسه را اینجا وارد کنید.")}
        {BOT_USER ? " " : ""}
        {BOT_USER && (
          <>
            <a
              href={`https://t.me/${BOT_USER}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-1 font-bold text-primary underline decoration-dotted underline-offset-4 hover:opacity-80"
            >
              <Icon name="link" className="h-3.5 w-3.5" />
              <span dir="ltr">@{BOT_USER}</span>
            </a>
          </>
        )}
      </p>

      {/* حالت لود اولیه — صادقانه */}
      {loading && (
        <p className="flex items-center gap-2 py-2 text-xs text-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-transparent" aria-hidden />
          {t("در حال بررسی وضعیت ربات…")}
        </p>
      )}

      {/* خطای لود — صادقانه + تلاش مجدد */}
      {!loading && loadFailed && (
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--danger)_28%,transparent)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] p-3">
          <p role="alert" className="text-xs font-bold leading-6 text-danger">
            {t("وضعیت اتصال تلگرام در دسترس نیست؛ لطفاً دوباره تلاش کنید.")}
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
            {t("تلاش مجدد")}
          </Button>
        </div>
      )}

      {!loading && !loadFailed && (
        <>
          {/* ربات فعال نیست — بنر کهربایی صادقانه + فرم غیرفعال */}
          {!configured && (
            <p
              role="alert"
              data-testid="tg-not-configured"
              className="rounded-xl border border-accent/30 bg-accent-soft p-3 text-xs font-bold leading-6 text-accent-text"
            >
              {t("ربات تلگرام هنوز فعال نشده است. پس از فعال‌سازی، همین بخش برای اتصال چت شما به حساب کاربری فعال می‌شود.")}
            </p>
          )}

          <form onSubmit={connect} className="mt-1 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">{t("شناسهٔ چت تلگرام (Chat ID)")}</span>
              <input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                placeholder="123456789"
                disabled={!configured || connecting}
                data-testid="tg-chat-id"
                aria-label={t("شناسهٔ چت تلگرام")}
                className={`${inputCls} font-mono`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                size="lg"
                icon="send"
                disabled={!configured || connecting}
                data-testid="tg-connect"
              >
                {connecting ? t("در حال ارسال پیام آزمایشی…") : t("اتصال و پیام آزمایشی")}
              </Button>
              <p className="text-[11px] leading-5 text-muted">
                {t("اتصال فقط زمانی ثبت می‌شود که پیام آزمایشی واقعاً به چت شما ارسال شود.")}
              </p>
            </div>
          </form>

          {/* لینک‌های متصل به حساب */}
          <div className="mt-5 border-t border-border pt-4">
            <p className="mb-2 text-xs font-bold text-foreground">{t("چت‌های متصل به حساب شما")}</p>
            {links.length === 0 ? (
              <p className="text-xs text-muted">{t("هنوز چتی متصل نشده است.")}</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pl-1">
                {links.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p dir="ltr" className="text-left font-mono text-sm font-bold text-foreground">
                        {l.chatId}
                      </p>
                      <p className="text-[11px] text-muted">
                        {l.active ? t("فعال") : t("غیرفعال")} • {formatJalali(l.createdAt)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon="trash"
                      disabled={unlinkingId === l.id}
                      data-testid="tg-unlink"
                      aria-label={t("قطع اتصال این چت")}
                      onClick={() => void unlink(l.id)}
                    >
                      {unlinkingId === l.id ? t("در حال قطع…") : t("قطع اتصال")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
