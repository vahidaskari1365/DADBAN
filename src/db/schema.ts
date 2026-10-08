import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  timestamp,
  pgEnum,
  numeric,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const caseStatus = pgEnum("case_status", [
  "new",
  "reviewing",
  "matched",
  "active",
  "closed",
]);

export const consultationType = pgEnum("consultation_type", [
  "chat",
  "voice",
  "video",
]);

// State machine: pending → payment_pending → paid → confirmed → scheduled →
// in_progress → completed, with cancelled / expired / refunded as terminal
// fallback states. Older rows may still carry the shorthands (confirmed,
// completed, cancelled) — all remain valid.
export const consultationStatus = pgEnum("consultation_status", [
  "pending",
  "payment_pending",
  "paid",
  "confirmed",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
  "refunded",
]);

/* ============================================================================
 * Managed Services ("خدمات پیگیری و انجام امور") — domain enums
 * ========================================================================== */

export const svcClassification = pgEnum("svc_classification", [
  "ADMINISTRATIVE",
  "INFORMATIONAL",
  "DOCUMENT_SERVICE",
  "PROFESSIONAL_LEGAL",
  "REPRESENTATION",
  "REQUIRES_REVIEW",
]);

export const svcCategory = pgEnum("svc_category", [
  "CASE_FOLLOW_UP",
  "JUDICIAL_OPERATIONS",
  "ENFORCEMENT",
  "REGISTRATION",
  "TAX",
  "ADMINISTRATIVE",
  "DOCUMENTS",
  "ORGANIZATIONS",
  "OTHER",
]);

export const svcPriceType = pgEnum("svc_price_type", [
  "FIXED",
  "FROM",
  "QUOTE",
  "REQUIRES_REVIEW",
]);

export const svcRequestStatus = pgEnum("svc_request_status", [
  "DRAFT",
  "SUBMITTED",
  "REVIEWING",
  "AWAITING_DOCUMENTS",
  "QUOTED",
  "AWAITING_PAYMENT",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_EXTERNAL",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
]);

export const svcUrgency = pgEnum("svc_urgency", ["LOW", "NORMAL", "HIGH", "URGENT"]);

export const svcContactPreference = pgEnum("svc_contact_preference", [
  "PHONE",
  "SMS",
  "WHATSAPP",
  "EMAIL",
  "PORTAL",
]);

export const svcContractStatus = pgEnum("svc_contract_status", [
  "NOT_REQUIRED",
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "SIGNED",
]);

export const svcQuoteStatus = pgEnum("svc_quote_status", [
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
]);

export const svcEventType = pgEnum("svc_event_type", [
  "created",
  "review_started",
  "documents_received",
  "assigned",
  "progress",
  "waiting_external",
  "result_received",
  "completed",
  "status_changed",
  "note",
  "payment_required",
  "quote_ready",
  "contract_required",
  "cancelled",
  "rejected",
  "other",
]);

/* ============================ Service Categories ============================ */
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("folder"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ============================ Managed Services ============================ */
export const managedServices = pgTable("managed_services", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  classification: svcClassification("classification").notNull().default("ADMINISTRATIVE"),
  category: svcCategory("category").notNull().default("OTHER"),
  icon: text("icon").notNull().default("folder"),
  estimatedTime: text("estimated_time").notNull().default(""),
  priceType: svcPriceType("price_type").notNull().default("QUOTE"),
  basePrice: integer("base_price").notNull().default(0),
  requiresCaseInfo: boolean("requires_case_info").notNull().default(false),
  requiresDocuments: boolean("requires_documents").notNull().default(false),
  requiresLawyer: boolean("requires_lawyer").notNull().default(false),
  requiresSupervision: boolean("requires_supervision").notNull().default(false),
  active: boolean("active").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  /** Override intake form fields (JSON array of field descriptors). Null = derived from flags. */
  formFields: jsonb("form_fields").$type<ServiceField[] | null>().default(null),
  /** Required document labels (JSON array of strings). */
  requiredDocs: jsonb("required_docs").$type<string[] | null>().default(null),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  categoryIdx: index("managed_services_category_idx").on(t.category),
  activeFeaturedIdx: index("managed_services_active_featured_idx").on(t.active, t.featured),
}));

