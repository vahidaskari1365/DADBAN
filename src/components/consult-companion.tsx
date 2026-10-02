"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/components/icons";

/**
 * مشاور همراه — چت هوش مصنوعی انسانی.
 *
 * ویژگی‌ها:
 *  - گفتگوی natural با LLM
 *  - آگاه از سایت: اگه کاربر چیزی بپرسه که در سایت هست، راهنمایی می‌کنه
 *  - memory (۵ پیام آخر)
 *  - typing indicator واقعی
 *  - quick actions (دکمه‌های سریع)
 *  - قابل دسترس از همه‌ی صفحات (FAB شناور)
 */

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** آیا پاسخ شامل ارجاع به صفحه‌ای در سایت هست؟ */
  links?: { label: string; href: string }[];
}

interface ConsultCompanionProps {
  /** اگه true باشه، FAB شناور نمایش داده نمی‌شه (مثلاً در صفحه‌ی خود assistant) */
  hideFab?: boolean;
}

/** System prompt — مشاور همراه، آگاه از سایت. */
const SYSTEM_PROMPT = `تو «مشاور همراه دادپیو» هستی — یک دستیار حقوقی هوشمند و دوست‌داشتنی که هم به سوالات حقوقی پاسخ می‌ده و هم در استفاده از سایت به کاربر کمک می‌کند.

ویژگی‌های شخصیت تو:
- لحن دوستانه، گرم و حرفه‌ای — مثل یک دوست وکیل
- پاسخ‌های مختصر و کاربردی (۳-۸ خط)
- همیشه فارسی روان صحبت کن
- اگه نمی‌دونی، صادقانه بگو

اطلاعات سایت که می‌توانی به کاربر معرفی کنی:
- /lawyers — جستجوی وکیل متخصص (بر اساس تخصص و شهر)
- /consultation — رزرو مشاوره متنی/صوتی/تصویری با وکیل
- /case/new — ثبت پرونده حقوقی
- /contracts — تنظیم و بررسی قرارداد
- /contracts/builder — ساخت قرارداد اختصاصی
- /contracts/review — بررسی قرارداد موجود
- /ai-assistant — دستیار حقوقی هوش مصنوعی (پاسخ با استناد به قانون)
- /services — خدمات پیگیری و انجام امور
- /services/category/family — خدمات خانواده (طلاق، مهریه، حضانت، نفقه، ارث)
- /services/category/property — خدمات ملکی (تخلیه، تصرف عدوانی، اجاره)
- /services/category/criminal — خدمات کیفری
- /services/category/commercial — خدمات تجاری
- /services/category/administrative — خدمات کار و مالیات
- /knowledge — مقالات حقوقی
- /qa — پرسش و پاسخ حقوقی
- /laws — مرکز قوانین ایران
- /judgments — آرای قضایی
- /glossary — واژه‌نامه حقوقی
- /pricing — تعرفه خدمات
- /business — خدمات کسب‌وکار
- /support — پشتیبانی
- /consultation/live — مشاوره زنده تصویری + متنی

قوانین پاسخ:
۱) اگه کاربر می‌خواد کاری انجام بده (مثلاً «وکیل می‌خوام»، «قرارداد می‌خوام»)، هم راهنمایی کن و هم لینک صفحه‌ی مربوطه رو معرفی کن.
۲) اگه سوال حقوقی پرسید (مثلاً «مهریه چطور مطالبه می‌شه؟»)، پاسخ کوتاه بده و پیشنهاد کن از /ai-assistant استفاده کنه.
۳) اگه اطلاعات تماس خواست (مثلاً شماره)، بگو به /support مراجعه کنه.
۴) در پایان پاسخ‌های طولانی، یک پیشنهاد بعدی بده (مثلاً «اگه بخوای با وکیل صحبت کنی، /consultation رو ببین»).

یادآوری: تو وکیل رسمی نیستی و نمی‌توانی مشاوره‌ی حقوقی قطعی بدی. در موارد حساس، همیشه کاربر را به مشاوره با وکیل واقعی ارجاع بده.`;

const QUICK_ACTIONS = [
  { label: "وکیل می‌خوام", query: "می‌خوام یک وکیل پیدا کنم" },
  { label: "مشاوره آنلاین", query: "چطور مشاوره آنلاین بگیرم؟" },
  { label: "تنظیم قرارداد", query: "می‌خوام یک قرارداد تنظیم کنم" },
  { label: "ثبت پرونده", query: "چطور پرونده حقوقی ثبت کنم؟" },
];

