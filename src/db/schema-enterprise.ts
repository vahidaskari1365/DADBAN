// ============================================================================
// دادبان — Enterprise Data Model (ERD → real Drizzle schema)
// ----------------------------------------------------------------------------
// Implements the modular-monolith architecture as a real PostgreSQL schema.
// Lives in a dedicated `core` schema namespace so it coexists with the live
// demo tables (public.*) and reuses the exact domain table names from the
// architecture spec. Apply with:  npx drizzle-kit push
//
// Domains: IDENTITY · PROFILES · LEGAL PROFESSIONALS · MARKETPLACE ·
//          CASE MANAGEMENT · DOCUMENTS · CONTRACTS · FINANCE ·
//          COMMUNICATION · CONTENT · LEGAL KNOWLEDGE · AI · SYSTEM
// ============================================================================

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  time,
  numeric,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  real,
} from "drizzle-orm/pg-core";


/* --------------------------------- Enums --------------------------------- */
export const userStatus = pgEnum("user_status", ["active", "suspended", "deleted"]);
export const verificationStatus = pgEnum("verification_status", ["pending", "verified", "rejected", "expired"]);
export const caseStatus = pgEnum("case_status_v2", [
  "draft", "submitted", "under_review", "lawyer_assigned", "in_progress",
  "waiting_for_client", "waiting_for_court", "completed", "closed", "cancelled",
]);
export const casePriority = pgEnum("case_priority", ["low", "medium", "high", "urgent"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending", "confirmed", "in_progress", "completed", "cancelled", "no_show", "refunded",
]);
export const paymentStatus = pgEnum("payment_status", [
  "pending", "processing", "success", "failed", "refunded", "partially_refunded",
]);
export const meetingType = pgEnum("meeting_type", ["chat", "voice", "video", "in_person"]);
export const documentPermission = pgEnum("document_permission", ["view", "download", "edit", "share"]);
export const caseEventType = pgEnum("case_event_type", [
  "case_created", "document_uploaded", "lawyer_assigned", "petition_submitted",
  "hearing_scheduled", "judgment_issued", "status_changed", "case_closed", "note_added",
]);
export const partyType = pgEnum("party_type", ["client", "opposing_party", "witness", "expert", "other"]);
export const messageType = pgEnum("message_type", ["text", "file", "system", "voice"]);
export const notificationChannel = pgEnum("notification_channel", ["in_app", "sms", "email", "push"]);
export const reviewStatus = pgEnum("review_status_v2", ["pending", "published", "hidden"]);
export const walletTxType = pgEnum("wallet_tx_type", ["credit", "debit", "refund", "commission", "payout"]);
export const payoutStatus = pgEnum("payout_status", ["requested", "processing", "paid", "rejected"]);
export const articleStatus = pgEnum("article_status_v2", ["draft", "published", "archived"]);
export const aiSourceType = pgEnum("ai_source_type", ["law", "article", "judgment", "knowledge_base"]);
export const subscriptionPlan = pgEnum("subscription_plan", ["free", "starter", "business", "enterprise"]);
export const auditAction = pgEnum("audit_action", ["create", "update", "delete", "view", "login", "logout", "export"]);

const now = () => timestamp("created_at").defaultNow().notNull();

/* ============================ IDENTITY ============================ */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  mobile: varchar("mobile", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  status: userStatus("status").notNull().default("active"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: now(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => ({
  mobileIdx: uniqueIndex("users_mobile_unq").on(t.mobile),
  emailIdx: uniqueIndex("users_email_unq").on(t.email),
}));

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 60 }).notNull(),
  label: varchar("label", { length: 120 }),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: now(),
}, (t) => ({ nameIdx: uniqueIndex("roles_name_unq").on(t.name) }));

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull(), // e.g. case.read
  description: text("description"),
  createdAt: now(),
}, (t) => ({ nameIdx: uniqueIndex("permissions_name_unq").on(t.name) }));

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  createdAt: now(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
  userIdx: index("user_roles_user_idx").on(t.userId),
}));

export const rolePermissions = pgTable("role_permissions", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: now(),
}, (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) }));

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  revokedAt: timestamp("revoked_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: now(),
}, (t) => ({ tokenIdx: index("refresh_tokens_hash_idx").on(t.tokenHash), userIdx: index("refresh_tokens_user_idx").on(t.userId) }));

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  mobile: varchar("mobile", { length: 20 }).notNull(),
  codeHash: text("code_hash").notNull(),
  consumed: boolean("consumed").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: now(),
}, (t) => ({ mobileIdx: index("otp_mobile_idx").on(t.mobile) }));