export type ServiceField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "tel" | "number" | "date" | "toggle";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
};

/* ============================ Service Requests ============================ */
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  requestNumber: text("request_number").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  serviceId: integer("service_id")
    .notNull()
    .references(() => managedServices.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  /** Answers from the dynamic intake form (JSON). */
  answers: jsonb("answers").$type<Record<string, string> | null>().default(null),
  urgency: svcUrgency("urgency").notNull().default("NORMAL"),
  city: text("city"),
  organization: text("organization"),
  referenceNumber: text("reference_number"),
  caseNumber: text("case_number"),
  requestedDeadline: text("requested_deadline"),
  contactPreference: svcContactPreference("contact_preference").notNull().default("PORTAL"),
  status: svcRequestStatus("status").notNull().default("DRAFT"),
  assignedStaffId: integer("assigned_staff_id").references(() => users.id, { onDelete: "set null" }),
  supervisingLawyerId: integer("supervising_lawyer_id").references(() => users.id, { onDelete: "set null" }),
  price: integer("price"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  contractStatus: svcContractStatus("contract_status").notNull().default("NOT_REQUIRED"),
  finalReport: text("final_report"),
  resultFileLabel: text("result_file_label"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  userIdx: index("service_requests_user_idx").on(t.userId),
  statusIdx: index("service_requests_status_idx").on(t.status),
  staffIdx: index("service_requests_staff_idx").on(t.assignedStaffId),
  supervisorIdx: index("service_requests_supervisor_idx").on(t.supervisingLawyerId),
}));

/* ============================ Request Timeline ============================ */
export const serviceRequestEvents = pgTable("service_request_events", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => serviceRequests.id, { onDelete: "cascade" }),
  type: svcEventType("type").notNull().default("note"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  visibleToUser: boolean("visible_to_user").notNull().default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  requestIdx: index("service_request_events_request_idx").on(t.requestId, t.createdAt),
}));

/* ============================ Request Documents ============================ */
export const serviceRequestDocs = pgTable("service_request_docs", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => serviceRequests.id, { onDelete: "cascade" }),
  uploadedBy: integer("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploaderRole: text("uploader_role").notNull().default("client"),
  name: text("name").notNull(),
  docType: text("doc_type").notNull().default("سند"),
  size: integer("size").notNull().default(0),
  /** Placeholder storage key; real blob storage is wired in when available. */
  storageKey: text("storage_key").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  requestIdx: index("service_request_docs_request_idx").on(t.requestId),
}));

/* ============================ Quotes ============================ */
export const serviceQuotes = pgTable("service_quotes", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => serviceRequests.id, { onDelete: "cascade" }),
  subtotal: integer("subtotal").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull().default(0),
  currency: text("currency").notNull().default("IRR"),
  expiresAt: timestamp("expires_at"),
  status: svcQuoteStatus("status").notNull().default("DRAFT"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  requestIdx: index("service_quotes_request_idx").on(t.requestId),
}));

/* ============================ Notifications ============================ */
export const serviceNotifications = pgTable("service_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  requestId: integer("request_id").references(() => serviceRequests.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userReadIdx: index("service_notifications_user_idx").on(t.userId, t.read),
}));

/* ============================ Audit Log ============================ */
export const serviceAuditLogs = pgTable("service_audit_logs", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => serviceRequests.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  actorRole: text("actor_role"),
  actorId: integer("actor_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  requestIdx: index("service_audit_logs_request_idx").on(t.requestId),
}));

