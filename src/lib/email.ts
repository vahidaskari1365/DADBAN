import "server-only";
import { db, isDbConfigured } from "@/db";
import { emailOutbox } from "@/db/schema";
import { ensureExtendedSchema } from "@/lib/auto-seed";
import { logger } from "@/lib/logger";

/**
 * ============================================================================
 * dadban — زیرساخت ایمیل (provider-agnostic، صادقانه از اساس)
 * ----------------------------------------------------------------------------
 * - با RESEND_API_KEY  → ارسال واقعی با Resend (HTTP، بدون وابستگی SMTP)
 * - با SMTP_URL        → ارسال واقعی با nodemailer (هاست‌های ایرانی/سرویس میل)
 * - بدون هیچ‌کدام      → «حالت ثبت»: ایمیل ساخته و در email_outbox ثبت می‌شود
 *   تا ادمین در پنل ببیند چه ایمیلی برای چه کسی می‌رفت — هیچ موفقیتی ساختگی
 *   نمایش داده نمی‌شود (همان صداقتِ provider=manual پرداخت).
 *
 * هر ارسال (موفق، ناموفق یا ثبت‌شده) یک ردیف غیرقابل‌تغییر در email_outbox می‌گذارد.
 * NEVER throws: خطای ایمیل هرگز نباید مسیر اصلی (پرداخت/ثبت‌نام) را بشکند.
 * ============================================================================
 */

export type EmailKind = "receipt" | "welcome" | "password_reset" | "onboarding" | "broadcast";

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: EmailKind;
}

export interface EmailResult {
  ok: boolean;
  /** پیام واقعاً به گیرنده رسید؟ (در حالت ثبت false است) */
  delivered: boolean;
  provider: "resend" | "smtp" | "log";
  error?: string;
}

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY || process.env.SMTP_URL);
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM || "دادبان <noreply@dadban.ir>";
}

/* ─── ارسال با Resend (HTTP API) ─────────────────────────────────────────── */

async function sendViaResend(input: EmailInput): Promise<EmailResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: emailFrom(), to: [input.to], subject: input.subject, html: input.html, text: input.text }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, delivered: false, provider: "resend", error: `resend ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true, delivered: true, provider: "resend" };
  } catch (err) {
    return { ok: false, delivered: false, provider: "resend", error: err instanceof Error ? err.message : "resend failed" };
  }
}

/* ─── ارسال با SMTP (nodemailer — فقط وقتی SMTP_URL تنظیم باشد import می‌شود) ── */

async function sendViaSmtp(input: EmailInput): Promise<EmailResult> {
  try {
    const nodemailer = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport(process.env.SMTP_URL as string);
    await transport.sendMail({
      from: emailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { ok: true, delivered: true, provider: "smtp" };
  } catch (err) {
    return { ok: false, delivered: false, provider: "smtp", error: err instanceof Error ? err.message : "smtp failed" };
  }
}

/* ─── ثبت اجباری در صندوق خروجی — رد financial-style غیرقابل‌تغییر ───────── */

async function recordOutbox(input: EmailInput, result: Omit<EmailResult, "ok">): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await ensureExtendedSchema();
    await db.insert(emailOutbox).values({
      toEmail: input.to,
      kind: input.kind,
      subject: input.subject,
      bodyHtml: input.html.slice(0, 50_000),
      bodyText: input.text.slice(0, 20_000),
      status: result.delivered ? "sent" : result.error ? "failed" : "logged",
      provider: result.provider,
      error: result.error ?? null,
      sentAt: result.delivered ? new Date() : null,
    });
  } catch (err) {
    logger.warn("[email] outbox record failed", { error: err instanceof Error ? err.message : String(err) });
  }
}

/** ارسال ایمیل — هیچ‌وقت throw نمی‌کند؛ نتیجهٔ صادقانه برمی‌گرداند. */
export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  let result: Omit<EmailResult, "ok">;
  if (process.env.RESEND_API_KEY) {
    result = await sendViaResend(input);
  } else if (process.env.SMTP_URL) {
    result = await sendViaSmtp(input);
  } else {
    result = { delivered: false, provider: "log", error: undefined };
  }
  await recordOutbox(input, result);
  if (!result.delivered && result.provider === "log") {
    logger.info("[email:log-mode] email recorded (no provider configured)", { to: input.to, kind: input.kind, subject: input.subject });
  }
  return { ok: true, ...result };
}

/* ───────────────────────── قالب‌های برند (RTL فارسی) ───────────────────── */

function shell(title: string, bodyHtml: string, footerNote?: string): { html: string; text: string } {
  const text = bodyHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-3]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const html = `<!doctype html>