/* ============================ PROFILES ============================ */
export const clientProfiles = pgTable("client_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nationalId: varchar("national_id", { length: 20 }),
  city: varchar("city", { length: 100 }),
  verificationStatus: verificationStatus("verification_status").notNull().default("pending"),
  createdAt: now(),
}, (t) => ({ userIdx: uniqueIndex("client_profiles_user_unq").on(t.userId) }));

export const lawyerProfiles = pgTable("lawyer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  professionalTitle: varchar("professional_title", { length: 200 }),
  bio: text("bio"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 100 }),
  licenseNumber: varchar("license_number", { length: 60 }),
  yearsOfExperience: integer("years_of_experience").notNull().default(0),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  responseRate: integer("response_rate").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(true),
  verificationStatus: verificationStatus("verification_status").notNull().default("pending"),
  responseTime: varchar("response_time", { length: 60 }),
  createdAt: now(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: uniqueIndex("lawyer_profiles_user_unq").on(t.userId),
  cityIdx: index("lawyer_profiles_city_idx").on(t.city),
  verifyIdx: index("lawyer_profiles_verify_idx").on(t.verificationStatus),
}));

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  nationalId: varchar("national_id", { length: 20 }),
  plan: subscriptionPlan("plan").notNull().default("free"),
  createdAt: now(),
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 60 }).notNull().default("member"),
  createdAt: now(),
}, (t) => ({
  orgUserIdx: uniqueIndex("org_members_org_user_unq").on(t.organizationId, t.userId),
}));

/* ====================== LEGAL PROFESSIONALS ====================== */
export const specialties = pgTable("specialties", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  parentId: uuid("parent_id"),
  createdAt: now(),
}, (t) => ({ slugIdx: uniqueIndex("specialties_slug_unq").on(t.slug) }));

export const lawyerSpecialties = pgTable("lawyer_specialties", {
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  specialtyId: uuid("specialty_id").notNull().references(() => specialties.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").notNull().default(false),
}, (t) => ({ pk: primaryKey({ columns: [t.lawyerId, t.specialtyId] }) }));

export const lawyerVerifications = pgTable("lawyer_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  verificationType: varchar("verification_type", { length: 60 }).notNull(),
  documentId: uuid("document_id"),
  status: verificationStatus("status").notNull().default("pending"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: now(),
});

export const lawyerAvailabilityRules = pgTable("lawyer_availability_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(), // 0..6
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  timezone: varchar("timezone", { length: 60 }).notNull().default("Asia/Tehran"),
});

export const lawyerAvailabilityExceptions = pgTable("lawyer_availability_exceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  isAvailable: boolean("is_available").notNull(),
  note: text("note"),
});

/* ============================ MARKETPLACE ============================ */
export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  icon: varchar("icon", { length: 40 }),
  createdAt: now(),
}, (t) => ({ slugIdx: uniqueIndex("service_categories_slug_unq").on(t.slug) }));

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => serviceCategories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: now(),
}, (t) => ({ slugIdx: uniqueIndex("services_slug_unq").on(t.slug) }));

export const lawyerServices = pgTable("lawyer_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 14, scale: 0 }).notNull().default("0"),
  durationMinutes: integer("duration_minutes"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => ({
  lawyerServiceIdx: uniqueIndex("lawyer_services_unq").on(t.lawyerId, t.serviceId),
}));

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
  meetingType: meetingType("meeting_type").notNull().default("chat"),
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end"),
  status: bookingStatus("status").notNull().default("pending"),
  price: numeric("price", { precision: 14, scale: 0 }).notNull().default("0"),
  paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
  meetingLink: text("meeting_link"),
  createdAt: now(),
}, (t) => ({
  lawyerStartIdx: index("bookings_lawyer_start_idx").on(t.lawyerId, t.scheduledStart),
  clientStartIdx: index("bookings_client_start_idx").on(t.clientId, t.scheduledStart),
}));

export const consultationSessions = pgTable("consultation_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"),
  summary: text("summary"),
  rating: integer("rating"),
  createdAt: now(),
});

export const serviceReviews = pgTable("service_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  status: reviewStatus("status").notNull().default("published"),
  createdAt: now(),
}, (t) => ({ lawyerIdx: index("reviews_lawyer_idx").on(t.lawyerId), bookingIdx: uniqueIndex("reviews_booking_unq").on(t.bookingId) }));

/* ========================= CASE MANAGEMENT ========================= */
export const caseTypes = pgTable("case_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
}, (t) => ({ slugIdx: uniqueIndex("case_types_slug_unq").on(t.slug) }));