/* ------------------------------ Lawyers ------------------------------ */
export const lawyers = pgTable("lawyers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  avatarColor: text("avatar_color").notNull().default("#15365d"),
  photoUrl: text("photo_url"),
  title: text("title").notNull().default("وکیل پایه یک دادگستری"),
  /** نوع وکیل: «wakil» وکیل رسمی، «karamooz» کارآموز وکالت (ثبت‌نام مستقیم) */
  lawyerType: text("lawyer_type").notNull().default("wakil"),
  licenseNo: text("license_no").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  gender: text("gender").notNull().default("male"),
  experienceYears: integer("experience_years").notNull().default(0),
  specialties: text("specialties").array().notNull().default([]),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  caseCount: integer("case_count").notNull().default(0),
  priceChat: integer("price_chat").notNull().default(0),
  priceVoice: integer("price_voice").notNull().default(0),
  priceVideo: integer("price_video").notNull().default(0),
  verified: boolean("verified").notNull().default(true),
  topRated: boolean("top_rated").notNull().default(false),
  fastResponder: boolean("fast_responder").notNull().default(false),
  contractExpert: boolean("contract_expert").notNull().default(false),
  responseTime: text("response_time").notNull().default("کمتر از یک ساعت"),
  bio: text("bio").notNull().default(""),
  about: text("about").notNull().default(""),
  services: text("services").array().notNull().default([]),
  views: integer("views").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Reviews ------------------------------ */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  lawyerId: integer("lawyer_id")
    .notNull()
    .references(() => lawyers.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  service: text("service"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Contracts ------------------------------ */
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull().default("file"),
  description: text("description").notNull(),
  useCase: text("use_case").notNull(),
  risks: text("risks").array().notNull().default([]),
  keyClauses: text("key_clauses").array().notNull().default([]),
  samplePrice: integer("sample_price").notNull().default(0),
  customPrice: integer("custom_price").notNull().default(0),
  popular: boolean("popular").notNull().default(false),
  steps: text("steps").array().notNull().default([]),
});

/* ------------------------------ Articles (Knowledge) ------------------------------ */
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  quickAnswer: text("quick_answer").default(""),
  faq: text("faq").default("[]"),
  imageUrl: text("image_url"),
  imageAlt: text("image_alt"),
  readTime: integer("read_time").notNull().default(5),
  author: text("author").notNull().default("تیم تحریریه دادبان"),
  authorRole: text("author_role").notNull().default("پژوهشگر حقوق"),
  views: integer("views").notNull().default(0),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
});