<html lang="fa" dir="rtl"><body style="margin:0;padding:0;background:#f4f6f9;font-family:Tahoma,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:#102a4a;border-radius:16px 16px 0 0;padding:20px 24px;text-align:center;">
    <span style="color:#f0b429;font-size:22px;font-weight:bold;letter-spacing:.5px;">دادبان</span>
    <span style="color:#dbe6f5;font-size:12px;margin-inline-start:8px;">همراه حقوقی شما</span>
  </div>
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:28px 24px;color:#1c2b3a;line-height:2;font-size:14px;">
    <h2 style="margin:0 0 16px;font-size:18px;color:#102a4a;">${title}</h2>
    ${bodyHtml}
  </div>
  <p style="text-align:center;color:#8a97a8;font-size:11px;line-height:1.8;margin-top:16px;">
    ${footerNote ?? "این ایمیل به‌درخواست سامانهٔ دادبان ارسال شده است."}<br/>
    <a href="https://dadban-brown.vercel.app" style="color:#15365d;">dadban-brown.vercel.app</a>
  </p>
</div>
</body></html>`;
  return { html, text };
}

/** رسید پرداخت — پس از تأیید پرداخت (verified) صادر می‌شود. */
export async function sendPaymentReceiptEmail(to: string, p: { reference: string; amount: number; description: string }): Promise<EmailResult> {
  const amountStr = `${p.amount.toLocaleString("fa-IR")} تومان`;
  const { html, text } = shell(
    "رسید پرداخت شما",
    `<p>پرداخت شما با موفقیت در سامانه ثبت شد.</p>
     <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:12px;overflow:hidden;">
       <tr><td style="padding:10px 14px;color:#5b6b7e;">شرح</td><td style="padding:10px 14px;font-weight:bold;">${p.description}</td></tr>
       <tr><td style="padding:10px 14px;color:#5b6b7e;">مبلغ</td><td style="padding:10px 14px;font-weight:bold;color:#102a4a;">${amountStr}</td></tr>
       <tr><td style="padding:10px 14px;color:#5b6b7e;">شماره پیگیری</td><td style="padding:10px 14px;font-family:monospace;direction:ltr;text-align:left;">${p.reference}</td></tr>
     </table>
     <p style="color:#5b6b7e;font-size:12px;">این رسید در پنل کاربری شما نیز قابل مشاهده است.</p>`,
  );
  return sendEmail({ to, subject: `رسید پرداخت — ${p.description}`, html, text, kind: "receipt" });
}

/** خوش‌آمدگویی ثبت‌نام */
export async function sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
  const { html, text } = shell(
    `خوش آمدید ${name} عزیز`,
    `<p>حساب شما در دادبان ساخته شد. از این پس می‌توانید:</p>
     <ul style="padding-inline-start:20px;margin:8px 0;">
       <li>پرونده‌تان را به رقابت بگذارید و بهترین پیشنهاد را انتخاب کنید</li>
       <li>از دستیار هوشمند حقوقی پرسش‌هایتان را بپرسید</li>
       <li>قراردادهایتان را تحلیل و پیگیری کنید</li>
     </ul>
     <p><a href="https://dadban-brown.vercel.app/dashboard/client" style="display:inline-block;background:#f0b429;color:#102a4a;font-weight:bold;text-decoration:none;padding:10px 22px;border-radius:10px;">ورود به پنل کاربری</a></p>`,
  );
  return sendEmail({ to, subject: "به دادبان خوش آمدید", html, text, kind: "welcome" });
}

/** کد بازیابی رمز عبور */
export async function sendPasswordResetEmail(to: string, code: string): Promise<EmailResult> {
  const { html, text } = shell(
    "بازیابی رمز عبور",
    `<p>کد بازیابی رمز عبور شما:</p>
     <p style="text-align:center;font-size:30px;font-weight:bold;letter-spacing:8px;color:#102a4a;direction:ltr;">${code}</p>
     <p style="color:#5b6b7e;font-size:12px;">این کد ۱۰ دقیقه اعتبار دارد. اگر شما درخواست نداده‌اید، این ایمیل را نادیده بگیرید.</p>`,
  );
  return sendEmail({ to, subject: "کد بازیابی رمز عبور — دادبان", html, text, kind: "password_reset" });
}

/** نتیجهٔ روی‌بوردینگ وکیل (تأیید/رد) */
export async function sendOnboardingResultEmail(to: string, name: string, approved: boolean, note?: string): Promise<EmailResult> {
  const { html, text } = shell(
    approved ? "درخواست همکاری شما تأیید شد" : "نتیجهٔ بررسی درخواست همکاری",
    approved
      ? `<p>تبریک! مدارک شما تأیید شد و پروفایل وکیل شما در دادبان فعال گردید.</p>
         <p><a href="https://dadban-brown.vercel.app/dashboard/lawyer" style="display:inline-block;background:#f0b429;color:#102a4a;font-weight:bold;text-decoration:none;padding:10px 22px;border-radius:10px;">ورود به پنل وکیل</a></p>`
      : `<p>متأسفانه درخواست همکاری شما در این مرحله تأیید نشد.</p>${note ? `<p style="color:#5b6b7e;">توضیح کارشناس: ${note}</p>` : ""}
         <p style="color:#5b6b7e;font-size:12px;">در صورت نیاز به پیگیری با پشتیبانی در تماس باشید.</p>`,
  );
  return sendEmail({ to, subject: approved ? "تأیید همکاری — دادبان" : "نتیجهٔ بررسی درخواست همکاری — دادبان", html, text, kind: "onboarding" });
}
