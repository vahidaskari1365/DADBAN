"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ALL_PROVINCES, LOCATIONS, LEGAL_TOPICS, faPrice } from "@/lib/data";
import { MoneyInput } from "@/components/money-input";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

type LawyerProfileInput = {
  name: string;
  title: string;
  bio: string;
  about: string;
  specialties: string[];
  services: string[];
  province: string;
  city: string;
  responseTime: string;
  priceChat: number;
  priceVoice: number;
  priceVideo: number;
};

const RESPONSE_TIMES = ["کمتر از ۱۵ دقیقه", "کمتر از یک ساعت", "چند ساعت", "یک روز کاری"];

/** فرم پروفایل حرفه‌ای وکیل — PUT /api/lawyer/profile (فیلدهای عمومی پروفایل را تغذیه می‌کند) */
export function LawyerProfileForm({ initial, slug }: { initial: LawyerProfileInput; slug: string }) {
  const router = useRouter();
  const t = useT();
  const tf = templateT(t);
  const [name, setName] = useState(initial.name);
  const [title, setTitle] = useState(initial.title);
  const [bio, setBio] = useState(initial.bio);
  const [about, setAbout] = useState(initial.about);
  const [specialties, setSpecialties] = useState<string[]>(initial.specialties);
  const [newSpecialty, setNewSpecialty] = useState("");
  const [services, setServices] = useState<string[]>(initial.services);
  const [newService, setNewService] = useState("");
  const [province, setProvince] = useState(initial.province);
  const [city, setCity] = useState(initial.city);
  const [responseTime, setResponseTime] = useState(initial.responseTime);
  const [priceChat, setPriceChat] = useState(String(initial.priceChat));
  const [priceVoice, setPriceVoice] = useState(String(initial.priceVoice));
  const [priceVideo, setPriceVideo] = useState(String(initial.priceVideo));
  const [saving, setSaving] = useState(false);

  const cities = useMemo(() => LOCATIONS.find((l) => l.province === province)?.cities ?? [], [province]);

  function addToList(list: string[], setList: (v: string[]) => void, value: string, setValue: (v: string) => void, max: number) {
    const v = value.trim().replace(/،/g, ",").split(",").map((s) => s.trim()).filter(Boolean);
    if (!v.length) return;
    const merged = Array.from(new Set([...list, ...v])).slice(0, max);
    setList(merged);
    setValue("");
  }

  function removeFromList(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.filter((x) => x !== item));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast.error(t("نام را کامل وارد کنید."));
      return;
    }
    if (specialties.length === 0) {
      toast.error(t("حداقل یک حوزه تخصص لازم است."));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/lawyer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim(),
          bio: bio.trim(),
          about: about.trim(),
          specialties,
          services,
          province,
          city,
          responseTime,
          priceChat: priceChat === "" ? 0 : Number(priceChat),
          priceVoice: priceVoice === "" ? 0 : Number(priceVoice),
          priceVideo: priceVideo === "" ? 0 : Number(priceVideo),
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast.success(t("پروفایل حرفه‌ای ذخیره شد و بلافاصله در صفحه عمومی اعمال می‌شود."));
        router.refresh();
      } else {
        toast.error(data.error ?? t("ذخیره پروفایل ناموفق بود."));
      }
    } catch {
      toast.error(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";
  const chipCls =
    "inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary";

  return (
    <form onSubmit={save} className="space-y-6">
      {/* هویت */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("نام و نام خانوادگی *")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("عنوان حرفه‌ای")}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">{t("معرفی کوتاه (حداکثر ۳۰۰ نویسه — نمایش در کارت وکیل)")}</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 300))}
          rows={2}
          maxLength={300}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary"
        />
        <span className="mt-1 block text-left text-[11px] text-muted" dir="ltr">{bio.length}/300</span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">{t("درباره وکیل (معرفی کامل)")}</span>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value.slice(0, 4000))}
          rows={6}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm leading-7 text-foreground outline-none transition-colors focus:border-primary"
        />
      </label>

      {/* تخصص‌ها */}
      <fieldset>
        <legend className="mb-2 block text-xs font-medium text-muted">{t("حوزه‌های تخصص * (حداکثر ۱۲ مورد)")}</legend>
        <div className="flex flex-wrap gap-2">
          {specialties.map((s) => (
            <span key={s} className={chipCls}>
              {s}
              <button
                type="button"
                onClick={() => removeFromList(specialties, setSpecialties, s)}
                aria-label={tf("حذف {s}", { s })}
                className="rounded-full p-0.5 hover:bg-primary/15"
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            </span>
          ))}
          {specialties.length === 0 && <span className="text-xs text-muted">{t("هنوز تخصصی ثبت نشده است.")}</span>}
        </div>
        <div className="mt-2.5 flex gap-2">
          <input
            value={newSpecialty}
            onChange={(e) => setNewSpecialty(e.target.value)}
            placeholder={t("تخصص جدید…")}
            list="legal-topics"
            className={inputCls}
          />
          <datalist id="legal-topics">
            {LEGAL_TOPICS.map((t) => (
              <option key={t.label} value={t.label} />
            ))}
          </datalist>
          <Button
            type="button"
            variant="outline"
            size="md"
            icon="plus"
            onClick={() => addToList(specialties, setSpecialties, newSpecialty, setNewSpecialty, 12)}
          >
            افزودن
          </Button>
        </div>
      </fieldset>

      {/* خدمات */}
      <fieldset>
        <legend className="mb-2 block text-xs font-medium text-muted">{t("خدمات (حداکثر ۱۶ مورد)")}</legend>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">
              {s}
              <button
                type="button"
                onClick={() => removeFromList(services, setServices, s)}
                aria-label={tf("حذف {s}", { s })}
                className="rounded-full p-0.5 hover:bg-success/20"
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            </span>
          ))}
          {services.length === 0 && <span className="text-xs text-muted">{t("هنوز خدمتی ثبت نشده است.")}</span>}
        </div>
        <div className="mt-2.5 flex gap-2">
          <input
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            placeholder={t("مثلاً: تنظیم دادخواست مطالبه مهریه")}
            className={inputCls}
          />
          <Button
            type="button"
            variant="outline"
            size="md"
            icon="plus"
            onClick={() => addToList(services, setServices, newService, setNewService, 16)}
          >
            افزودن
          </Button>
        </div>
      </fieldset>

      {/* موقعیت */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("استان")}</span>
          <select
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              if (!LOCATIONS.find((l) => l.province === e.target.value)?.cities.includes(city)) setCity("");
            }}
            className={`${inputCls} cursor-pointer appearance-none`}
          >
            {ALL_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {tf("استان {p}", { p })}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("شهر")}</span>
          <select value={city} onChange={(e) => setCity(e.target.value)} className={`${inputCls} cursor-pointer appearance-none`}>
            {cities.map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] text-muted">
            {t("موکلانِ همین استان در پیشنهادها و فیلتر استان، شما را می‌بینند.")}
          </span>
        </label>
      </div>

      {/* پاسخ‌گویی و تعرفه */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">{t("زمان پاسخ‌گویی معمول")}</span>
          <select value={responseTime} onChange={(e) => setResponseTime(e.target.value)} className={`${inputCls} cursor-pointer appearance-none`}>
            {RESPONSE_TIMES.map((rt) => (
              <option key={rt} value={rt}>
                {t(rt)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["متنی", priceChat, setPriceChat, "chat"],
              ["صوتی", priceVoice, setPriceVoice, "phone"],
              ["تصویری", priceVideo, setPriceVideo, "video"],
            ] as const
          ).map(([label, value, setter, icon]) => (
            <label key={label} className="block">
              <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted">
                <Icon name={icon} className="h-3.5 w-3.5" /> {tf("تعرفه {label}", { label })}
              </span>
              <MoneyInput
                value={value}
                onValueChange={(v) => setter(v === "" ? "" : String(Math.min(Number(v), 100000000)))}
                placeholder="مثلاً 2,000,000"
                className={inputCls}
              />
            </label>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">
        {tf("تعرفه‌ها به تومان است — نمونه فعلی: {n} برای مشاوره متنی. مبلغ پیش از پرداخت به موکل شفاف نمایش داده می‌شود.", { n: faPrice(Number(priceChat || 0)) })}
      </p>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={saving} icon="check">
          {saving ? t("در حال ذخیره…") : t("ذخیره پروفایل حرفه‌ای")}
        </Button>
        <Button href={`/lawyers/${slug}`} variant="ghost" icon="arrow">
          {t("مشاهده پروفایل عمومی")}
        </Button>
      </div>
    </form>
  );
}