/* ------------------------------ Q&A ------------------------------ */
export const qaQuestions = pgTable("qa_questions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  question: text("question").notNull(),
  body: text("body").notNull().default(""),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
  lawyerName: text("lawyer_name").notNull(),
  lawyerTitle: text("lawyer_title").notNull().default("وکیل پایه یک"),
  verified: boolean("verified").notNull().default(true),
  helpful: integer("helpful").notNull().default(0),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Cases ------------------------------ */
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number").notNull().unique(),
  trackingToken: text("tracking_token").notNull().unique(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  city: text("city").notNull(),
  stage: text("stage").notNull().default("ثبت اولیه"),
  budget: text("budget"),
  /** درگاه پرداخت انتخابی موکل در صفحه /case/pay */
  paymentGateway: text("payment_gateway"),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  status: caseStatus("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Consultations ------------------------------ */
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  lawyerName: text("lawyer_name"),
  lawyerId: integer("lawyer_id"),
  type: consultationType("type").notNull().default("chat"),
  duration: integer("duration").notNull().default(30),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  subject: text("subject").notNull(),
  scheduledAt: text("scheduled_at"),
  /** زمان نوبت رزروشده (UTC instant) — مبنای واقعی تداخل‌یابی */
  startsAt: timestamp("starts_at"),
  /** ارجاع رکورد پرداخت مرتبط (در صورت وجود) */
  paymentRef: text("payment_ref"),
  price: numeric("price", { precision: 12, scale: 0 }).notNull().default("0"),
  status: consultationStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ------------------------------ Support tickets ------------------------------ */
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  category: text("category").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Lawyer = typeof lawyers.$inferSelect;
export type Contract = typeof contracts.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type QaQuestion = typeof qaQuestions.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type Consultation = typeof consultations.$inferSelect;
export type Review = typeof reviews.$inferSelect;

/* ------------------------------ Managed Services types ------------------------------ */
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type ManagedService = typeof managedServices.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type ServiceRequestEvent = typeof serviceRequestEvents.$inferSelect;
export type ServiceRequestDoc = typeof serviceRequestDocs.$inferSelect;
export type ServiceQuote = typeof serviceQuotes.$inferSelect;
export type ServiceNotification = typeof serviceNotifications.$inferSelect;
export type ServiceAuditLog = typeof serviceAuditLogs.$inferSelect;

/* ------------------------------ Page views (tracking) ------------------------------ */
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: text("path").notNull().unique(),
  views: integer("views").notNull().default(0),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
});
export type PageView = typeof pageViews.$inferSelect;

/* ------------------------------ Users (auth) ------------------------------ */
export const users = pgTable("app_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("client"),
  /** استان/شهر انتخابی موکل — شخصی‌سازی پیشنهاد وکیل و دستیار هوشمند */
  province: text("province"),
  city: text("city"),
  /** رنگ آواتار (بدون آپلود تصویر؛ از پالت برند) */
  avatarColor: text("avatar_color").notNull().default("#15365d"),
  /** اتصال حساب به پروفایل عمومی وکیل (فقط برای role=lawyer) */
  lawyerId: integer("lawyer_id").references(() => lawyers.id, { onDelete: "set null" }),
  /** اعضای تیم وکیل: role="team" — وکیلِ مادر و دسترسی‌های عضو */
  parentLawyerId: integer("parent_lawyer_id").references(() => lawyers.id, { onDelete: "cascade" }),
  /** دسترسی‌های عضو تیم — CSV از: offers,consultations,reminders,services,cases */
  teamPermissions: text("team_permissions").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;

/* ------------------------------ Favorite lawyers (وکلای نشان‌شده) ------------------------------ */
export const favoriteLawyers = pgTable(
  "favorite_lawyers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lawyerId: integer("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("favorite_lawyers_uniq").on(t.userId, t.lawyerId)],
);
export type FavoriteLawyer = typeof favoriteLawyers.$inferSelect;

/* ------------------------------ Lawyer availability rules ------------------------------ */
// Weekly bookable windows per lawyer (Asia/Tehran). Real slots are derived by
// subtracting existing consultations — see src/lib/availability.ts.
export const lawyerAvailability = pgTable(
  "lawyer_availability",
  {
    id: serial("id").primaryKey(),
    lawyerId: integer("lawyer_id")
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    /** 0=شنبه … 6=جمعه */
    weekday: integer("weekday").notNull(),
    /** دقیقه از شروع روز به وقت تهران */
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
  },
  (t) => [uniqueIndex("lawyer_availability_rule_uniq").on(t.lawyerId, t.weekday, t.startMin)],
);
export type LawyerAvailability = typeof lawyerAvailability.$inferSelect;

/* ------------------------------ Payments (immutable financial facts) ------------------------------ */
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  /** Idempotency key — unique; retries never create a second charge. */
  reference: text("reference").notNull().unique(),
  orderType: text("order_type").notNull().default("consultation"),
  consultationId: integer("consultation_id")
    .references(() => consultations.id, { onDelete: "set null" }),
  /** مبلغ به تومان — عدد صحیح، بدون اعشار */
  amount: integer("amount").notNull(),
  provider: text("provider").notNull().default("manual"),
  /** initiated | pending | verified | failed | refunded | manual_review */
  status: text("status").notNull().default("initiated"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});
export type Payment = typeof payments.$inferSelect;

