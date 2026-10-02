// ============================================================
// جعبه‌ابزار منبع‌باز هوش مصنوعی دادپیو — داده‌های منتخب
// منابع: OmniRoute، Agent-Reach، ECC، ai-engineering-hub،
//        awesome-free-llm-apis، mattpocock/skills
// ============================================================

import type { IconKey } from "@/lib/data";

/* ── پروژه‌های منبع‌باز همکار دادپیو ─────────────────────────────────── */

export interface OpenSourceProject {
  slug: string;
  name: string;
  repo: string;
  faTitle: string;
  faDesc: string;
  tags: string[];
  icon: IconKey;
  highlight: string;
}

export const OPEN_SOURCE_PROJECTS: OpenSourceProject[] = [
  {
    slug: "omniroute",
    name: "OmniRoute",
    repo: "https://github.com/diegosouzapw/OmniRoute",
    faTitle: "دروازه‌ی رایگان هوش مصنوعی",
    faDesc:
      "مسیریاب هوشمند بین ۳۵۰+ تأمین‌کننده‌ی LLM با ۱۵۰+ پلن رایگان، fallback خودکار و ۱۹ استراتژی مسیریابی — الهام‌بخش موتور چندتأمین‌کننده‌ی دادپیو.",
    tags: ["Gateway", "Routing", "Free Tiers"],
    icon: "bolt",
    highlight: "~۱.۶۲ میلیارد توکن رایگان در ماه",
  },
  {
    slug: "free-llm-apis",
    name: "awesome-free-llm-apis",
    repo: "https://github.com/mnfst/awesome-free-llm-apis",
    faTitle: "کاتالوگ APIهای رایگان LLM",
    faDesc:
      "فهرست منتخب APIهای OpenAI-سازگار با پلن رایگان دائمی — تأمین‌کننده، مدل، ظرفیت کانتکست و سقف نرخ فراخوانی، همه در یک کاتالوگ زنده.",
    tags: ["Catalog", "OpenAI-compatible", "Free"],
    icon: "book",
    highlight: "۱۶ تأمین‌کننده · ۱۱۸ مدل رایگان",
  },
  {
    slug: "agent-reach",
    name: "Agent-Reach",
    repo: "https://github.com/Panniantong/Agent-Reach",
    faTitle: "دسترسی وب برای عامل‌ها",
    faDesc:
      "یک‌جا به عامل قدرت وب بده: خواندن صفحه، یوتیوب، توییتر، Reddit، RSS و گیت‌هاب — ابزارهای زنده‌ی «خواندن صفحه» و «تحلیل مخزن» دادپیو از همین ایده ساخته شده‌اند.",
    tags: ["Web Access", "Scraping", "RSS"],
    icon: "search",
    highlight: "خواندن صفحه و تحلیل گیت‌هاب — زنده در همین صفحه",
  },
  {
    slug: "ecc",
    name: "ECC",
    repo: "https://github.com/affaan-m/ECC",
    faTitle: "سیستم‌عامل امنیت عامل",
    faDesc:
      "هارنس مدیریت و سپر امنیتی (AgentShield) برای عامل‌های کدنویس — چک‌لیست امنیتی ۸گانه‌ی دادپیو برای اجرای امن عامل‌ها از همین رویکرد الهام گرفته است.",
    tags: ["Security", "Harness", "Shield"],
    icon: "shield",
    highlight: "چک‌لیست امنیتی تعاملی — تب مسیریابی و امنیت",
  },
  {
    slug: "skills",
    name: "mattpocock/skills",
    repo: "https://github.com/mattpocock/skills",
    faTitle: "کتابخانه مهارت‌های عامل",
    faDesc:
      "۳۱ مهارت آماده‌ی مهندسی نرم‌افزار (TDD، بازبینی کد، طراحی دامنه و…) که عامل‌ها می‌توانند در لحظه فراخوانی کنند — کاتالوگ کامل و قابل جستجو در همین صفحه.",
    tags: ["Skills", "DX", "TypeScript"],
    icon: "badge",
    highlight: "۳۱ مهارت در ۳ دسته — قابل جستجو",
  },
  {
    slug: "ai-engineering-hub",
    name: "ai-engineering-hub",
    repo: "https://github.com/patchy631/ai-engineering-hub",
    faTitle: "آکادمی مهندسی هوش مصنوعی",
    faDesc:
      "بیش از ۱۱۰ پروژه‌ی عملی: RAG، عامل‌های چندگانه، فاین‌تیون، MCP و مهندسی زمینه — منتخب ۱۸ پروژه‌ی کلیدی با راهنمای فارسی در تب آکادمی.",
    tags: ["Learning", "RAG", "Agents"],
    icon: "landmark",
    highlight: "۱۸ پروژه‌ی منتخب از ۱۱۰+ پروژه",
  },
];

