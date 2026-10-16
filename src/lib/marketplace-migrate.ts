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

async function count(table: string): Promise<number> {
  const res = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c FROM ${table}`));
  const rows = (res as { rows?: unknown[] }).rows ?? [];
  return Number((rows[0] as { c?: number })?.c ?? 0);
}

async function seedMarketplaceDemo(): Promise<void> {
  /* دادهٔ نمونه حذف شد — دیگر هیچ پروندهٔ جعلی، پیشنهاد وکیل جعلی، رویداد
     «دکتر سهراب محمدی»، پیام نمونه، قسط، اعتبار، تراکنش یا کارآموز/همکار
     جعلی (علی رضایی / مریم کاظمی) ساخته نمی‌شود.
     فقط تنظیمات واقعی پلتفرم درج می‌شود؛ پرونده، وکیل و تیم همگی واقعی‌اند. */
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
