/* ============================================================================
 * دادورزان — تایپ‌های مشترک فضای کاری پرونده (موکل و وکیل)
 * داده‌های اولیه در سرور خوانده و به‌صورت ISO به کلاینت منتقل می‌شود.
 * ========================================================================== */

export type LawyerLite = {
  id: number;
  name: string;
  slug: string;
  title: string;
  rating: number;
};

export type WorkspaceCase = {
  id: number;
  caseNumber: string;
  subject: string;
  description: string;
  city: string;
  province: string;
  specialty: string;
  stage: string;
  status: string;
  budget: string | null;
  progress: number;
  urgency: string;
  feeAgreed: string | null;
  contractStatus: string;
  contractCode: string;
  contractSignedAt: string | null;
  createdAt: string | null;
};

export type ProposalItem = {
  id: number;
  lawyerId: number;
  lawyerName?: string | null;
  amount: string;
  note: string;
  durationMonths: number;
  status: string;
  aiMatchScore: number;
  createdAt: string | null;
};

export type EventItem = {
  id: number;
  actor: string;
  actorName: string;
  title: string;
  description: string;
  progress: number | null;
  createdAt: string | null;
};

export type MessageItem = {
  id: number;
  senderRole: string;
  senderName: string;
  body: string;
  createdAt: string | null;
};

export type InstallmentItem = {
  id: number;
  number: number;
  amount: string;
  dueDate: string | null;
  status: string;
  source: string;
  paidAt: string | null;
  trackingCode: string;
};

export type CreditItem = {
  id: number;
  provider: string;
  amount: string;
  months: number;
  status: string;
  statusDetail: string;
  referenceCode: string;
  createdAt: string | null;
};

export type AppointmentItem = {
  id: number;
  caseId: number | null;
  title: string;
  kind: string;
  location: string;
  notes: string;
  startsAt: string | null;
  createdBy: string;
};