/* ── آکادمی مهندسی AI — منتخب ai-engineering-hub ─────────────────────── */

export interface AcademyItem {
  slug: string;
  faTitle: string;
  faDesc: string;
  track: "rag" | "agents" | "finetune" | "mcp" | "context" | "eval";
}

export const ACADEMY_TRACKS: { key: AcademyItem["track"] | "all"; label: string }[] = [
  { key: "all", label: "همه" },
  { key: "rag", label: "RAG" },
  { key: "agents", label: "عامل‌ها" },
  { key: "finetune", label: "فاین‌تیون" },
  { key: "mcp", label: "MCP" },
  { key: "context", label: "مهندسی زمینه" },
  { key: "eval", label: "ارزیابی" },
];

export const AI_ACADEMY: AcademyItem[] = [
  { slug: "agentic_rag", faTitle: "RAG عامل‌محور", faDesc: "ساخت سیستم RAG که خودش تصمیم می‌گیرد کی بازیابی کند و کی پاسخ دهد.", track: "rag" },
  { slug: "corrective-rag", faTitle: "RAG اصلاح‌گر (CRAG)", faDesc: "ارزیابی کیفیت اسناد بازیابی‌شده و اصلاح خودکار مسیر بازیابی.", track: "rag" },
  { slug: "document-chat-rag", faTitle: "گفتگو با اسناد", faDesc: "چت هوشمند روی PDF و اسناد حقوقی با بازیابی برداری.", track: "rag" },
  { slug: "github-rag", faTitle: "RAG روی مخزن کد", faDesc: "پرسش و پاسخ هوشمند روی کدبیس گیت‌هاب.", track: "rag" },
  { slug: "fastest-rag-stack", faTitle: "سریع‌ترین استک RAG", faDesc: "ترکیب Milvus و Groq برای بازیابی و استنتاج با کمترین تأخیر.", track: "rag" },
  { slug: "agent2agent-demo", faTitle: "پروتکل عامل‌به‌عامل (A2A)", faDesc: "همکاری عامل‌های مستقل با پروتکل استاندارد A2A.", track: "agents" },
  { slug: "Multi-Agent-deep-researcher-mcp-windows-linux", faTitle: "پژوهشگر عمیق چندعاملی", faDesc: "عامل‌های چندگانه برای پژوهش عمیق وب با MCP.", track: "agents" },
  { slug: "book-writer-flow", faTitle: "خط تولید کتاب با عامل‌ها", faDesc: "گردش کار چندمرحله‌ای برای تألیف خودکار محتوا.", track: "agents" },
  { slug: "chat-with-code", faTitle: "گفتگو با کد", faDesc: "دستیار تحلیل و توضیح کدبیس با عامل هوشمند.", track: "agents" },
  { slug: "DeepSeek-finetuning", faTitle: "فاین‌تیون DeepSeek", faDesc: "شخصی‌سازی مدل DeepSeek روی داده‌ی اختصاصی.", track: "finetune" },
  { slug: "grpo-finetuning-qwen3", faTitle: "فاین‌تیون تقویتی GRPO", faDesc: "آموزش Qwen3 با یادگیری تقویتی مبتنی بر گروه (GRPO).", track: "finetune" },
  { slug: "Build-reasoning-model", faTitle: "ساخت مدل استدلال‌گر", faDesc: "پرورش توانایی استدلال مرحله‌به‌مرحله در مدل زبانی.", track: "finetune" },
  { slug: "agent-with-mcp-memory", faTitle: "عامل با حافظه‌ی MCP", faDesc: "حافظه‌ی پایدار برای عامل‌ها با سرور MCP.", track: "mcp" },
  { slug: "graphiti-mcp", faTitle: "گراف دانش با MCP", faDesc: "ساخت گراف دانش زمان‌مند و پرسش‌پذیر با Graphiti.", track: "mcp" },
  { slug: "context-engineering-pipeline", faTitle: "خط تولید مهندسی زمینه", faDesc: "چیدمان بهینه‌ی زمینه برای بیشترین دقت مدل.", track: "context" },
  { slug: "guidelines-vs-traditional-prompt", faTitle: "راهنما در برابر پرامپت سنتی", faDesc: "مقایسه‌ی عملی دو رویکرد هدایت مدل.", track: "context" },
  { slug: "eval-and-observability", faTitle: "ارزیابی و ناظرپذیری", faDesc: "سنجش کیفیت خروجی LLM و پایش زنده‌ی رفتار مدل.", track: "eval" },
  { slug: "ai-engineering-roadmap", faTitle: "نقشه‌ی راه مهندسی AI", faDesc: "مسیر یادگیری گام‌به‌گام از صفر تا مهندس ارشد AI.", track: "eval" },
];

