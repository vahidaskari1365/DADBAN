-- ============================================================================
-- دادبان — Migration 0002: Managed Services ("خدمات پیگیری و انجام امور")
-- Idempotent, reversible-by-design, safe to re-run. Apply with:
--   psql "$DATABASE_URL" -f migrations/0002_managed_services.sql
-- (The same DDL is also run automatically on startup by src/lib/auto-seed.ts.)
-- ============================================================================

-- Enums (guarded against duplicate_object)
DO $$ BEGIN CREATE TYPE svc_classification AS ENUM ('ADMINISTRATIVE','INFORMATIONAL','DOCUMENT_SERVICE','PROFESSIONAL_LEGAL','REPRESENTATION','REQUIRES_REVIEW'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE svc_category AS ENUM ('CASE_FOLLOW_UP','JUDICIAL_OPERATIONS','ENFORCEMENT','REGISTRATION','TAX','ADMINISTRATIVE','DOCUMENTS','ORGANIZATIONS','OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE svc_price_type AS ENUM ('FIXED','FROM','QUOTE','REQUIRES_REVIEW'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE svc_request_status AS ENUM ('DRAFT','SUBMITTED','REVIEWING','AWAITING_DOCUMENTS','QUOTED','AWAITING_PAYMENT','ASSIGNED','IN_PROGRESS','WAITING_EXTERNAL','COMPLETED','DELIVERED','CANCELLED','REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE svc_urgency AS ENUM ('LOW','NORMAL','HIGH','URGENT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE svc_contact_preference AS ENUM ('PHONE','SMS','WHATSAPP','EMAIL','PORTAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE svc_contract_status AS ENUM ('NOT_REQUIRED','DRAFT','SENT','ACCEPTED','SIGNED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE svc_quote_status AS ENUM ('DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE svc_event_type AS ENUM ('created','review_started','documents_received','assigned','progress','waiting_external','result_received','completed','status_changed','note','payment_required','quote_ready','contract_required','cancelled','rejected','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE SEQUENCE IF NOT EXISTS service_request_seq START WITH 1000;

CREATE TABLE IF NOT EXISTS service_categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'folder',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS managed_services (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  classification svc_classification NOT NULL DEFAULT 'ADMINISTRATIVE',
  category svc_category NOT NULL DEFAULT 'OTHER',
  icon TEXT NOT NULL DEFAULT 'folder',
  estimated_time TEXT NOT NULL DEFAULT '',
  price_type svc_price_type NOT NULL DEFAULT 'QUOTE',
  base_price INTEGER NOT NULL DEFAULT 0,
  requires_case_info BOOLEAN NOT NULL DEFAULT false,
  requires_documents BOOLEAN NOT NULL DEFAULT false,
  requires_lawyer BOOLEAN NOT NULL DEFAULT false,
  requires_supervision BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  form_fields JSONB,
  required_docs JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  request_number TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES managed_services(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  answers JSONB,
  urgency svc_urgency NOT NULL DEFAULT 'NORMAL',
  city TEXT,
  organization TEXT,
  reference_number TEXT,
  case_number TEXT,
  requested_deadline TEXT,
  contact_preference svc_contact_preference NOT NULL DEFAULT 'PORTAL',
  status svc_request_status NOT NULL DEFAULT 'DRAFT',
  assigned_staff_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  supervising_lawyer_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  price INTEGER,
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  contract_status svc_contract_status NOT NULL DEFAULT 'NOT_REQUIRED',
  final_report TEXT,
  result_file_label TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_request_events (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  type svc_event_type NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  visible_to_user BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_request_docs (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  uploaded_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  uploader_role TEXT NOT NULL DEFAULT 'client',
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'سند',
  size INTEGER NOT NULL DEFAULT 0,
  storage_key TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_quotes (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IRR',
  expires_at TIMESTAMP,
  status svc_quote_status NOT NULL DEFAULT 'DRAFT',
  created_by INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_audit_logs (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES service_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_role TEXT,
  actor_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS managed_services_category_idx ON managed_services (category);
CREATE INDEX IF NOT EXISTS managed_services_active_featured_idx ON managed_services (active, featured);
CREATE INDEX IF NOT EXISTS service_requests_user_idx ON service_requests (user_id);
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests (status);
CREATE INDEX IF NOT EXISTS service_requests_staff_idx ON service_requests (assigned_staff_id);
CREATE INDEX IF NOT EXISTS service_requests_supervisor_idx ON service_requests (supervising_lawyer_id);
CREATE INDEX IF NOT EXISTS service_request_events_request_idx ON service_request_events (request_id, created_at);
CREATE INDEX IF NOT EXISTS service_request_docs_request_idx ON service_request_docs (request_id);
CREATE INDEX IF NOT EXISTS service_quotes_request_idx ON service_quotes (request_id);
CREATE INDEX IF NOT EXISTS service_notifications_user_idx ON service_notifications (user_id, read);
CREATE INDEX IF NOT EXISTS service_audit_logs_request_idx ON service_audit_logs (request_id);
