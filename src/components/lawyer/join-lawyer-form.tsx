"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LEGAL_TOPICS, LOCATIONS, faNum } from "@/lib/data";
import { formatJalaliDateTime } from "@/lib/jalali";

/**
 * فرم «همکاری با دادبان» — روی‌بوردینگ وکلای واقعی (/join-as-lawyer).
 * ثبت درخواست + امضای الکترونیکی قرارداد همکاری؛ نتیجه پس از بررسی کارشناس در
 * پنل کاربری/پشتیبانی اعلام می‌شود (بدون وعدهٔ SMS/ایمیل — صداقت).
 */

export type MyOnboardingRequest = {
  id: number;
  status: string; // pending | approved | rejected
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
} | null;

const AGREEMENT_BULLETS: string[] = [
  "کمیسیون پلتفرم از هر تسویهٔ حق‌الوکاله کسر و در دفتر تراکنش‌ها شفاف ثبت می‌شود.",
  "التزام به تعرفه‌های اعلامی و عدم دریافت مبلغ اضافه از موکل خارج از پلتفرم.",
  "پاسخگویی حرفه‌ای و به‌موقع به موکلان در چت‌ها و جلسات مشاوره.",
  "حفظ اسرار پرونده و محرمانگی کامل اطلاعات موکلان.",
  "تبعیت از قوانین جمهوری اسلامی ایران و مقررات کانون وکلای دادگستری.",
  "شرایط خروج از همکاری: اعلام کتبی ۳۰ روز پیش و تسویهٔ کامل پرونده‌های جاری.",
];
const AGREEMENT_VERSION_LABEL = "نسخهٔ همکاری v1";

const fieldCls =
  "min-h-11 w-full rounded-xl border border-border-strong bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";
const labelCls = "mb-1.5 block text-xs font-bold text-foreground-soft";

const toEnDigits = (v: string) =>
  v
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  loggedIn: boolean;
  alreadyLinked: boolean;
  myRequest: MyOnboardingRequest;
};

