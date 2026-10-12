/** Help & Support, Feedback and Partnerships — mirrors the HealthyMe `/v1/me/gym/support|feedback|partner-inquiries` API. */

export const SUPPORT_CATEGORIES = ['PAYMENT', 'SUBSCRIPTION_BILLING', 'ACCOUNT_LOGIN', 'WORKOUT_PLAN', 'TECHNICAL', 'NOTIFICATIONS', 'REFUND_CANCELLATION', 'OTHER'] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
/** Categories where the user may point at one of their own purchases / subscriptions. */
export const BILLING_CATEGORIES: readonly SupportCategory[] = ['PAYMENT', 'SUBSCRIPTION_BILLING', 'REFUND_CANCELLATION'];
export type SupportStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';

export const FEEDBACK_CATEGORIES = ['GENERAL', 'FEATURE', 'BUG', 'UI_UX', 'EXERCISE_CONTENT', 'PERFORMANCE', 'OTHER'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const PARTNER_TYPES = ['BRAND_ADVERTISING', 'SPONSORED_STORIES', 'AFFILIATE', 'MEMBER_OFFERS', 'SPONSORED_CHALLENGES', 'OTHER'] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];
export const PARTNER_BUDGETS = ['UNDER_1K', '1K_5K', '5K_20K', 'OVER_20K', 'UNDISCLOSED'] as const;
export type PartnerBudget = (typeof PARTNER_BUDGETS)[number];

export const MAX_ATTACHMENTS = 3;
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface BillingRecord {
  type: 'subscription' | 'checkout';
  id: string;
  platform: string;
  product: string;
  status: string;
  date: string;
  expiresAt: string | null;
  amountMinor: number | null;
  currency: string | null;
}

export interface SupportConfig { contactEmail: string; billingRecords: BillingRecord[] }

export interface SupportAttachment { id: string; url: string }
export interface SupportMessage { id: string; authorType: 'USER' | 'ADMIN' | 'SYSTEM'; body: string; createdAt: string; attachments: SupportAttachment[] }
export interface SupportTicket {
  id: string;
  reference: string;
  category: SupportCategory;
  subject: string;
  description: string;
  contactEmail: string;
  status: SupportStatus;
  unread: boolean;
  createdAt: string;
  lastMessageAt: string;
  attachments?: SupportAttachment[];
  messages?: SupportMessage[];
}

/** A picked image, before upload. */
export interface LocalImage { uri: string; mimeType: string; size: number; name?: string; width?: number; height?: number }

export interface NewTicketInput {
  clientId: string;
  category: SupportCategory;
  subject: string;
  description: string;
  contactEmail?: string;
  linkedSubscriptionId?: string;
  linkedCheckoutId?: string;
  attachmentIds?: string[];
}

export interface NewFeedbackInput { clientId: string; category: FeedbackCategory; subject: string; description: string; rating?: number; attachmentIds?: string[] }

export interface PartnerInquiryInput {
  clientId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  country?: string;
  collaborationTypes: PartnerType[];
  budgetRange?: PartnerBudget;
  message: string;
  consentToContact: boolean;
}

/** What the app gets back after a submit: the human reference to show (and quote on calls/emails). */
export interface SubmissionReceipt { id: string; reference: string }