/* ── چک‌لیست امنیت عامل — الهام از ECC / AgentShield ─────────────────── */

export interface SecurityCheck {
  id: string;
  title: string;
  desc: string;
}

export const AGENT_SECURITY_CHECKLIST: SecurityCheck[] = [
  { id: "inject", title: "مقاوم در برابر تزریق پرامپت", desc: "دستورهای مخرب داخل محتوای وب یا اسناد نباید بتوانند عامل را هدایت کنند؛ محتوای خارجی همیشه داده است، نه دستور." },
  { id: "secrets", title: "مدیریت امن رمزها", desc: "کلیدهای API فقط در Environment Variable؛ هرگز در کد، لاگ یا خروجی عامل ظاهر نشوند." },
  { id: "sandbox", title: "اجرای در محیط ایزوله", desc: "هر اجرای کد یا دسترسی فایل در سندباکس با حداقل دسترسی ممکن انجام شود." },
  { id: "least-priv", title: "حداقل امتیاز (Least Privilege)", desc: "هر ابزار عامل فقط دسترسی‌هایی داشته باشد که برای کارش ضروری است — نه بیشتر." },
  { id: "audit", title: "ثبت رویداد و پایش", desc: "همه‌ی اقدامات عامل با لاگ ساختاریافته و قابل ممیزی ثبت شود." },
  { id: "ratelimit", title: "محدودیت نرخ و بودجه", desc: "سقف نرخ فراخوانی، طول خروجی و هزینه‌ی توکن برای هر درخواست تعیین شود." },
  { id: "output", title: "پالایش خروجی", desc: "خروجی مدل پیش از نمایش یا اجرا پاک‌سازی و اعتبارسنجی شود (مثل sanitize فارسی دادپیو)." },
  { id: "supply", title: "سلامت زنجیره‌ی تأمین", desc: "وابستگی‌ها به‌صورت دوره‌ای اسکن شوند و فقط از منابع رسمی نصب گردند." },
];

/* ── زنجیره‌ی مسیریابی دادپیو (الهام از OmniRoute) ───────────────────── */

export interface GatewayTier {
  tier: number;
  name: string;
  provider: string;
  desc: string;
  needsKey: boolean;
}

export const GATEWAY_TIERS: GatewayTier[] = [
  {
    tier: 1,
    name: "GLM-4.6 (Z.ai)",
    provider: "api.z.ai",
    desc: "تأمین‌کننده‌ی اصلی تولید — کلید OpenAI-سازگار از Environment Variable (مناسب استقرار Vercel).",
    needsKey: true,
  },
  {
    tier: 2,
    name: "Z.ai SDK سندباکس",
    provider: "z-ai-web-dev-sdk",
    desc: "موتور محیط توسعه — بدون نیاز به کلید، با همان مدل GLM.",
    needsKey: false,
  },
  {
    tier: 3,
    name: "Pollinations",
    provider: "text.pollinations.ai",
    desc: "fallback نهایی بدون‌کلید — تضمین پاسخ‌دهی حتی قطع شدن تأمین‌کننده‌های بالادستی.",
    needsKey: false,
  },
];