export const legalCases = pgTable("legal_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseNumber: varchar("case_number", { length: 40 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  caseTypeId: uuid("case_type_id").references(() => caseTypes.id, { onDelete: "set null" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  status: caseStatus("status").notNull().default("draft"),
  priority: casePriority("priority").notNull().default("medium"),
  openedAt: timestamp("opened_at"),
  closedAt: timestamp("closed_at"),
  createdAt: now(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  numberIdx: uniqueIndex("cases_number_unq").on(t.caseNumber),
  statusIdx: index("cases_status_idx").on(t.status),
  orgIdx: index("cases_org_idx").on(t.organizationId),
}));

export const caseParties = pgTable("case_parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => legalCases.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  partyType: partyType("party_type").notNull(),
  name: varchar("name", { length: 200 }),
  role: varchar("role", { length: 120 }),
  createdAt: now(),
}, (t) => ({ caseIdx: index("case_parties_case_idx").on(t.caseId) }));

export const caseLawyers = pgTable("case_lawyers", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => legalCases.id, { onDelete: "cascade" }),
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 60 }).notNull().default("lead"), // lead, second, intern, manager
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  removedAt: timestamp("removed_at"),
}, (t) => ({ caseLawyerIdx: index("case_lawyers_idx").on(t.caseId, t.lawyerId) }));

export const caseEvents = pgTable("case_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => legalCases.id, { onDelete: "cascade" }),
  eventType: caseEventType("event_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  createdBy: uuid("created_by").references(() => users.id),
  visibility: varchar("visibility", { length: 20 }).notNull().default("case_members"),
  metadata: jsonb("metadata"),
  createdAt: now(),
}, (t) => ({ caseDateIdx: index("case_events_case_date_idx").on(t.caseId, t.eventDate) }));

export const caseDeadlines = pgTable("case_deadlines", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => legalCases.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueAt: timestamp("due_at").notNull(),
  priority: casePriority("priority").notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  completedAt: timestamp("completed_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: now(),
}, (t) => ({ caseDueIdx: index("case_deadlines_due_idx").on(t.caseId, t.dueAt) }));

export const caseHearings = pgTable("case_hearings", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => legalCases.id, { onDelete: "cascade" }),
  courtName: varchar("court_name", { length: 200 }),
  branch: varchar("branch", { length: 120 }),
  hearingType: varchar("hearing_type", { length: 80 }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"),
  createdAt: now(),
}, (t) => ({ caseScheduledIdx: index("case_hearings_scheduled_idx").on(t.caseId, t.scheduledAt) }));

export const caseStatusHistory = pgTable("case_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").notNull().references(() => legalCases.id, { onDelete: "cascade" }),
  fromStatus: caseStatus("from_status"),
  toStatus: caseStatus("to_status").notNull(),
  note: text("note"),
  changedBy: uuid("changed_by").references(() => users.id),
  createdAt: now(),
}, (t) => ({ caseIdx: index("case_status_history_case_idx").on(t.caseId) }));

/* ============================ DOCUMENTS ============================ */
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size").notNull().default(0),
  storageKey: text("storage_key").notNull(),
  checksum: varchar("checksum", { length: 128 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: now(),
}, (t) => ({
  ownerIdx: index("documents_owner_idx").on(t.ownerId),
  createdIdx: index("documents_created_idx").on(t.createdAt),
}));

export const documentVersions = pgTable("document_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  storageKey: text("storage_key").notNull(),
  checksum: varchar("checksum", { length: 128 }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: now(),
}, (t) => ({ docVersionIdx: index("doc_versions_doc_idx").on(t.documentId, t.versionNumber) }));

export const documentPermissions = pgTable("document_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permission: documentPermission("permission").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: now(),
}, (t) => ({ docUserIdx: index("doc_perms_doc_user_idx").on(t.documentId, t.userId) }));

export const documentLinks = pgTable("document_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type", { length: 40 }).notNull(), // case, contract, booking
  entityId: uuid("entity_id").notNull(),
  createdAt: now(),
}, (t) => ({ entityIdx: index("doc_links_entity_idx").on(t.entityType, t.entityId) }));

/* ============================ CONTRACTS ============================ */
export const contractTemplates = pgTable("contract_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull(),
  category: varchar("category", { length: 80 }),
  bodyTemplate: text("body_template"),
  fieldsSchema: jsonb("fields_schema"),
  createdAt: now(),
}, (t) => ({ slugIdx: uniqueIndex("contract_templates_slug_unq").on(t.slug) }));

