import { NextResponse } from "next/server";
import { rateLimit, readJson, text } from "@/lib/api-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ابزار «تحلیل مخزن گیت‌هاب» — الهام از Agent-Reach
 * متادیتای مخزن عمومی (ستاره، فورک، زبان، مجوز) + گزیده‌ی README را برمی‌گرداند.
 * امنیت: فقط مخازن عمومی github.com؛ بدون هیچ توکن یا کلیدی.
 * استراتژی دو لایه (الهام از fallback زنجیره‌ی دادورزان):
 *   ۱) REST API رسمی گیت‌هاب — در Vercel و شبکه‌های باز کامل‌ترین داده را می‌دهد
 *   ۲) اسکرپ HTML صفحه‌ی عمومی + raw README — وقتی api.github.com مسدود باشد
 */

const UA = "Mozilla/5.0 (compatible; DadvarzanBot/1.0; +https://dadban.ir)";

export interface RepoResult {
  fullName: string;
  url: string;
  description: string;
  stars: string;
  forks: string;
  openIssues: number | null;
  language: string;
  otherLanguages: string[];
  topics: string[];
  license: string;
  homepage: string;
  pushedAt: string;
  source: "api" | "html";
}

function parseRepo(raw: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (u.hostname.replace(/^www\./, "") !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");
    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

async function fetchUrl(url: string, headers: Record<string, string>, timeoutMs: number): Promise<{ ok: boolean; status: number; body: string | null }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: ctrl.signal, redirect: "follow" });
    const body = res.ok ? await res.text() : null;
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  } finally {
    clearTimeout(t);
  }
}

/* ─── لایه ۱: REST API رسمی ────────────────────────────────────────────── */

async function viaApi(owner: string, repo: string): Promise<RepoResult | null> {
  const { ok, status, body } = await fetchUrl(
    `https://api.github.com/repos/${owner}/${repo}`,
    { Accept: "application/vnd.github+json" },
    6_000,
  );
  if (status === 404) throw new Error("not-found");
  if (!ok || !body) return null;
  try {
    const m = JSON.parse(body) as {
      full_name: string; html_url: string; description: string | null; stargazers_count: number;
      forks_count: number; open_issues_count: number; language: string | null; topics?: string[];
      license?: { name?: string } | null; homepage: string | null; pushed_at: string;
    };
    return {
      fullName: m.full_name,
      url: m.html_url,
      description: m.description ?? "",
      stars: m.stargazers_count.toLocaleString("en-US"),
      forks: m.forks_count.toLocaleString("en-US"),
      openIssues: m.open_issues_count,
      language: m.language ?? "—",
      otherLanguages: [],
      topics: (m.topics ?? []).slice(0, 8),
      license: m.license?.name ?? "—",
      homepage: m.homepage ?? "",
      pushedAt: m.pushed_at?.slice(0, 10) ?? "",
      source: "api",
    };
  } catch {
    return null;
  }
}

/* ─── لایه ۲: اسکرپ HTML عمومی ─────────────────────────────────────────── */

function firstMatch(html: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function unescapeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

async function viaHtml(owner: string, repo: string): Promise<RepoResult> {
  const { ok, body, status } = await fetchUrl(`https://github.com/${owner}/${repo}`, { Accept: "text/html" }, 15_000);
  if (!ok || !body) {
    throw new Error(status === 404 ? "not-found" : "unreachable");
  }
  if (/Page not found/i.test(firstMatch(body, [/<title>([^<]*)<\/title>/]))) throw new Error("not-found");

  const langs = [...body.matchAll(/search\?l=([A-Za-z+#]+)/g)].map((m) => m[1]);
  return {
    fullName: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`,
    description: unescapeHtml(firstMatch(body, [/<meta property="og:description" content="([^"]*)"/])),
    stars: firstMatch(body, [/repo-stars-counter-star"[^>]*title="([\d,]+)"/]),
    forks: firstMatch(body, [/repo-network-counter"[^>]*title="([\d,]+)"/]),
    openIssues: null,
    language: langs[0] ?? "—",
    otherLanguages: [...new Set(langs)].slice(1, 5),
    topics: [],
    license: firstMatch(body, [/"license":\s*\{[^}]*"name":"([^"]+)"/]),
    homepage: firstMatch(body, [/"homepage":"(https?:[^"]+)"/]),
    pushedAt: "",
    source: "html",
  };
}

/* ─── README ───────────────────────────────────────────────────────────── */

function parseReadme(md: string): string {
  return md
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>|]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  for (const name of ["README.md", "readme.md", "README.rst", "README.txt"]) {
    const r = await fetchUrl(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${name}`, {}, 10_000);
    if (r.ok && r.body) return r.body;
  }
  return "";
}

/* ─── API عمومی ────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  const limited = rateLimit(req, "res-repo", 20, 60 * 60_000);
  if (limited) return limited;

  const body = await readJson(req, 2_048);
  if (!body) return NextResponse.json({ ok: false, error: "درخواست نامعتبر است." }, { status: 400 });

  const raw = text(body.url, 2_048);
  if (!raw) return NextResponse.json({ ok: false, error: "لطفاً آدرس مخزن گیت‌هاب را وارد کنید." }, { status: 400 });

  const parsed = parseRepo(raw);
  if (!parsed) return NextResponse.json({ ok: false, error: "آدرس معتبر نیست — نمونه‌ی درست: https://github.com/owner/repo" }, { status: 400 });

  try {
    let result: RepoResult | null = null;
    try {
      result = await viaApi(parsed.owner, parsed.repo);
    } catch (e) {
      if (e instanceof Error && e.message === "not-found") throw new Error("not-found");
      result = null; // مسدود یا خطای شبکه → لایه‌ی بعد
    }
    if (!result) result = await viaHtml(parsed.owner, parsed.repo);

    const readmeRaw = await fetchReadme(parsed.owner, parsed.repo);
    return NextResponse.json({ ok: true, repo: result, readmeExcerpt: parseReadme(readmeRaw).slice(0, 4_000) });
  } catch (e) {
    if (e instanceof Error && e.message === "not-found") {
      return NextResponse.json({ ok: false, error: "مخزن عمومی با این آدرس پیدا نشد (مخزن خصوصی یا نام اشتباه)." }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "اتصال به گیت‌هاب برقرار نشد. لطفاً بعداً تلاش کنید." }, { status: 502 });
  }
}