const GREETING_OPENED_AT = Date.now(); // یک‌بار در زمان لود ماژول — خارج از رندر کامپوننت

export function ConsultCompanion({ hideFab = false }: ConsultCompanionProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "سلام! 👋 من «مشاور همراه دادپیو» هستم.\n\nهر سوال حقوقی داری بپرس، یا اگه می‌خوای کاری انجام بدی (وکیل پیدا کن، قرارداد بسازی، مشاوره بگیری) راهنماییت می‌کنم.\n\nچطور می‌تونم کمکت کنم؟",
      timestamp: GREETING_OPENED_AT,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // اسکرول به پایین هنگام پیام جدید
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  // focus روی input هنگام باز شدن (فقط سیستم‌های خارجی را همگام می‌کند)
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ارسال پیام
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // استفاده از API موجود AI assistant با streaming
      const history = messages.slice(-5).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/consult-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history,
        }),
      });

      if (!res.ok) throw new Error("API failed");

      const data = await res.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer || "متأسفم، الان نمی‌تونم پاسخ بدم. لطفاً دوباره تلاش کن.",
        timestamp: Date.now(),
        links: data.links || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!open) {
        setUnreadCount((c) => c + 1);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "متأسفم، ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کن یا از طریق /support با ما تماس بگیر.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // FAB شناور — نمایش در همه‌ی صفحات
  if (hideFab && !open) return null;

  return (
    <>
      {/* دکمه‌ی شناور (FAB) — در سمت چپ پایین، هماهنگ با پنجره‌ی چت */}
      {!open && !hideFab && (
        <button
          onClick={() => { setOpen(true); setUnreadCount(0); }}
          aria-label="مشاور همراه"
          className="fixed bottom-24 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-lift)] transition-all hover:scale-105 active:scale-95 sm:bottom-6 sm:left-6"
        >
          <Icon name="chat" className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">مشاور همراه</span>
        </button>
      )}

      {/* پنجره‌ی چت — در سمت چپ، هماهنگ با موقعیت FAB */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-start p-0 sm:inset-auto sm:bottom-6 sm:left-6 sm:p-0">
          {/* پس‌زمینه تیره (موبایل) */}
          <div
            className="absolute inset-0 bg-black/30 sm:hidden"
            onClick={() => setOpen(false)}
          />

          {/* پنجره‌ی چت */}
          <div className="relative flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-[var(--shadow-lift)] sm:h-[600px] sm:w-[400px] sm:rounded-3xl">
            {/* هدر */}
            <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Icon name="chat" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">مشاور همراه</h3>
                  <p className="text-[10px] opacity-80">آنلاین · پاسخ فوری</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="بستن"
                className="rounded-lg p-2 transition-colors hover:bg-primary-foreground/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>

            {/* پیام‌ها */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto bg-background p-3"
              style={{ maxHeight: "calc(85vh - 160px)" }}
            >
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                  >
                    <div className={`max-w-[85%] ${msg.role === "user" ? "" : "flex flex-col items-end"}`}>
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "rounded-bl-md bg-primary-soft text-foreground"
                            : "rounded-br-md bg-surface-3 text-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* لینک‌های پیشنهادی */}
                      {msg.links && msg.links.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.links.map((link, j) => (
                            <a
                              key={j}
                              href={link.href}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                            >
                              {link.label}
                              <Icon name="arrow" className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* typing indicator */}
                {loading && (
                  <div className="flex justify-end">
                    <div className="flex items-center gap-1 rounded-2xl rounded-br-md bg-surface-3 px-4 py-3">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-muted"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-muted"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* quick actions (فقط در اولین پیام) */}
            {messages.length === 1 && !loading && (
              <div className="border-t border-border bg-surface p-2">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.query)}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-soft transition-colors hover:bg-surface-2"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* input */}
            <form onSubmit={handleSubmit} className="border-t border-border bg-surface p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="سوالت رو بپرس..."
                  disabled={loading}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all active:scale-90 disabled:opacity-50"
                  aria-label="ارسال"
                >
                  <Icon name="send" className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted">
                پاسخ‌های هوش مصنوعی برای راهنمایی است و جایگزین مشاوره‌ی حقوقی رسمی نیست.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