export const legalContracts = pgTable("legal_contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => contractTemplates.id, { onDelete: "set null" }),
  caseId: uuid("case_id").references(() => legalCases.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: now(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contractVersions = pgTable("contract_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => legalContracts.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  content: text("content").notNull(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: "set null" }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: now(),
}, (t) => ({ contractVersionIdx: index("contract_versions_idx").on(t.contractId, t.versionNumber) }));

export const contractParties = pgTable("contract_parties", {
  id: uuid("id").primaryKey().defaultRandom(),
  contractId: uuid("contract_id").notNull().references(() => legalContracts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }),
  role: varchar("role", { length: 120 }),
  signedAt: timestamp("signed_at"),
});

/* ============================ FINANCE ============================ */
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  number: varchar("number", { length: 40 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
  status: paymentStatus("status").notNull().default("pending"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  dueAt: timestamp("due_at"),
  createdAt: now(),
}, (t) => ({ numberIdx: uniqueIndex("invoices_number_unq").on(t.number) }));

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
  gateway: varchar("gateway", { length: 60 }),
  gatewayTransactionId: varchar("gateway_txn_id", { length: 120 }),
  status: paymentStatus("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  createdAt: now(),
}, (t) => ({ userStatusIdx: index("payments_user_status_idx").on(t.userId, t.status) }));

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  balance: numeric("balance", { precision: 16, scale: 0 }).notNull().default("0"),
  currency: varchar("currency", { length: 10 }).notNull().default("IRR"),
  createdAt: now(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({ userIdx: uniqueIndex("wallets_user_unq").on(t.userId) }));

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  type: walletTxType("type").notNull(),
  amount: numeric("amount", { precision: 16, scale: 0 }).notNull(),
  referenceType: varchar("reference_type", { length: 40 }),
  referenceId: uuid("reference_id"),
  balanceAfter: numeric("balance_after", { precision: 16, scale: 0 }).notNull(),
  description: text("description"),
  createdAt: now(),
}, (t) => ({ walletIdx: index("wallet_tx_wallet_idx").on(t.walletId) }));

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  lawyerId: uuid("lawyer_id").notNull().references(() => lawyerProfiles.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  commission: numeric("commission", { precision: 14, scale: 0 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 14, scale: 0 }).notNull(),
  status: payoutStatus("status").notNull().default("requested"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  createdAt: now(),
});

/* ========================= COMMUNICATION ========================= */
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id").references(() => legalCases.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull().default("direct"),
  createdAt: now(),
}, (t) => ({ caseIdx: index("conversations_case_idx").on(t.caseId) }));

export const conversationMembers = pgTable("conversation_members", {
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.conversationId, t.userId] }) }));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body"),
  messageType: messageType("message_type").notNull().default("text"),
  readAt: timestamp("read_at"),
  createdAt: now(),
}, (t) => ({ convIdx: index("messages_conv_idx").on(t.conversationId) }));

export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  createdAt: now(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 60 }).notNull(),
  channel: notificationChannel("channel").notNull().default("in_app"),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  data: jsonb("data"),
  readAt: timestamp("read_at"),
  sentAt: timestamp("sent_at"),
  createdAt: now(),
}, (t) => ({ userReadIdx: index("notifications_user_read_idx").on(t.userId, t.readAt) }));

/* ============================ CONTENT ============================ */
export const articleCategories = pgTable("article_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
}, (t) => ({ slugIdx: uniqueIndex("article_categories_slug_unq").on(t.slug) }));

export const articleAuthors = pgTable("article_authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  role: varchar("role", { length: 120 }),
  bio: text("bio"),
});

export const articleTags = pgTable("article_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 80 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
}, (t) => ({ slugIdx: uniqueIndex("article_tags_slug_unq").on(t.slug) }));