/* ------------------------------ Q&A submissions (persisted, honestly acknowledged) ------------------------------ */
export const qaSubmissions = pgTable("qa_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  question: text("question").notNull(),
  status: text("status").notNull().default("pending_review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type QaSubmission = typeof qaSubmissions.$inferSelect;

/* ------------------------------ Analytics events ------------------------------ */
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  event: text("event").notNull(),
  path: text("path").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AnalyticsEventRow = typeof events.$inferSelect;

/* ------------------------------ Documents (client uploads) ------------------------------ */
export const documents = pgTable("app_documents", {
  id: serial("id").primaryKey(),
  userPhone: text("user_phone").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("مدرک"),
  size: integer("size").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Document = typeof documents.$inferSelect;

/* ------------------------------ Consultation signaling (text/voice/video) ------------------------------ */

/**
 * پیام‌های سیگنالینگ مشاوره زنده (offer/answer/ICE) و چت متنی.
 * معماری بدون WebSocket — از طریق HTTP polling روی همان دامنه کار می‌کند
 * (سازگار با Vercel serverless و بدون نیاز به سرویس جانبی).
 * سیگنال‌های موقت پس از ۱۰ دقیقه و چت‌ها پس از ۲۴ ساعت پاک می‌شوند.
 */
export const consultationSignals = pgTable("consultation_signals", {
  id: serial("id").primaryKey(),
  room: text("room").notNull(),
  clientId: text("client_id").notNull(),
  sender: text("sender").notNull(),
  kind: text("kind").notNull(), // join | offer | answer | ice | chat | typing | leave
  payload: text("payload").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ConsultationSignal = typeof consultationSignals.$inferSelect;

/* ------------------------------ Consult chat (گفتگوی موکل با وکیل) ------------------------------ */

/**
 * پیام‌های ماندگار گفتگوی متنی موکل و وکیل.
 * هر گفتگو یک roomId دارد (consult-<slug>-<rand>) و پیام‌ها حتی وقتی وکیل آفلاین است
 * ذخیره می‌شوند تا پس از ورود وکیل به پنل، تاریخچه و پیام‌های خوانده‌نشده را ببیند.
 */
export const consultMessages = pgTable("consult_messages", {
  id: serial("id").primaryKey(),
  roomId: text("room_id").notNull(),
  lawyerSlug: text("lawyer_slug").notNull(),
  sender: text("sender").notNull(), // client | lawyer
  name: text("name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  roomIdx: index("consult_messages_room_idx").on(t.roomId, t.id),
  lawyerIdx: index("consult_messages_lawyer_idx").on(t.lawyerSlug, t.createdAt),
}));
export type ConsultMessage = typeof consultMessages.$inferSelect;

/* ------------------------------ Lawyer presence (وضعیت آنلاین وکلا) ------------------------------ */

/**
 * حضور واقعی وکیل — با باز کردن پنل وکیل (/consultation/live) هر ۳۰ ثانیه یک heartbeat
 * ثبت می‌شود؛ وکیل وقتی «آنلاین» است که state=online و آخرین ping کمتر از ۷۵ ثانیه قبل باشد.
 * یک ردیف به‌ازای هر وکیل (upsert) — سبک و ارزان برای serverless.
 */
export const lawyerPresence = pgTable("lawyer_presence", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull().default(""),
  state: text("state").notNull().default("offline"), // online | offline
  lastPingAt: timestamp("last_ping_at").defaultNow().notNull(),
});
export type LawyerPresence = typeof lawyerPresence.$inferSelect;

/* ---------------- Case offers (پیشنهاد وکلای استان روی پرونده‌های ثبت‌شده) ---------------- */

/**
 * هر پروندهٔ ثبت‌شده در /case/new به وکلای همان استان اطلاع‌رسانی می‌شود؛
 * هر وکیل یک «نظر + قیمت اعلامی» ثبت می‌کند و موکل یکی را انتخاب می‌کند.
 * بعد از انتخاب، گفتگوی رایگان موکل↔وکیل در همین رشته (replies) ادامه می‌یابد.
 */
export const caseOffers = pgTable("case_offers", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  lawyerId: integer("lawyer_id")
    .notNull()
    .references(() => lawyers.id, { onDelete: "cascade" }),
  /** نظر وکیل دربارهٔ پرونده و چگونگی پیگیری آن */
  message: text("message").notNull(),
  /** قیمت اعلامی (تومان — عدد صحیح) */
  price: integer("price").notNull().default(0),
  /** sent | accepted | declined */
  status: text("status").notNull().default("sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("case_offers_case_lawyer_uniq").on(t.caseId, t.lawyerId)]);
export type CaseOffer = typeof caseOffers.$inferSelect;

/** گفتگوی رایگان موکل↔وکیل روی هر پیشنهاد (بعد از انتخاب موکل، موکل هم پاسخ می‌دهد) */
export const caseOfferReplies = pgTable("case_offer_replies", {
  id: serial("id").primaryKey(),
  offerId: integer("offer_id")
    .notNull()
    .references(() => caseOffers.id, { onDelete: "cascade" }),
  /** client | lawyer */
  sender: text("sender").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("case_offer_replies_offer_idx").on(t.offerId, t.id)]);
export type CaseOfferReply = typeof caseOfferReplies.$inferSelect;

/* ---------------- Lawyer referrals (همکاری و ارجاع پروندهٔ وکیل↔وکیل) ---------------- */

/**
 * جریان همکاری همکار-به-همکار: وکیل از دایرکتوری همکاران، پروفایل همکار را باز
 * می‌کند و از آنجا «درخواست همکاری / ارجاع پرونده» ثبت می‌کند؛ درخواست در
 * کارتابل «همکاری و ارجاع» پنل همکار می‌نشیند و او پذیرش/رد می‌کند.
 * kind: referral (ارجاع کامل پرونده) | consult (مشورت تخصصی) | joint (همکاری مشترک)
 * status: pending (در انتظار پاسخ) | accepted (پذیرفته‌شده) | declined (ردشده)
 */
export const lawyerReferrals = pgTable("lawyer_referrals", {
  id: serial("id").primaryKey(),
  fromLawyerId: integer("from_lawyer_id")
    .notNull()
    .references(() => lawyers.id, { onDelete: "cascade" }),
  toLawyerId: integer("to_lawyer_id")
    .notNull()
    .references(() => lawyers.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("referral"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  city: text("city"),
  /** بودجهٔ مورد انتظار پرونده (تومان — اختیاری) */
  budget: integer("budget"),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("pending"),
  /** پاسخ کوتاه همکار هنگام پذیرش/رد */
  responseNote: text("response_note"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("lawyer_referrals_to_idx").on(t.toLawyerId, t.status),
  index("lawyer_referrals_from_idx").on(t.fromLawyerId, t.status),
]);
export type LawyerReferral = typeof lawyerReferrals.$inferSelect;

/* ---------------- Lawyer reminders (یادآورهای پنل وکیل) ---------------- */
export const lawyerReminders = pgTable("lawyer_reminders", {
  id: serial("id").primaryKey(),
  lawyerId: integer("lawyer_id")
    .notNull()
    .references(() => lawyers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  note: text("note"),
  dueAt: timestamp("due_at").notNull(),
  done: boolean("done").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type LawyerReminder = typeof lawyerReminders.$inferSelect;

/* ---------------- Team members (ساخت تیم وکیل) ---------------- */
// اعضای تیم در همان app_users ساخته می‌شوند (role="team") تا از همان سشن/کوکی
// موجود استفاده کنند؛ دسترسی‌ها و پرونده‌های سپرده‌شده به هر عضو اینجا نگه داشته می‌شود.
export const teamCaseAssignments = pgTable("team_case_assignments", {
  id: serial("id").primaryKey(),
  /** کاربر عضو تیم (role="team") */
  memberUserId: integer("member_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  caseId: integer("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("team_case_assign_uniq").on(t.memberUserId, t.caseId)]);
export type TeamCaseAssignment = typeof teamCaseAssignments.$inferSelect;

/* ---------------- Content translations (کش ترجمهٔ محتوای پویا) ---------------- */
// ترجمهٔ فیلدهای فارسیِ DB (مقالات، پروفایل وکلا و…) برای زبان‌های en/ar/tr/zh.
// کلید = «<locale>:<sha1 متن فارسی>» — با هر ویرایش متن، کلید عوض می‌شود (بی‌اعتبارسازی خودکار).
export const contentTranslations = pgTable("content_translations", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type ContentTranslation = typeof contentTranslations.$inferSelect;
