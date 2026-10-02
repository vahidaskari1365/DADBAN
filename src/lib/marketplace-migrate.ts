/* ============================================================================
 * دادپیو — Marketplace schema migration + demo data (idempotent)
 * ---------------------------------------------------------------------------
 * در هر بوت سرور (instrumentation) اجرا می‌شود:
 *  ۱) CREATE TABLE IF NOT EXISTS برای جداول مارکت‌پلیس
 *  ۲) ALTER TABLE ... ADD COLUMN IF NOT EXISTS برای ستون‌های جدید cases
 *  ۳) درج دادهٔ نمونه فقط اگر جدول خالی باشد (سازگار با محیط تولید)
 * ========================================================================== */

import { db } from "@/db";
import { sql } from "drizzle-orm";

const DDL: string[] = [
  /* enum types — idempotent */
  `DO $$ BEGIN CREATE TYPE proposal_status AS ENUM ('pending','negotiating','accepted','rejected','withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE case_event_actor AS ENUM ('lawyer','trainee','system','client'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE appointment_kind AS ENUM ('hearing','consultation','deadline','task'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE installment_status AS ENUM ('pending','paid','late','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE installment_source AS ENUM ('client','provider'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE credit_provider AS ENUM ('azki','partner_bank'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE credit_status AS ENUM ('draft','submitted','scoring','approved','rejected','funded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE dp_payout_status AS ENUM ('requested','processing','paid','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE dp_ledger_type AS ENUM ('payment','commission','payout','refund'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE team_role AS ENUM ('trainee','associate'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS case_proposals (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,
    lawyer_id INTEGER NOT NULL,
    amount NUMERIC(14,0) NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    duration_months INTEGER NOT NULL DEFAULT 0,
    status proposal_status NOT NULL DEFAULT 'pending',
    client_message TEXT NOT NULL DEFAULT '',
    ai_match_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS case_events (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,
    actor case_event_actor NOT NULL DEFAULT 'lawyer',
    actor_name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    progress INTEGER,
    visible_to_client BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS case_messages (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'client',
    sender_name TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    case_id INTEGER,
    lawyer_id INTEGER,
    client_phone TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    kind appointment_kind NOT NULL DEFAULT 'task',
    location TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    starts_at TIMESTAMP NOT NULL,
    reminder_sent BOOLEAN NOT NULL DEFAULT false,
    created_by TEXT NOT NULL DEFAULT 'lawyer',
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS installments (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,
    number INTEGER NOT NULL DEFAULT 1,
    amount NUMERIC(14,0) NOT NULL,
    due_date TIMESTAMP NOT NULL,
    status installment_status NOT NULL DEFAULT 'pending',
    source installment_source NOT NULL DEFAULT 'client',
    paid_at TIMESTAMP,
    tracking_code TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS credit_requests (
    id SERIAL PRIMARY KEY,
    case_id INTEGER NOT NULL,
    provider credit_provider NOT NULL DEFAULT 'azki',
    amount NUMERIC(14,0) NOT NULL,
    months INTEGER NOT NULL DEFAULT 12,
    status credit_status NOT NULL DEFAULT 'draft',
    status_detail TEXT NOT NULL DEFAULT '',
    reference_code TEXT NOT NULL DEFAULT '',
    provider_payload TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS payout_requests (
    id SERIAL PRIMARY KEY,
    lawyer_id INTEGER NOT NULL,
    amount NUMERIC(14,0) NOT NULL,
    status dp_payout_status NOT NULL DEFAULT 'requested',
    note TEXT NOT NULL DEFAULT '',
    iban TEXT NOT NULL DEFAULT '',
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS platform_ledger (
    id SERIAL PRIMARY KEY,
    case_id INTEGER,
    lawyer_id INTEGER,
    type dp_ledger_type NOT NULL DEFAULT 'payment',
    amount NUMERIC(14,0) NOT NULL,
    commission NUMERIC(14,0) NOT NULL DEFAULT '0',
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    lawyer_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    role team_role NOT NULL DEFAULT 'trainee',
    scope TEXT NOT NULL DEFAULT 'پرونده‌های ارجاعی',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  /* ستون‌های توسعه‌یافته جدول cases (additive) */
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS specialty TEXT NOT NULL DEFAULT 'عمومی'`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS province TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_user_phone TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_lawyer_id INTEGER`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 5`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS ai_category TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS ai_confidence INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS ai_estimate TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'normal'`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS fee_agreed NUMERIC(14,0)`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS contract_status TEXT NOT NULL DEFAULT 'none'`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS contract_code TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMP`,
  `ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true`,
];