export function JoinLawyerForm({ loggedIn, alreadyLinked, myRequest }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [lawyerType, setLawyerType] = useState<"wakil" | "karamooz">("wakil");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const cities = useMemo(
    () => LOCATIONS.find((l) => l.province === province)?.cities ?? [],
    [province],
  );

  /* ── اعتبارسنجی آینهٔ سرور ── */
  const phoneDigits = toEnDigits(phone).replace(/[^\d]/g, "");
  const phoneOk = /^0?9\d{9}$/.test(phoneDigits);
  const emailOk = email.trim() === "" || EMAIL_OK.test(email.trim());
  const expDigits = toEnDigits(experienceYears).replace(/[^\d]/g, "");
  const expOk = expDigits !== "" && Number(expDigits) <= 70;
  const bioLen = bio.trim().length;
  const canSubmit =
    name.trim().length >= 3 &&
    phoneOk &&
    emailOk &&
    licenseNo.trim().length >= 2 &&
    province !== "" &&
    city !== "" &&
    expOk &&
    specialties.length >= 1 &&
    specialties.length <= 6 &&
    bioLen <= 1000 &&
    agree &&
    !sending;

  const toggleSpecialty = (label: string) => {
    setSpecialties((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : prev.length >= 6 ? prev : [...prev, label],
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("لطفاً فیلدهای الزامی را کامل و درست پر کنید و قرارداد همکاری را بپذیرید.");
      return;
    }
    setSending(true);
    try {
      const normalizedPhone = phoneDigits.length === 10 && phoneDigits.startsWith("9") ? `0${phoneDigits}` : phoneDigits;
      const res = await fetch("/api/lawyer-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizedPhone,
          email: email.trim() || null,
          licenseNo: licenseNo.trim(),
          lawyerType,
          province,
          city,
          experienceYears: Number(expDigits),
          specialties,
          bio: bio.trim(),
          agree: true,
        }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "ثبت درخواست انجام نشد؛ دوباره تلاش کنید.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت درخواست انجام نشد؛ دوباره تلاش کنید.");
    } finally {
      setSending(false);
    }
  };

  /* ── حساب از قبل متصل است — فرم معنا ندارد ── */
  if (alreadyLinked) {
    return (
      <Card hover={false} className="mx-auto max-w-2xl p-8 text-center card-shadow" data-testid="join-already-linked">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <Icon name="badge" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-foreground">حساب شما از قبل به پروفایل وکیل متصل است</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
          برای ویرایش اطلاعات حرفه‌ای، تعرفه‌ها و تخصص‌ها به پنل وکیل بروید.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/dashboard/lawyer/profile" icon="badge">پروفایل حرفه‌ای من</Button>
          <Button href="/dashboard/lawyer" variant="outline" icon="home">پنل وکیل</Button>
        </div>
      </Card>
    );
  }

  /* ── درخواست قبلی با وضعیت جاری (pending/approved) — به‌جای فرم؛ rejected → امکان ثبت مجدد ── */
  const activeRequest = myRequest && (myRequest.status === "pending" || myRequest.status === "approved") ? myRequest : null;
  const rejectedRequest = myRequest && myRequest.status === "rejected" ? myRequest : null;

  if (activeRequest) {
    const approved = activeRequest.status === "approved";
    return (
      <Card hover={false} className="mx-auto max-w-2xl p-8 text-center card-shadow" data-testid="join-status">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${approved ? "bg-success/15 text-success" : "bg-accent-soft text-accent-text"}`}>
          <Icon name={approved ? "check" : "clock"} className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-foreground">
          {approved ? "درخواست شما تأیید شد" : "درخواست شما در حال بررسی است"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
          {approved
            ? "پروفایل وکیل شما فعال شده است؛ برای تنظیم تعرفه‌ها و تخصص‌ها وارد پنل وکیل شوید."
            : `درخواست شما در ${formatJalaliDateTime(activeRequest.createdAt)} ثبت شده و توسط کارشناسان بررسی می‌شود (۳ تا ۵ روز کاری).`}
        </p>
        {activeRequest.adminNote && (
          <p className="mx-auto mt-3 max-w-md rounded-xl border border-border bg-surface-2/50 p-3 text-xs leading-6 text-foreground-soft">
            توضیح کارشناس: {activeRequest.adminNote}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {approved ? (
            <Button href="/dashboard/lawyer" icon="home">ورود به پنل وکیل</Button>
          ) : (
            <Button href="/support" variant="outline" icon="shield">تماس با پشتیبانی</Button>
          )}
          <Button href="/" variant="ghost">صفحهٔ اصلی</Button>
        </div>
      </Card>
    );
  }

  /* ── حالت موفقیت — پیام صادقانه بدون وعدهٔ SMS ── */
  if (done) {
    return (
      <Card hover={false} className="mx-auto max-w-2xl p-8 text-center card-shadow" data-testid="join-success">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-foreground">درخواست شما ثبت شد</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
          نتیجهٔ بررسی ۳ تا ۵ روز کاری از طریق پنل کاربری یا پشتیبانی به شما اطلاع داده می‌شود.
        </p>
        <p className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-muted">
          شمارهٔ پیگیری شما همان شمارهٔ موبایلی است که در فرم وارد کردید؛ در تماس با پشتیبانی آن را اعلام کنید.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/support" variant="outline" icon="shield">پشتیبانی</Button>
          {loggedIn ? (
            <Button href="/dashboard/client" icon="home">پنل کاربری</Button>
          ) : (
            <Button href="/register" icon="user">ساخت حساب کاربری برای پیگیری</Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {rejectedRequest && (
        <div className="mb-5 rounded-2xl border border-danger/30 bg-danger/5 p-4" role="status" data-testid="join-rejected-note">
          <p className="flex items-start gap-2 text-xs leading-6 text-danger">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            درخواست قبلی شما رد شده است{rejectedRequest.reviewedAt ? ` (${formatJalaliDateTime(rejectedRequest.reviewedAt)})` : ""}.
            {rejectedRequest.adminNote ? ` توضیح کارشناس: ${rejectedRequest.adminNote}` : ""}
            {" "}می‌توانید با اصلاح اطلاعات، درخواست جدید ثبت کنید.
          </p>
        </div>
      )}

      <Card hover={false} className="p-6 card-shadow" data-testid="join-form">
        <h2 className="text-xl font-extrabold text-foreground">فرم درخواست همکاری</h2>
        <p className="mt-1 text-xs leading-6 text-muted">
          اطلاعات شما محرمانه بررسی می‌شود؛ پس از تأیید کارشناس، پروفایل عمومی وکیل شما ساخته و حساب کاربری‌تان به آن متصل می‌شود.
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs font-bold text-danger" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="mt-5 space-y-5">
          {/* نام */}
          <div>
            <label htmlFor="jl-name" className={labelCls}>نام و نام خانوادگی *</label>
            <input
              id="jl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: سارا محمدی"
              className={fieldCls}
              maxLength={120}
              autoComplete="name"
            />
          </div>

          {/* موبایل + ایمیل */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="jl-phone" className={labelCls}>شمارهٔ موبایل *</label>
              <input
                id="jl-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                dir="ltr"
                placeholder="09123456789"
                className={`${fieldCls} tnum`}
                aria-invalid={phone !== "" && !phoneOk}
                autoComplete="tel"
              />
              {phone !== "" && !phoneOk && (
                <p className="mt-1 text-[11px] text-danger">شماره باید به‌صورت ۰۹XXXXXXXXX باشد.</p>
              )}
            </div>
            <div>
              <label htmlFor="jl-email" className={labelCls}>
                ایمیل <span className="font-normal text-muted">(اختیاری)</span>
              </label>
              <input
                id="jl-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                dir="ltr"
                placeholder="name@example.com"
                className={`${fieldCls} tnum`}
                aria-invalid={email !== "" && !emailOk}
                autoComplete="email"
              />
              {email !== "" && !emailOk && (
                <p className="mt-1 text-[11px] text-danger">قالب ایمیل درست نیست.</p>
              )}
            </div>
          </div>

          {/* پروانه + نوع وکالت */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="jl-license" className={labelCls}>شمارهٔ پروانهٔ وکالت *</label>
              <input
                id="jl-license"
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                dir="ltr"
                placeholder="مثال: 12345"
                className={`${fieldCls} tnum`}
                maxLength={60}
              />
            </div>
            <div>
              <span className={labelCls}>نوع *</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="نوع وکالت">
                {(
                  [
                    { value: "wakil", label: "وکیل رسمی", icon: "gavel" as const },
                    { value: "karamooz", label: "کارآموز وکالت", icon: "book" as const },
                  ] as const
                ).map((opt) => {
                  const active = lawyerType === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all ${
                        active
                          ? "border-primary bg-primary-soft/60 text-primary shadow-sm"
                          : "border-border bg-surface-2/50 text-foreground-soft hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="lawyerType"
                        value={opt.value}
                        checked={active}
                        onChange={() => setLawyerType(opt.value)}
                        className="sr-only"
                      />
                      <Icon name={opt.icon} className="h-4 w-4" />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* استان + شهر */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="jl-province" className={labelCls}>استان *</label>
              <select
                id="jl-province"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setCity("");
                }}
                className={fieldCls}
              >
                <option value="">انتخاب استان…</option>
                {LOCATIONS.map((l) => (
                  <option key={l.province} value={l.province}>{l.province}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="jl-city" className={labelCls}>شهر *</label>
              <select
                id="jl-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={fieldCls}
                disabled={!province}
              >
                <option value="">{province ? "انتخاب شهر…" : "ابتدا استان را انتخاب کنید"}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* سابقهٔ کار */}
          <div>
            <label htmlFor="jl-exp" className={labelCls}>سابقهٔ کار (سال) *</label>
            <input
              id="jl-exp"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              type="text"
              inputMode="numeric"
              dir="ltr"
              placeholder="مثال: 7"
              className={`${fieldCls} tnum`}
              aria-invalid={experienceYears !== "" && !expOk}
            />
            {experienceYears !== "" && !expOk && (
              <p className="mt-1 text-[11px] text-danger">سابقه را به عدد سال (۰ تا ۷۰) وارد کنید.</p>
            )}
          </div>

          {/* تخصص‌ها — چیپ چندانتخابی */}
          <fieldset>
            <legend className={labelCls}>
              تخصص‌ها * <span className="ms-1 font-normal text-muted">(حداکثر {faNum(6)} مورد — انتخاب‌شده: {faNum(specialties.length)})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {LEGAL_TOPICS.map((topic) => {
                const active = specialties.includes(topic.label);
                const disabled = !active && specialties.length >= 6;
                return (
                  <button
                    key={topic.label}
                    type="button"
                    onClick={() => toggleSpecialty(topic.label)}
                    aria-pressed={active}
                    disabled={disabled}
                    title={topic.hint}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-all ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : disabled
                          ? "cursor-not-allowed border-border bg-surface-2/40 text-muted"
                          : "border-border bg-surface text-foreground-soft hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {active && <Icon name="check" className="h-3.5 w-3.5" />}
                    {topic.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* دربارهٔ من */}
          <div>
            <label htmlFor="jl-bio" className={labelCls}>
              دربارهٔ من
              <span className="ms-2 font-normal text-muted">
                ({faNum(bioLen)}/{faNum(1000)} نویسه)
              </span>
            </label>
            <textarea
              id="jl-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="معرفی کوتاه حرفه‌ای: حوزه‌های تمرکز، سوابق برجسته، زبان‌ها و…"
              className={`${fieldCls} resize-y leading-7`}
            />
          </div>

          {/* قرارداد همکاری — امضای الکترونیکی */}
          <div className="rounded-2xl border border-border-strong bg-surface-2/40 p-4" data-testid="join-agreement">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Icon name="signature" className="h-4.5 w-4.5 text-accent-text" />
              قرارداد همکاری با دادبان
              <Badge tone="accent">{AGREEMENT_VERSION_LABEL}</Badge>
            </p>
            <ul className="mt-3 space-y-2">
              {AGREEMENT_BULLETS.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-6 text-foreground-soft">
                  <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-success" />
                  {b}
                </li>
              ))}
            </ul>
            <label htmlFor="jl-agree" className="mt-4 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40">
              <input
                id="jl-agree"
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                data-testid="agree-check"
                className="h-5 w-5 shrink-0 accent-[var(--primary)]"
              />
              شرایط فوق را می‌پذیرم و امضای الکترونیکی می‌نمایم *
            </label>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              با ثبت درخواست، زمان پذیرش و نسخهٔ قرارداد ({AGREEMENT_VERSION_LABEL}) به‌صورت تاریخ‌دار در پروندهٔ شما ثبت می‌شود.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={!canSubmit} icon="send" data-testid="join-submit">
              {sending ? "در حال ارسال…" : "ثبت درخواست همکاری"}
            </Button>
            <Link href="/lawyers" className="text-xs font-bold text-muted transition-colors hover:text-primary">
              انصراف و مشاهدهٔ وکلای دادبان
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
