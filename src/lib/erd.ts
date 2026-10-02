// ERD metadata for the developer/schema reference page.
// Mirrors src/db/schema-enterprise.ts (the `core` schema). Used to render a
// human-readable data-model map in the running app.

import type { IconKey } from "@/lib/data";

export interface ErdColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string; // referenced table
  note?: string;
}
export interface ErdTable {
  name: string;
  desc: string;
  columns: ErdColumn[];
  indexes: string[];
  relation?: "1:N" | "N:M" | "1:1" | "N:1";
}
export interface ErdDomain {
  group: string;
  icon: IconKey;
  color: string;
  tables: ErdTable[];
}

export const ERD_DOMAINS: ErdDomain[] = [
  {
    group: "Identity & RBAC",
    icon: "lock",
    color: "#15365d",
    tables: [
      { name: "users", desc: "هسته‌ی هویت — همه نقش‌ها از این جدول مشتق می‌شوند.", relation: "1:N", indexes: ["mobile (unique)", "email (unique)"], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "mobile", type: "varchar", note: "unique" }, { name: "email", type: "varchar" },
        { name: "password_hash", type: "text" }, { name: "status", type: "enum" }, { name: "mfa_enabled", type: "bool" }, { name: "last_login_at", type: "timestamp" },
      ] },
      { name: "roles", desc: "نقش‌ها: CLIENT, LAWYER, ADMIN…", indexes: ["name (unique)"], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "name", type: "varchar", note: "unique" }, { name: "label", type: "varchar" }, { name: "is_system", type: "bool" },
      ] },
      { name: "permissions", desc: "دسترسی‌های ریزدانه مثل case.read.", indexes: ["name (unique)"], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "name", type: "varchar", note: "e.g. case.read" }, { name: "description", type: "text" },
      ] },
      { name: "user_roles", desc: "M:N کاربر ↔ نقش", relation: "N:M", indexes: ["user_id"], columns: [
        { name: "user_id", type: "uuid", fk: "users", pk: true }, { name: "role_id", type: "uuid", fk: "roles", pk: true },
      ] },
      { name: "role_permissions", desc: "M:N نقش ↔ دسترسی", relation: "N:M", indexes: [], columns: [
        { name: "role_id", type: "uuid", fk: "roles", pk: true }, { name: "permission_id", type: "uuid", fk: "permissions", pk: true },
      ] },
      { name: "refresh_tokens", desc: "توکن‌های قابل ابطال.", indexes: ["token_hash", "user_id"], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "token_hash", type: "text" }, { name: "revoked_at", type: "timestamp" },
      ] },
    ],
  },
  {
    group: "Profiles & Organizations",
    icon: "user",
    color: "#0e7c7b",
    tables: [
      { name: "client_profiles", desc: "پروفایل موکل — ۱:۱ با users.", relation: "1:1", indexes: ["user_id (unique)"], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "city", type: "varchar" }, { name: "verification_status", type: "enum" },
      ] },
      { name: "lawyer_profiles", desc: "پروفایل وکیل — اطلاعات حرفه‌ای.", relation: "1:1", indexes: ["user_id (unique)", "city", "verification_status"], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "license_number", type: "varchar" }, { name: "years_of_experience", type: "int" }, { name: "rating", type: "real" }, { name: "verification_status", type: "enum" },
      ] },
      { name: "organizations", desc: "شرکت‌ها و مؤسسات حقوقی (Multi-tenant).", indexes: [], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "name", type: "varchar" }, { name: "plan", type: "enum" }, { name: "national_id", type: "varchar" },
      ] },
      { name: "organization_members", desc: "اعضای سازمان.", relation: "N:M", indexes: ["(org_id,user_id) unique"], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "organization_id", type: "uuid", fk: "organizations" }, { name: "user_id", type: "uuid", fk: "users" }, { name: "role", type: "varchar" },
      ] },
    ],
  },
  {
    group: "Legal Professionals",
    icon: "badge",
    color: "#946809",
    tables: [
      { name: "specialties", desc: "حوزه‌های تخصص (درختی).", indexes: ["slug (unique)"], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "slug", type: "varchar", note: "unique" }, { name: "name", type: "varchar" }, { name: "parent_id", type: "uuid" },
      ] },
      { name: "lawyer_specialties", desc: "M:N وکیل ↔ تخصص", relation: "N:M", indexes: [], columns: [
        { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles", pk: true }, { name: "specialty_id", type: "uuid", fk: "specialties", pk: true }, { name: "is_primary", type: "bool" },
      ] },
      { name: "lawyer_verifications", desc: "راستی‌آزمایی پروانه و مدارک.", relation: "1:N", indexes: [], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles" }, { name: "status", type: "enum" }, { name: "verified_by", type: "uuid", fk: "users" }, { name: "expires_at", type: "timestamp" },
      ] },
      { name: "lawyer_availability_rules", desc: "قانون تکرارشونده (روز هفته) — بدون میلیون‌ها slot.", relation: "1:N", indexes: [], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles" }, { name: "weekday", type: "int" }, { name: "start_time", type: "time" }, { name: "end_time", type: "time" },
      ] },
      { name: "lawyer_availability_exceptions", desc: "استثناها: مرخصی، تعطیلی، رزرو.", relation: "1:N", indexes: [], columns: [
        { name: "id", type: "uuid", pk: true }, { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles" }, { name: "date", type: "date" }, { name: "is_available", type: "bool" },
      ] },
    ],
  },
  {
    group: "Marketplace",
    icon: "briefcase",
    color: "#2a5d8f",
    tables: [
      { name: "service_categories", desc: "دسته‌بندی خدمات.", indexes: ["slug (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "slug", type: "varchar" }, { name: "name", type: "varchar" }] },
      { name: "services", desc: "خدمات قابل ارائه.", relation: "N:1", indexes: ["slug (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "category_id", type: "uuid", fk: "service_categories" }, { name: "slug", type: "varchar" }, { name: "price", type: "numeric" }] },
      { name: "lawyer_services", desc: "قیمت/مدت اختصاصی هر وکیل برای هر خدمت.", relation: "N:M", indexes: ["(lawyer,service) unique"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles" }, { name: "service_id", type: "uuid", fk: "services" }, { name: "price", type: "numeric" }, { name: "duration_minutes", type: "int" }] },
      { name: "bookings", desc: "رزرو مشاوره/خدمت با State Machine.", relation: "1:N", indexes: ["(lawyer,start)", "(client,start)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "client_id", type: "uuid", fk: "users" }, { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles" }, { name: "meeting_type", type: "enum" }, { name: "scheduled_start", type: "timestamp" }, { name: "status", type: "enum" }, { name: "payment_status", type: "enum" }] },
      { name: "consultation_sessions", desc: "جلسه‌ی مشاوره پس از شروع.", relation: "1:1", indexes: [], columns: [{ name: "id", type: "uuid", pk: true }, { name: "booking_id", type: "uuid", fk: "bookings" }, { name: "started_at", type: "timestamp" }, { name: "rating", type: "int" }] },
      { name: "service_reviews", desc: "فقط پس از دریافت خدمت واقعی.", relation: "1:N", indexes: ["lawyer_id", "booking_id (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "reviewer_id", type: "uuid", fk: "users" }, { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles" }, { name: "booking_id", type: "uuid", fk: "bookings" }, { name: "rating", type: "int" }] },
    ],
  },
  {
    group: "Case Management (مرکزی)",
    icon: "folder",
    color: "#7a2e7d",
    tables: [
      { name: "cases", desc: "موجودیت مرکزی سیستم.", relation: "1:N", indexes: ["case_number (unique)", "status", "organization_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "case_number", type: "varchar", note: "unique" }, { name: "case_type_id", type: "uuid", fk: "case_types" }, { name: "organization_id", type: "uuid", fk: "organizations" }, { name: "status", type: "enum" }, { name: "priority", type: "enum" }] },
      { name: "case_parties", desc: "طرفین پرونده: موکل، طرف مقابل، شاهد…", relation: "1:N", indexes: ["case_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "user_id", type: "uuid", fk: "users" }, { name: "party_type", type: "enum" }] },
      { name: "case_lawyers", desc: "وکلای پرونده با نقش (اصلی/دوم/کارآموز).", relation: "1:N", indexes: ["(case,lawyer)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles" }, { name: "role", type: "varchar" }] },
      { name: "case_events", desc: "Timeline — هر اتفاق یک ردیف.", relation: "1:N", indexes: ["(case,event_date)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "event_type", type: "enum" }, { name: "event_date", type: "timestamp" }, { name: "metadata", type: "jsonb" }] },
      { name: "case_deadlines", desc: "مهلت‌های حقوقی → Notification.", relation: "1:N", indexes: ["(case,due_at)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "due_at", type: "timestamp" }, { name: "priority", type: "enum" }] },
      { name: "case_hearings", desc: "جلسات دادگاه.", relation: "1:N", indexes: ["(case,scheduled_at)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "court_name", type: "varchar" }, { name: "scheduled_at", type: "timestamp" }] },
      { name: "case_status_history", desc: "تاریخچه‌ی انتقال وضعیت‌ها (State Machine).", relation: "1:N", indexes: ["case_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "from_status", type: "enum" }, { name: "to_status", type: "enum" }] },
    ],
  },
  {
    group: "Documents",
    icon: "document",
    color: "#1d6a3f",
    tables: [
      { name: "documents", desc: "فقط Metadata — فایل در Object Storage.", relation: "1:N", indexes: ["owner_id", "created_at"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "owner_id", type: "uuid", fk: "users" }, { name: "storage_key", type: "text" }, { name: "checksum", type: "varchar" }, { name: "mime_type", type: "varchar" }] },
      { name: "document_versions", desc: "Versioning بدون overwrite.", relation: "1:N", indexes: ["(doc,version)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "document_id", type: "uuid", fk: "documents" }, { name: "version_number", type: "int" }, { name: "storage_key", type: "text" }] },
      { name: "document_permissions", desc: "VIEW/DOWNLOAD/EDIT/SHARE با انقضا.", relation: "1:N", indexes: ["(doc,user)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "document_id", type: "uuid", fk: "documents" }, { name: "user_id", type: "uuid", fk: "users" }, { name: "permission", type: "enum" }, { name: "expires_at", type: "timestamp" }] },
      { name: "document_links", desc: "اتصال سند به Case/Contract/Booking.", relation: "1:N", indexes: ["(entity_type,entity_id)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "document_id", type: "uuid", fk: "documents" }, { name: "entity_type", type: "varchar" }, { name: "entity_id", type: "uuid" }] },
    ],
  },
  {
    group: "Contracts",
    icon: "file",
    color: "#8f2a2a",
    tables: [
      { name: "contract_templates", desc: "قالب‌های قرارداد با fields_schema.", indexes: ["slug (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "slug", type: "varchar" }, { name: "body_template", type: "text" }, { name: "fields_schema", type: "jsonb" }] },
      { name: "contracts", desc: "قرارداد — متصل به Case.", relation: "1:N", indexes: [], columns: [{ name: "id", type: "uuid", pk: true }, { name: "template_id", type: "uuid", fk: "contract_templates" }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "status", type: "varchar" }] },
      { name: "contract_versions", desc: "هر نسخه یک ردیف — بدون overwrite.", relation: "1:N", indexes: ["(contract,version)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "contract_id", type: "uuid", fk: "contracts" }, { name: "version_number", type: "int" }, { name: "content", type: "text" }] },
      { name: "contract_parties", desc: "طرفین و امضای الکترونیک.", relation: "1:N", indexes: [], columns: [{ name: "id", type: "uuid", pk: true }, { name: "contract_id", type: "uuid", fk: "contracts" }, { name: "user_id", type: "uuid", fk: "users" }, { name: "signed_at", type: "timestamp" }] },
    ],
  },
  {
    group: "Finance (Ledger)",
    icon: "money",
    color: "#b07d12",
    tables: [
      { name: "invoices", desc: "فاکتورها.", indexes: ["number (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "number", type: "varchar" }, { name: "amount", type: "numeric" }, { name: "status", type: "enum" }] },
      { name: "payments", desc: "پرداخت‌ها با gateway.", relation: "1:N", indexes: ["(user,status)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "booking_id", type: "uuid", fk: "bookings" }, { name: "amount", type: "numeric" }, { name: "status", type: "enum" }] },
      { name: "wallets", desc: "کیف پول — ۱:۱ با users.", relation: "1:1", indexes: ["user_id (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "balance", type: "numeric" }] },
      { name: "wallet_transactions", desc: "Ledger — هر تغییر یک ردیف، balance_after.", relation: "1:N", indexes: ["wallet_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "wallet_id", type: "uuid", fk: "wallets" }, { name: "type", type: "enum" }, { name: "amount", type: "numeric" }, { name: "balance_after", type: "numeric" }] },
      { name: "payouts", desc: "تسویه با وکیل + کمیسیون.", relation: "1:N", indexes: [], columns: [{ name: "id", type: "uuid", pk: true }, { name: "lawyer_id", type: "uuid", fk: "lawyer_profiles" }, { name: "net_amount", type: "numeric" }, { name: "commission", type: "numeric" }, { name: "status", type: "enum" }] },
    ],
  },
  {
    group: "Communication",
    icon: "chat",
    color: "#1565c0",
    tables: [
      { name: "conversations", desc: "گفتگو — متصل به Case.", relation: "1:N", indexes: ["case_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "type", type: "varchar" }] },
      { name: "conversation_members", desc: "M:N گفتگو ↔ کاربر", relation: "N:M", indexes: [], columns: [{ name: "conversation_id", type: "uuid", fk: "conversations", pk: true }, { name: "user_id", type: "uuid", fk: "users", pk: true }] },
      { name: "messages", desc: "پیام‌ها با read_at.", relation: "1:N", indexes: ["conversation_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "conversation_id", type: "uuid", fk: "conversations" }, { name: "sender_id", type: "uuid", fk: "users" }, { name: "body", type: "text" }, { name: "message_type", type: "enum" }] },
      { name: "notifications", desc: "اعلان چندکاناله (در‌اپ، SMS، ایمیل، Push).", relation: "1:N", indexes: ["(user,read_at)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "channel", type: "enum" }, { name: "title", type: "varchar" }, { name: "data", type: "jsonb" }] },
    ],
  },
  {
    group: "Content & Legal Knowledge",
    icon: "book",
    color: "#444b8f",
    tables: [
      { name: "cms_articles", desc: "مقالات + SEO.", indexes: ["slug (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "category_id", type: "uuid", fk: "article_categories" }, { name: "slug", type: "varchar" }, { name: "seo_description", type: "text" }, { name: "canonical_url", type: "text" }] },
      { name: "legal_terms", desc: "واژه‌نامه حقوقی.", indexes: ["slug (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "term", type: "varchar" }, { name: "simple_definition", type: "text" }, { name: "pro_definition", type: "text" }] },
      { name: "laws", desc: "قوانین.", indexes: ["slug (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "name", type: "varchar" }, { name: "status", type: "varchar" }, { name: "summary", type: "text" }] },
      { name: "law_articles", desc: "مواد هر قانون.", relation: "1:N", indexes: ["law_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "law_id", type: "uuid", fk: "laws" }, { name: "number", type: "varchar" }, { name: "body", type: "text" }] },
      { name: "judgments", desc: "آرای قضایی.", indexes: ["slug (unique)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "title", type: "varchar" }, { name: "court", type: "varchar" }, { name: "summary", type: "text" }] },
      { name: "questions / answers", desc: "پرسش و پاسخ تأییدشده.", relation: "1:N", indexes: ["status", "question_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "title", type: "varchar" }, { name: "is_verified", type: "bool" }] },
    ],
  },
  {
    group: "AI (RAG)",
    icon: "sparkles",
    color: "#6a1b9a",
    tables: [
      { name: "ai_conversations", desc: "مکالمه‌ی AI — متصل به Case.", relation: "1:N", indexes: [], columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "case_id", type: "uuid", fk: "cases" }, { name: "title", type: "varchar" }] },
      { name: "ai_messages", desc: "پیام‌های کاربر/دستیار.", relation: "1:N", indexes: ["conversation_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "conversation_id", type: "uuid", fk: "ai_conversations" }, { name: "role", type: "varchar" }, { name: "content", type: "text" }] },
      { name: "ai_message_sources", desc: "هر پاسخ AI + منابع استناد.", relation: "1:N", indexes: ["ai_message_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "ai_message_id", type: "uuid", fk: "ai_messages" }, { name: "source_type", type: "enum" }, { name: "citation", type: "text" }] },
      { name: "knowledge_documents / chunks", desc: "مبنای RAG + embeddings (pgvector).", relation: "1:N", indexes: ["knowledge_document_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "source_type", type: "enum" }, { name: "content", type: "text" }, { name: "embedding", type: "vector/jsonb" }] },
    ],
  },
  {
    group: "System",
    icon: "landmark",
    color: "#5a6b82",
    tables: [
      { name: "audit_logs", desc: "ردیابی همه‌ی عملیات حساس.", relation: "1:N", indexes: ["(entity_type,entity_id)", "actor_id"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "actor_id", type: "uuid", fk: "users" }, { name: "action", type: "enum" }, { name: "old_value", type: "jsonb" }, { name: "new_value", type: "jsonb" }, { name: "ip_address", type: "varchar" }] },
      { name: "support_tickets", desc: "تیکت پشتیبانی.", relation: "1:N", indexes: ["number (unique)", "(user,status)"], columns: [{ name: "id", type: "uuid", pk: true }, { name: "user_id", type: "uuid", fk: "users" }, { name: "category", type: "varchar" }, { name: "priority", type: "enum" }] },
      { name: "reports", desc: "گزارش‌های تحلیلی.", indexes: [], columns: [{ name: "id", type: "uuid", pk: true }, { name: "type", type: "varchar" }, { name: "period", type: "varchar" }, { name: "data", type: "jsonb" }] },
    ],
  },
];

export const ERD_STATS = {
  domains: ERD_DOMAINS.length,
  tables: ERD_DOMAINS.reduce((s, d) => s + d.tables.length, 0),
  enums: 21,
};
