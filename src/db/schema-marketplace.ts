/* ============================================================================
 * دادپیو — Legal Marketplace & Case Management schema
 * ---------------------------------------------------------------------------
 * جداول اختصاصی مارکت‌پلیس حقوقی: پیشنهاد قیمت وکلا، روند و اقدامات پرونده،
 * پیام‌رسان موکل-وکیل، تقویم جلسات و مهلت‌ها، اقساط و تأمین اعتبار حق‌الوکاله،
 * تسویه و کمیسیون، تیم و کارآموزان، تنظیمات پلتفرم.
 * همه جداول additive هستند و با جدول‌های موجود (cases, lawyers, users) کار می‌کنند.
 * Apply: bun run db:push  یا از طریق auto-seed (CREATE TABLE IF NOT EXISTS) هنگام بوت.
 * ========================================================================== */

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";

/* ------------------------------ Enums ------------------------------ */

export const proposalStatus = pgEnum("proposal_status", [
  "pending",       // در انتظار بررسی موکل
  "negotiating",   // در مذاکره
  "accepted",      // پذیرفته‌شده → قرارداد
  "rejected",
  "withdrawn",
]);

export const eventActor = pgEnum("case_event_actor", ["lawyer", "trainee", "system", "client"]);

export const appointmentKind = pgEnum("appointment_kind", [
  "hearing",        // جلسه رسیدگی
  "consultation",   // جلسه مشاوره
  "deadline",       // مهلت قانونی
  "task",           // اقدام داخلی
]);

export const installmentStatus = pgEnum("installment_status", ["pending", "paid", "late", "cancelled"]);
export const installmentSource = pgEnum("installment_source", ["client", "provider"]);

export const creditProvider = pgEnum("credit_provider", ["azki", "partner_bank"]);
export const creditStatus = pgEnum("credit_status", [
  "draft", "submitted", "scoring", "approved", "rejected", "funded",
]);

export const payoutStatus = pgEnum("dp_payout_status", ["requested", "processing", "paid", "rejected"]);
export const ledgerType = pgEnum("dp_ledger_type", ["payment", "commission", "payout", "refund"]);
export const teamRole = pgEnum("team_role", ["trainee", "associate"]);

/* ------------------------------ Case proposals (پیشنهاد قیمت وکلا) ------------------------------ */
export const caseProposals = pgTable("case_proposals", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  lawyerId: integer("lawyer_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  note: text("note").notNull().default(""),
  durationMonths: integer("duration_months").notNull().default(0),
  status: proposalStatus("status").notNull().default("pending"),
  clientMessage: text("client_message").notNull().default(""),
  aiMatchScore: integer("ai_match_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ------------------------------ Case events (روند پرونده + اقدامات وکیل) ------------------------------ */
export const caseEvents = pgTable("case_events", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  actor: eventActor("actor").notNull().default("lawyer"),
  actorName: text("actor_name").notNull().default(""),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  progress: integer("progress"),
  visibleToClient: boolean("visible_to_client").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Messages (پیام‌رسان موکل و وکیل) ------------------------------ */
export const caseMessages = pgTable("case_messages", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  senderRole: text("sender_role").notNull().default("client"), // client | lawyer | trainee | system
  senderName: text("sender_name").notNull().default(""),
  body: text("body").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Appointments (تقویم جلسات و مهلت‌ها) ------------------------------ */
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id"),
  lawyerId: integer("lawyer_id"),
  clientPhone: text("client_phone").notNull().default(""),
  title: text("title").notNull(),
  kind: appointmentKind("kind").notNull().default("task"),
  location: text("location").notNull().default(""),
  notes: text("notes").notNull().default(""),
  startsAt: timestamp("starts_at").notNull(),
  reminderSent: boolean("reminder_sent").notNull().default(false),
  createdBy: text("created_by").notNull().default("lawyer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Installments (اقساط حق‌الوکاله) ------------------------------ */
export const installments = pgTable("installments", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  number: integer("number").notNull().default(1),
  amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: installmentStatus("status").notNull().default("pending"),
  source: installmentSource("source").notNull().default("client"),
  paidAt: timestamp("paid_at"),
  trackingCode: text("tracking_code").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Credit requests (تأمین اعتبار حق‌الوکاله) ------------------------------ */
export const creditRequests = pgTable("credit_requests", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  provider: creditProvider("provider").notNull().default("azki"),
  amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  months: integer("months").notNull().default(12),
  status: creditStatus("status").notNull().default("draft"),
  statusDetail: text("status_detail").notNull().default(""),
  referenceCode: text("reference_code").notNull().default(""),
  providerPayload: text("provider_payload").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ------------------------------ Payouts (برداشت و تسویه وکیل) ------------------------------ */
export const payoutRequests = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  lawyerId: integer("lawyer_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  status: payoutStatus("status").notNull().default("requested"),
  note: text("note").notNull().default(""),
  iban: text("iban").notNull().default(""),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Platform ledger (کمیسیون و تراکنش‌ها) ------------------------------ */
export const platformLedger = pgTable("platform_ledger", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id"),
  lawyerId: integer("lawyer_id"),
  type: ledgerType("type").notNull().default("payment"),
  amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  commission: numeric("commission", { precision: 14, scale: 0 }).notNull().default("0"),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Team members (کارآموز و همکار) ------------------------------ */
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  lawyerId: integer("lawyer_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  role: teamRole("role").notNull().default("trainee"),
  scope: text("scope").notNull().default("پرونده‌های ارجاعی"),
  status: text("status").notNull().default("active"), // active | invited | disabled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Platform settings (تنظیمات) ------------------------------ */
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/* ------------------------------ Types ------------------------------ */
export type CaseProposal = typeof caseProposals.$inferSelect;
export type CaseEvent = typeof caseEvents.$inferSelect;
export type CaseMessage = typeof caseMessages.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type Installment = typeof installments.$inferSelect;
export type CreditRequest = typeof creditRequests.$inferSelect;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type PlatformLedgerRow = typeof platformLedger.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