export const cmsArticles = pgTable("cms_articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => articleCategories.id, { onDelete: "set null" }),
  authorId: uuid("author_id").references(() => articleAuthors.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  excerpt: text("excerpt"),
  content: text("content"),
  status: articleStatus("status").notNull().default("draft"),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  canonicalUrl: text("canonical_url"),
  views: integer("views").notNull().default(0),
  publishedAt: timestamp("published_at"),
  createdAt: now(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({ slugIdx: uniqueIndex("cms_articles_slug_unq").on(t.slug) }));

export const articleTagLinks = pgTable("article_tag_links", {
  articleId: uuid("article_id").notNull().references(() => cmsArticles.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => articleTags.id, { onDelete: "cascade" }),
}, (t) => ({ pk: primaryKey({ columns: [t.articleId, t.tagId] }) }));

/* ======================= LEGAL KNOWLEDGE ======================= */
export const legalTerms = pgTable("legal_terms", {
  id: uuid("id").primaryKey().defaultRandom(),
  term: varchar("term", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  simpleDefinition: text("simple_definition"),
  proDefinition: text("pro_definition"),
  example: text("example"),
  createdAt: now(),
}, (t) => ({ slugIdx: uniqueIndex("legal_terms_slug_unq").on(t.slug) }));

export const laws = pgTable("laws", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  year: varchar("year", { length: 20 }),
  authority: varchar("authority", { length: 200 }),
  status: varchar("status", { length: 30 }).notNull().default("valid"),
  summary: text("summary"),
  createdAt: now(),
}, (t) => ({ slugIdx: uniqueIndex("laws_slug_unq").on(t.slug) }));

export const lawArticles = pgTable("law_articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  lawId: uuid("law_id").notNull().references(() => laws.id, { onDelete: "cascade" }),
  number: varchar("number", { length: 40 }).notNull(),
  body: text("body").notNull(),
}, (t) => ({ lawIdx: index("law_articles_law_idx").on(t.lawId) }));

export const lawReferences = pgTable("law_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  lawId: uuid("law_id").notNull().references(() => laws.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  url: text("url"),
});

export const judgments = pgTable("judgments", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  court: varchar("court", { length: 200 }),
  judgmentDate: varchar("judgment_date", { length: 20 }),
  subject: varchar("subject", { length: 120 }),
  summary: text("summary"),
  createdAt: now(),
}, (t) => ({ slugIdx: uniqueIndex("judgments_slug_unq").on(t.slug) }));

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  categoryId: uuid("category_id"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  helpful: integer("helpful").notNull().default(0),
  views: integer("views").notNull().default(0),
  createdAt: now(),
}, (t) => ({ statusIdx: index("questions_status_idx").on(t.status) }));

export const answers = pgTable("answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  helpful: integer("helpful").notNull().default(0),
  createdAt: now(),
}, (t) => ({ questionIdx: index("answers_question_idx").on(t.questionId) }));

export const questionTags = pgTable("question_tags", {
  questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => articleTags.id, { onDelete: "cascade" }),
}, (t) => ({ pk: primaryKey({ columns: [t.questionId, t.tagId] }) }));

/* ============================== AI ============================== */
export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  caseId: uuid("case_id").references(() => legalCases.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }),
  createdAt: now(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used"),
  createdAt: now(),
}, (t) => ({ convIdx: index("ai_messages_conv_idx").on(t.conversationId) }));

export const aiMessageSources = pgTable("ai_message_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  aiMessageId: uuid("ai_message_id").notNull().references(() => aiMessages.id, { onDelete: "cascade" }),
  sourceType: aiSourceType("source_type").notNull(),
  sourceId: uuid("source_id"),
  title: varchar("title", { length: 255 }),
  citation: text("citation"),
}, (t) => ({ messageIdx: index("ai_sources_message_idx").on(t.aiMessageId) }));

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: aiSourceType("source_type").notNull(),
  sourceId: uuid("source_id"),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  createdAt: now(),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  knowledgeDocumentId: uuid("knowledge_document_id").notNull().references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  // pgvector embedding stored as raw jsonb until pgvector extension is enabled
  embedding: jsonb("embedding"),
}, (t) => ({ docIdx: index("knowledge_chunks_doc_idx").on(t.knowledgeDocumentId) }));

/* ============================= SYSTEM ============================= */
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: auditAction("action").notNull(),
  entityType: varchar("entity_type", { length: 60 }).notNull(),
  entityId: uuid("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: varchar("ip_address", { length: 60 }),
  userAgent: text("user_agent"),
  createdAt: now(),
}, (t) => ({ entityIdx: index("audit_logs_entity_idx").on(t.entityType, t.entityId), actorIdx: index("audit_logs_actor_idx").on(t.actorId) }));

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: varchar("ticket_number", { length: 40 }).notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 255 }).notNull(),
  category: varchar("category", { length: 80 }),
  priority: casePriority("priority").notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  message: text("message"),
  createdAt: now(),
}, (t) => ({ numberIdx: uniqueIndex("support_tickets_number_unq").on(t.ticketNumber), userStatusIdx: index("support_tickets_user_idx").on(t.userId, t.status) }));

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 60 }).notNull(), // revenue, cases, lawyers, conversion
  period: varchar("period", { length: 30 }),
  data: jsonb("data"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  createdAt: now(),
});

