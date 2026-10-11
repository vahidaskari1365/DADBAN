"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { faNum } from "@/lib/data";
import type { IconKey } from "@/lib/data";
import { FREE_LLM_PROVIDERS, FREE_LLM_UPDATED } from "@/data/free-llm-providers";
import type { FreeLlmProvider } from "@/data/free-llm-providers";
import { AGENT_SKILLS } from "@/data/agent-skills";
import { AI_ACADEMY, ACADEMY_TRACKS, AGENT_SECURITY_CHECKLIST, GATEWAY_TIERS } from "@/data/ai-resources";
import { useT } from "@/lib/i18n/provider";
import { templateT } from "@/lib/i18n/core";

/* ============================================================
   جعبه‌ابزار منبع‌باز دادبان — پنج ابزار زنده:
   ۱) کاتالوگ APIهای رایگان (awesome-free-llm-apis)
   ۲) ابزارهای وب عامل: خواندن صفحه + تحلیل مخزن (Agent-Reach)
   ۳) کتابخانه مهارت‌ها (mattpocock/skills)
   ۴) آکادمی مهندسی AI (patchy631/ai-engineering-hub)
   ۵) مسیریابی دروازه (OmniRoute) + امنیت عامل (ECC)
   ============================================================ */

type TabKey = "llm" | "web" | "skills" | "academy" | "infra";

const TABS: { key: TabKey; label: string; icon: IconKey; desc: string }[] = [
  { key: "llm", label: "کاتالوگ API رایگان", icon: "book", desc: "۱۶ تأمین‌کننده و ۱۱۸ مدل با پلن رایگان دائمی" },
  { key: "web", label: "ابزارهای وب عامل", icon: "search", desc: "خواندن صفحه وب و تحلیل مخزن گیت‌هاب — زنده" },
  { key: "skills", label: "مهارت‌های عامل", icon: "badge", desc: "۳۱ مهارت آماده برای عامل‌های کدنویس" },
  { key: "academy", label: "آکادمی مهندسی AI", icon: "landmark", desc: "۱۸ پروژه‌ی منتخب آموزشی با راهنمای فارسی" },
  { key: "infra", label: "مسیریابی و امنیت", icon: "shield", desc: "زنجیره‌ی دروازه دادبان + چک‌لیست امنیت عامل" },
];

function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      {label}
    </span>
  );
}

function Scroll({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`scrollbar-thin max-h-96 overflow-y-auto rounded-xl border border-border bg-surface-2/60 p-4 ${className}`} style={{ scrollbarWidth: "thin" }}>
      {children}
    </div>
  );
}

/* ─── ۱) کاتالوگ APIهای رایگان ─────────────────────────────────────────── */