const DAY = 86400000;
const ago = (n: number) => new Date(Date.now() - n * DAY);
const ahead = (n: number) => new Date(Date.now() + n * DAY);

async function count(table: string): Promise<number> {
  const res = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c FROM ${table}`));
  const rows = (res as { rows?: unknown[] }).rows ?? [];
  return Number((rows[0] as { c?: number })?.c ?? 0);
}

async function seedMarketplaceDemo(): Promise<void> {
  /* --- تنظیمات پلتفرم --- */
  if ((await count("platform_settings")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO platform_settings (key, value) VALUES
       ('commission_rate', '15'),
       ('payout_min', '10000000'),
       ('min_lawyer_score', '4.0'),
       ('credit_providers', 'azki,partner_bank'),
       ('matching_model', 'glm-4.6')`
    ));
  }

  /* --- پرونده‌های نمونهٔ بازار (اگر پرونده نیست، چند مورد درج کن) --- */
  if ((await count("cases")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO cases (case_number, tracking_token, subject, description, city, stage, budget, contact_name, contact_phone, status, specialty, province, ai_category, ai_confidence, ai_estimate, progress) VALUES
       ('C-14040101','tok-demo-1','الزام به تنظیم سند رسمی','اختلاف در انتقال یک واحد تجاری و نیاز به پیگیری قضایی برای الزام به تنظیم سند رسمی.','تهران','ثبت اولیه','۸۰ تا ۱۵۰ میلیون','موکل نمونه الف','09120000001','new','ملکی','تهران','ملکی',96,'۴ تا ۶ ماه · ۸۰ تا ۱۵۰ میلیون تومان',5),
       ('C-14040102','tok-demo-2','دفاع در پرونده جرایم اقتصادی','پرونده مالی پیچیده؛ موکل نیازمند وکیل متخصص کیفری با سابقه پرونده‌های اقتصادی است.','تهران','ثبت اولیه','۱۵۰ تا ۳۰۰ میلیون','موکل نمونه ب','09120000002','new','کیفری','تهران','کیفری',93,'۶ تا ۱۲ ماه · ۱۵۰ تا ۳۰۰ میلیون تومان',5),
       ('C-14040103','tok-demo-3','مطالبه وجه و خسارت تأخیر','مطالبه وجه ناشی از قرارداد و پیگیری تا اجرای حکم.','کرج','ثبت اولیه','۵۰ تا ۹۰ میلیون','موکل نمونه ج','09120000003','new','چک و اسناد','البرز','حقوقی',89,'۳ تا ۵ ماه · ۵۰ تا ۹۰ میلیون تومان',5),
       ('C-14040104','tok-demo-4','تنظیم قرارداد مشارکت ساخت','نیاز به بررسی اسناد مالکیت و تنظیم قرارداد جامع مشارکت در ساخت.','تهران','ثبت اولیه','۳۰ تا ۷۰ میلیون','موکل نمونه د','09120000004','new','قراردادها','تهران','قرارداد',87,'۱ ماه · ۳۰ تا ۷۰ میلیون تومان',5)`
    ));
  }

  /* --- پیشنهادهای قیمت نمونه --- */
  if ((await count("case_proposals")) === 0) {
    await db.execute(sql.raw([
      `INSERT INTO case_proposals (case_id, lawyer_id, amount, note, duration_months, status, ai_match_score, created_at) VALUES
       (1, 1, 1200000000, 'دامنه خدمات: تنظیم دادخواست، تمام جلسات رسیدگی تا صدور رأی بدوی و پیگیری اجرای حکم. امکان پرداخت در سه قسط.', 6, 'accepted', 96, now() - interval '9 days')`,
      `INSERT INTO case_proposals (case_id, lawyer_id, amount, note, duration_months, status, ai_match_score, created_at) VALUES
       (2, 3, 1800000000, 'دفاع تخصصی در مرحله دادسرا و دادگاه با تمرکز بر اسناد مالی؛ پرداخت در دو مرحله.', 10, 'negotiating', 93, now() - interval '4 days')`,
      `INSERT INTO case_proposals (case_id, lawyer_id, amount, note, duration_months, status, ai_match_score, created_at) VALUES
       (3, 7, 700000000, 'مطالبه وجه چک از مسیر اجرائیه و توقیف اموال؛ تخمین ۴ ماه تا وصول.', 4, 'pending', 89, now() - interval '2 days')`,
      `INSERT INTO case_proposals (case_id, lawyer_id, amount, note, duration_months, status, ai_match_score, created_at) VALUES
       (1, 4, 1450000000, 'بررسی کامل اسناد ثبتی و تنظیم دادخواست با لایحه تخصصی؛ بدون امکان قسطی.', 5, 'pending', 91, now() - interval '1 days')`,
    ].join(";")));
  }

  /* --- روند پرونده ۱ (طبق نمونهٔ طراحی) --- */
  if ((await count("case_events")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO case_events (case_id, actor, actor_name, title, description, progress, visible_to_client, created_at) VALUES
       (1,'system','دادپیو','تشکیل پرونده و احراز اطلاعات','اطلاعات هویتی و اولیه پرونده بررسی و تأیید شد.',15,true, now() - interval '10 days'),
       (1,'lawyer','دکتر سهراب محمدی','دریافت و بررسی اسناد','۸ سند دریافت و بررسی اولیه شد.',35,true, now() - interval '8 days'),
       (1,'lawyer','دکتر سهراب محمدی','جلسه مشاوره و تعیین راهبرد','راهبرد حقوقی پرونده با موکل بررسی و نهایی شد.',48,true, now() - interval '6 days'),
       (1,'lawyer','دکتر سهراب محمدی','بررسی سند مالکیت','بررسی اصالت و مشخصات ثبتی سند انجام شد.',55,true, now() - interval '5 days'),
       (1,'lawyer','دکتر سهراب محمدی','تهیه پیش‌نویس دادخواست','پیش‌نویس دادخواست الزام به تنظیم سند در حال آماده‌سازی است.',62,true, now() - interval '2 days'),
       (1,'lawyer','دکتر سهراب محمدی','ثبت دادخواست و اخذ شماره پرونده','پس از نهایی‌شدن دادخواست در دفاتر خدمات قضایی ثبت می‌شود.',NULL,false, now() - interval '2 days'),
       (1,'system','دادپیو','تعیین وقت رسیدگی','در انتظار تعیین وقت از سوی مرجع قضایی.',NULL,true, now() - interval '1 days')`
    ));
  }

  /* --- پیام‌های نمونه --- */
  if ((await count("case_messages")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO case_messages (case_id, sender_role, sender_name, body, created_at) VALUES
       (1,'client','موکل نمونه الف','سلام، سند جدید مربوط به ملک را بارگذاری کردم؛ ممنون می‌شود بررسی کنید.', now() - interval '3 days'),
       (1,'lawyer','دکتر سهراب محمدی','سلام و احترام؛ سند را بررسی کردم. مشخصات ثبتی با قرارداد مطابقت دارد. برای جلسه مشاوره بعدی خبر می‌دهم.', now() - interval '2 days'),
       (1,'client','موکل نمونه الف','خیلی خب. پیش‌پرداخت هم پرداخت شد، مبلغ باقی‌مانده طبق برنامه اقساطی است.', now() - interval '1 days')`
    ));
  }

  /* --- تقویم جلسات و مهلت‌ها --- */
  if ((await count("appointments")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO appointments (case_id, lawyer_id, title, kind, location, notes, starts_at, created_by) VALUES
       (1, 1, 'جلسه رسیدگی · پرونده الزام به تنظیم سند','hearing','شعبه ۱۵ دادگاه عمومی حقوقی تهران','با همراه داشتن اصل اسناد مالکیت', to_timestamp(extract(epoch from now()) + 6*86400), 'lawyer'),
       (1, 1, 'پایان مهلت اعتراض به کارشناسی','deadline','','مهلت قانونی ۲۰ روزه از تاریخ ابلاغ', to_timestamp(extract(epoch from now()) + 12*86400), 'lawyer'),
       (1, 1, 'جلسه مشاوره آنلاین با موکل','consultation','آنلاین · تصویری','بررسی پیش‌نویس دادخواست', to_timestamp(extract(epoch from now()) + 2*86400), 'lawyer')`
    ));
  }

  /* --- اقساط پرونده ۱ (پیش‌پرداخت پرداخت‌شده + ۱۱ قسط) --- */
  if ((await count("installments")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO installments (case_id, number, amount, due_date, status, source, paid_at, tracking_code) VALUES
       (1, 0, 360000000, now() - interval '7 days', 'paid', 'client', now() - interval '7 days', 'TRX-DEMO-001'),
       (1, 1, 82000000, now() + interval '20 days', 'pending', 'client', NULL, ''),
       (1, 2, 82000000, now() + interval '50 days', 'pending', 'client', NULL, ''),
       (1, 3, 82000000, now() + interval '80 days', 'pending', 'client', NULL, '')`
    ));
  }

  /* --- درخواست تأمین اعتبار (ازکی‌وام) --- */
  if ((await count("credit_requests")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO credit_requests (case_id, provider, amount, months, status, status_detail, reference_code, created_at) VALUES
       (1, 'azki', 900000000, 12, 'submitted', 'در انتظار اعتبارسنجی موکل در پنل تأمین‌کننده', 'AZK-DEMO-4512', now() - interval '3 days')`
    ));
  }

  /* --- کمیسیون و تراکنش‌ها --- */
  if ((await count("platform_ledger")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO platform_ledger (case_id, lawyer_id, type, amount, commission, description, created_at) VALUES
       (1, 1, 'payment', 360000000, 54000000, 'پیش‌پرداخت حق‌الوکاله پرونده ۱۴۰۴۰۱۰۱', now() - interval '7 days'),
       (1, 1, 'commission', 54000000, 0, 'کمیسیون پلتفرم (۱۵٪) از پیش‌پرداخت', now() - interval '7 days')`
    ));
  }

  /* --- تیم و کارآموز وکیل ۱ --- */
  if ((await count("team_members")) === 0) {
    await db.execute(sql.raw(
      `INSERT INTO team_members (lawyer_id, name, email, role, scope, status) VALUES
       (1, 'علی رضایی', 'ali.rezaei@example.ir', 'trainee', 'پرونده‌های ارجاعی', 'active'),
       (1, 'مریم کاظمی', 'maryam.kazemi@example.ir', 'associate', 'مدارک و پیش‌نویس‌ها', 'active')`
    ));
  }
}

/** اجرای idempotent مایگریشن + دادهٔ نمونه. هر process فقط یک‌بار. */
const g = globalThis as typeof globalThis & { __dpMarketplaceMigrated?: boolean };
export async function ensureMarketplaceSchema(): Promise<void> {
  if (g.__dpMarketplaceMigrated) return;
  g.__dpMarketplaceMigrated = true;
  for (const stmt of DDL) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      /* ignore — drizzle push is primary; additive statements are safe */
    }
  }
  try {
    await seedMarketplaceDemo();
  } catch {
    /* non-fatal — demo data only */
  }
}