function LlmCatalog() {
  const t = useT();
  const tf = templateT(t);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"all" | "provider_api" | "inference_provider">("all");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FREE_LLM_PROVIDERS.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.models.some((m) => m.id.toLowerCase().includes(q))
      );
    });
  }, [query, cat]);

  const toggle = (name: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("جستجوی تأمین‌کننده یا مدل… (مثلاً Cohere، llama، gemma)")}
            aria-label={t("جستجو در کاتالوگ APIهای رایگان")}
            className="h-11 w-full rounded-xl border border-border bg-surface pr-10 pl-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
          />
        </div>
        <div className="flex gap-2" role="group" aria-label={t("دسته‌بندی تأمین‌کنندگان")}>
          {(["all", "provider_api", "inference_provider"] as const).map((k) => {
            const l = k === "all" ? t("همه") : k === "provider_api" ? t("تأمین‌کننده اصلی") : t("واسط استنتاج");
            return (
              <button
                key={k}
                onClick={() => setCat(k)}
                className={`h-11 cursor-pointer rounded-xl border px-3.5 text-xs font-bold transition-colors ${cat === k ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-foreground"}`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted">
        {tf("{n} تأمین‌کننده · {m} مدل — داده‌ها از awesome-free-llm-apis (به‌روزرسانی منبع: {d})", {
          n: faNum(filtered.length),
          m: faNum(filtered.reduce((a, p) => a + p.models.length, 0)),
          d: faNum(FREE_LLM_UPDATED.replace(/-/g, "/")),
        })}
      </p>

      <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
        {filtered.map((p) => (
          <ProviderCard key={p.name} p={p} open={open.has(p.name)} onToggle={() => toggle(p.name)} />
        ))}
      </div>
      {filtered.length === 0 && <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-muted">{t("نتیجه‌ای یافت نشد — عبارت دیگری را امتحان کنید.")}</p>}
    </div>
  );
}

function ProviderCard({ p, open, onToggle }: { p: FreeLlmProvider; open: boolean; onToggle: () => void }) {
  const t = useT();
  const tf = templateT(t);
  return (
    <Card className="flex min-w-0 flex-col !p-4" hover={false}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="flex items-center gap-1.5 font-bold text-foreground">
            <span aria-hidden>{p.flag}</span>
            <span className="truncate" dir="ltr">{p.name}</span>
          </h4>
          <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted" dir="ltr">{p.description}</p>
        </div>
        <Badge tone="primary">{tf("{n} مدل", { n: faNum(p.models.length) })}</Badge>
      </div>
      <p className="mt-2 truncate rounded-lg bg-surface-2 px-2 py-1.5 text-[11px] text-muted-soft" dir="ltr" title={p.baseUrl}>{p.baseUrl}</p>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="soft" size="sm" onClick={onToggle} icon={open ? "chevron" : "plus"}>
          {open ? t("بستن جدول مدل‌ها") : t("جدول مدل‌ها")}
        </Button>
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-primary hover:bg-primary-soft">
          {t("دریافت کلید")} <Icon name="arrow" className="h-3.5 w-3.5" />
        </a>
      </div>
      {open && (
        <div className="scrollbar-thin mt-3 max-h-64 overflow-auto rounded-xl border border-border" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full min-w-[480px] border-collapse text-xs">
            <thead>
              <tr className="bg-surface-2 text-muted-soft">
                <th className="p-2 text-start font-bold">{t("مدل")}</th>
                <th className="p-2 text-start font-bold">{t("کانتکست")}</th>
                <th className="p-2 text-start font-bold">{t("خروجی")}</th>
                <th className="p-2 text-start font-bold">{t("سقف نرخ")}</th>
              </tr>
            </thead>
            <tbody>
              {p.models.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-2 font-medium text-foreground" dir="ltr">{m.id}</td>
                  <td className="p-2 text-muted" dir="ltr">{m.context}</td>
                  <td className="p-2 text-muted" dir="ltr">{m.maxOutput}</td>
                  <td className="p-2 text-muted" dir="ltr">{m.rateLimit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ─── ۲) ابزارهای وب عامل ──────────────────────────────────────────────── */

function WebTools() {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <PageReader />
      <RepoAnalyzer />
    </div>
  );
}

function PageReader() {
  const t = useT();
  const tf = templateT(t);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ title: string; text: string; chars: number; publishedTime: string } | null>(null);

  async function read(u = url) {
    if (loading) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/ai/resources/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u.trim() }),
      });
      const data = await res.json();
      if (data?.ok) setResult({ title: data.title, text: data.text, chars: data.chars, publishedTime: data.publishedTime });
      else setError(data?.error ?? t("خواندن صفحه ناموفق بود."));
    } catch {
      setError(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex min-w-0 flex-col" hover={false}>
      <h4 className="flex items-center gap-2 font-bold text-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="search" className="h-4 w-4" /></span>
        {t("خواندن صفحه وب")}
      </h4>
      <p className="mt-2 text-xs leading-6 text-muted">{t("آدرس هر صفحه‌ای را بدهید؛ متن اصلی، عنوان و تاریخ انتشار استخراج می‌شود (الهام از Agent-Reach).")}</p>
      <div className="mt-3 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void read(); }}
          placeholder="https://example.com/article"
          dir="ltr"
          aria-label={t("آدرس صفحه برای خواندن")}
          className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
        />
        <Button onClick={() => void read()} disabled={loading || !url.trim()}>{loading ? "…" : t("بخوان")}</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["https://fa.wikipedia.org/wiki/حقوق_ایران", "https://www.rokna.ir/"].map((u) => (
          <button key={u} onClick={() => { setUrl(u); void read(u); }} className="cursor-pointer rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted transition-colors hover:bg-primary-soft hover:text-primary" dir="ltr">
            {u.replace("https://", "").slice(0, 34)}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {loading && <div className="mt-4"><Spinner label={t("در حال خواندن صفحه…")} /></div>}
      {result && !loading && (
        <div className="mt-4 space-y-2">
          <p className="font-bold text-foreground">{result.title}</p>
          {result.publishedTime && <p className="text-xs text-muted">{tf("انتشار: {d}", { d: result.publishedTime })}</p>}
          <Scroll>
            <p className="whitespace-pre-wrap text-xs leading-6 text-foreground-soft">{result.text}</p>
          </Scroll>
          <p className="text-[11px] text-muted-soft">{tf("{n} نویسه استخراج شد (نمایش تا ۱۲٬۰۰۰ نویسه).", { n: faNum(result.chars) })}</p>
        </div>
      )}
    </Card>
  );
}

interface RepoInfo {
  fullName: string; url: string; description: string; stars: string; forks: string;
  openIssues: number | null; language: string; otherLanguages: string[]; topics: string[];
  license: string; homepage: string; pushedAt: string; source: "api" | "html";
}

function RepoAnalyzer() {
  const t = useT();
  const tf = templateT(t);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [readme, setReadme] = useState("");

  async function analyze(u = url) {
    if (loading) return;
    setLoading(true); setError(""); setRepo(null); setReadme("");
    try {
      const res = await fetch("/api/ai/resources/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u.trim() }),
      });
      const data = await res.json();
      if (data?.ok) { setRepo(data.repo); setReadme(data.readmeExcerpt ?? ""); }
      else setError(data?.error ?? t("تحلیل مخزن ناموفق بود."));
    } catch {
      setError(t("ارتباط با سرور برقرار نشد."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex min-w-0 flex-col" hover={false}>
      <h4 className="flex items-center gap-2 font-bold text-foreground">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name="folder" className="h-4 w-4" /></span>
        {t("تحلیل مخزن گیت‌هاب")}
      </h4>
      <p className="mt-2 text-xs leading-6 text-muted">{t("آدرس هر مخزن عمومی را بدهید؛ ستاره، فورک، زبان، موضوعات و گزیده‌ی README استخراج می‌شود.")}</p>
      <div className="mt-3 flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void analyze(); }}
          placeholder="https://github.com/owner/repo"
          dir="ltr"
          aria-label={t("آدرس مخزن گیت‌هاب")}
          className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
        />
        <Button onClick={() => void analyze()} disabled={loading || !url.trim()}>{loading ? "…" : t("تحلیل")}</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["diegosouzapw/OmniRoute", "Panniantong/Agent-Reach", "patchy631/ai-engineering-hub"].map((r) => (
          <button key={r} onClick={() => { const u = `https://github.com/${r}`; setUrl(u); void analyze(u); }} className="cursor-pointer rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted transition-colors hover:bg-primary-soft hover:text-primary" dir="ltr">
            {r}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}
      {loading && <div className="mt-4"><Spinner label={t("در حال پرس‌وجو از گیت‌هاب…")} /></div>}
      {repo && !loading && (
        <div className="mt-4 space-y-3">
          <div>
            <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline" dir="ltr">{repo.fullName}</a>
            {repo.description && <p className="mt-1 text-xs leading-6 text-muted" dir="ltr">{repo.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { l: t("ستاره"), v: repo.stars || "—", i: "star" as IconKey, raw: false },
              { l: t("فورک"), v: repo.forks || "—", i: "folder" as IconKey, raw: false },
              { l: t("زبان اصلی"), v: repo.language, i: "document" as IconKey, raw: true },
              { l: t("مجوز"), v: repo.license || "—", i: "shield" as IconKey, raw: true },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-border bg-surface-2/60 p-2.5 text-center">
                <Icon name={s.i} className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 truncate text-sm font-extrabold text-foreground" dir="ltr" title={String(s.v)}>{s.raw ? s.v : faNum(s.v)}</p>
                <p className="text-[10px] text-muted">{s.l}</p>
              </div>
            ))}
          </div>
          {(repo.topics?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {repo.topics.map((t) => <Badge key={t}>{t}</Badge>)}
            </div>
          )}
          {(repo.otherLanguages?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {repo.otherLanguages.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
            </div>
          )}
          {repo.homepage && (
            <p className="text-[11px] text-muted-soft">
              {t("وب‌سایت:")} <a href={repo.homepage} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" dir="ltr">{repo.homepage}</a>
            </p>
          )}
          <p className="text-[11px] text-muted-soft">
            {t("منبع داده:")} <span dir="ltr">{repo.source === "api" ? "GitHub REST API" : "HTML scrape fallback"}</span>
            {repo.openIssues != null && <> · {tf("ایسیوهای باز: {n}", { n: faNum(repo.openIssues.toLocaleString("en-US")) })}</>}
            {repo.pushedAt && <> · {tf("آخرین پوش: {d}", { d: repo.pushedAt })}</>}
          </p>
          {readme && (
            <Scroll>
              <p className="whitespace-pre-wrap text-xs leading-6 text-foreground-soft" dir="ltr">{readme}</p>
            </Scroll>
          )}
        </div>
      )}
    </Card>
  );
}

/* ─── ۳) کتابخانه مهارت‌های عامل ───────────────────────────────────────── */

function SkillsLibrary() {
  const t = useT();
  const tf = templateT(t);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("همه");
  const cats = ["همه", "مهندسی", "بهره‌وری", "متفرقه"];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AGENT_SKILLS.filter((s) => {
      if (cat !== "همه" && s.category !== cat) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    });
  }, [query, cat]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("جستجوی مهارت… (مثلاً tdd، code-review، teach)")}
            aria-label={t("جستجو در مهارت‌ها")}
            className="h-11 w-full rounded-xl border border-border bg-surface pr-10 pl-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
          />
        </div>
        <div className="flex gap-2" role="group" aria-label={t("دسته‌بندی مهارت‌ها")}>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`h-11 cursor-pointer rounded-xl border px-3.5 text-xs font-bold transition-colors ${cat === c ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-foreground"}`}
            >
              {t(c)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">{tf("{n} مهارت از مخزن mattpocock/skills — عامل‌ها این مهارت‌ها را در لحظه فراخوانی می‌کنند.", { n: faNum(filtered.length) })}</p>
      <div className="scrollbar-thin grid max-h-[32rem] gap-3 overflow-y-auto pl-1 sm:grid-cols-2" style={{ scrollbarWidth: "thin" }}>
        {filtered.map((s) => (
          <Card key={s.slug} className="!p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-foreground" dir="ltr">{s.slug}</h4>
              <Badge tone="primary">{t(s.category)}</Badge>
            </div>
            <p className="mt-2 text-xs leading-6 text-muted" dir="ltr">{s.description}</p>
            <a
              href={`https://github.com/mattpocock/skills/blob/main/skills/${s.category === "مهندسی" ? "engineering" : s.category === "بهره‌وری" ? "productivity" : "misc"}/${s.slug}/SKILL.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              {t("مشاهده SKILL.md")} <Icon name="arrow" className="h-3 w-3" />
            </a>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <p className="rounded-xl bg-surface-2 p-6 text-center text-sm text-muted">{t("مهارتی با این عبارت پیدا نشد.")}</p>}
    </div>
  );
}

/* ─── ۴) آکادمی مهندسی AI ──────────────────────────────────────────────── */

function Academy() {
  const t = useT();
  const tf = templateT(t);
  const [track, setTrack] = useState<(typeof ACADEMY_TRACKS)[number]["key"]>("all");
  const filtered = track === "all" ? AI_ACADEMY : AI_ACADEMY.filter((a) => a.track === track);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("مسیرهای آموزشی")}>
        {ACADEMY_TRACKS.map((tk) => (
          <button
            key={tk.key}
            onClick={() => setTrack(tk.key)}
            className={`h-10 cursor-pointer rounded-xl border px-3.5 text-xs font-bold transition-colors ${track === tk.key ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted hover:text-foreground"}`}
          >
            {t(tk.label)}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">{tf("{n} پروژه‌ی منتخب از مخزن patchy631/ai-engineering-hub (بیش از ۱۱۰ پروژه) — هر پروژه شامل نوت‌بوک و کد اجرایی است.", { n: faNum(filtered.length) })}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <a
            key={a.slug}
            href={`https://github.com/patchy631/ai-engineering-hub/tree/main/${a.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-lift)]"
          >
            <h4 className="font-bold text-foreground">{t(a.faTitle)}</h4>
            <p className="mt-1.5 text-xs leading-6 text-muted">{t(a.faDesc)}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary" dir="ltr">
              {a.slug} <Icon name="arrow" className="h-3 w-3" />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─── ۵) مسیریابی دروازه + امنیت عامل ──────────────────────────────────── */

interface HealthResult {
  healthy: boolean;
  latencyMs: number;
  message: string;
  tiers: { tier: number; name: string; provider: string; needsKey: boolean; active: boolean }[];
}

function InfraTools() {
  const t = useT();
  const tf = templateT(t);
  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  async function runHealth() {
    if (testing) return;
    setTesting(true); setHealth(null);
    try {
      const res = await fetch("/api/ai/resources/gateway-health", { method: "POST" });
      const data = await res.json();
      if (data?.ok) setHealth(data);
      else setHealth({ healthy: false, latencyMs: 0, message: t("تست سلامت ناموفق بود."), tiers: [] });
    } catch {
      setHealth({ healthy: false, latencyMs: 0, message: t("ارتباط با سرور برقرار نشد."), tiers: [] });
    } finally {
      setTesting(false);
    }
  }

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pct = Math.round((checked.size / AGENT_SECURITY_CHECKLIST.length) * 100);

  return (
    <div className="space-y-8">
      {/* دروازه */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-foreground">{t("زنجیره‌ی مسیریابی دادبان")}</h4>
            <p className="mt-1 text-xs leading-6 text-muted">{t("الهام از OmniRoute: اگر طبقه‌ی بالادستی در دسترس نباشد، درخواست به‌طور خودکار به طبقه‌ی بعدی می‌رود.")}</p>
          </div>
          <Button onClick={() => void runHealth()} disabled={testing} icon="bolt" size="sm">
            {testing ? t("در حال تست…") : t("تست سلامت دروازه")}
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {GATEWAY_TIERS.map((tier) => {
            const active = health?.tiers?.find((x) => x.tier === tier.tier)?.active ?? (tier.needsKey ? null : true);
            return (
              <Card key={tier.tier} className="!p-4" hover={false}>
                <div className="flex items-center justify-between">
                  <Badge tone="primary">{tf("طبقه {n}", { n: faNum(tier.tier) })}</Badge>
                  <span
                    aria-hidden
                    className={`h-2.5 w-2.5 rounded-full ${active === null ? "bg-border-strong" : active ? "bg-[color-mix(in_oklab,var(--success)_70%,transparent)]" : "bg-danger/60"}`}
                    title={active === null ? t("نامشخص") : active ? t("فعال") : t("غیرفعال (کلید تنظیم نشده)")}
                  />
                </div>
                <h5 className="mt-2.5 font-bold text-foreground" dir="ltr">{t(tier.name)}</h5>
                <p className="text-[11px] text-primary" dir="ltr">{tier.provider}</p>
                <p className="mt-2 text-xs leading-6 text-muted">{t(tier.desc)}</p>
              </Card>
            );
          })}
        </div>
        {testing && <div className="mt-4"><Spinner label={t("درخواست آزمایشی به زنجیره ارسال شد…")} /></div>}
        {health && !testing && (
          <div className={`mt-4 rounded-xl border p-4 text-sm leading-7 ${health.healthy ? "border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)] text-foreground-soft" : "border-warning/30 bg-warning/10 text-foreground-soft"}`}>
            <span className="font-bold">{health.healthy ? "✓ " : "⚠ "}</span>{health.message}
          </div>
        )}
      </div>

      {/* چک‌لیست امنیت */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-foreground">{t("چک‌لیست امنیت عامل — الهام از ECC / AgentShield")}</h4>
            <p className="mt-1 text-xs leading-6 text-muted">{t("هشت کنترل ضروری برای اجرای امن عامل‌های هوشمند؛ موارد را با تکمیل شدن تیک بزنید.")}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-28 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("پیشرفت چک‌لیست امنیتی")}>
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-extrabold text-primary">{faNum(pct)}٪</span>
          </div>
        </div>
        <div className="mt-4 grid gap-2.5 md:grid-cols-2">
          {AGENT_SECURITY_CHECKLIST.map((c) => {
            const done = checked.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCheck(c.id)}
                aria-pressed={done}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-start transition-all ${done ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong"}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${done ? "border-primary bg-primary text-primary-foreground" : "border-border-strong"}`}>
                  {done && <Icon name="check" className="h-3 w-3" />}
                </span>
                <span>
                  <span className={`block text-sm font-bold ${done ? "text-primary" : "text-foreground"}`}>{t(c.title)}</span>
                  <span className="mt-1 block text-xs leading-6 text-muted">{t(c.desc)}</span>
                </span>
              </button>
            );
          })}
        </div>
        {checked.size > 0 && (
          <button onClick={() => setChecked(new Set())} className="mt-3 cursor-pointer text-xs font-bold text-muted hover:text-foreground">
            {t("بازنشانی چک‌لیست")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── شل اصلی تب‌ها ────────────────────────────────────────────────────── */

export function ResourcesTools() {
  const t = useT();
  const [tab, setTab] = useState<TabKey>("llm");

  return (
    <div>
      <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t("ابزارهای منبع‌باز")} style={{ scrollbarWidth: "thin" }}>
        {TABS.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            aria-selected={tab === tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${tab === tb.key ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground"}`}
          >
            <Icon name={tb.icon} className="h-4 w-4" />
            {t(tb.label)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">{t(TABS.find((tb) => tb.key === tab)?.desc ?? "")}</p>
      <div className="mt-5" role="tabpanel">
        {tab === "llm" && <LlmCatalog />}
        {tab === "web" && <WebTools />}
        {tab === "skills" && <SkillsLibrary />}
        {tab === "academy" && <Academy />}
        {tab === "infra" && <InfraTools />}
      </div>
    </div>
  );
}
