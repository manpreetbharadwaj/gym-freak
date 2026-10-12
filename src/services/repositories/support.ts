import { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ApiError, resolveMediaUrl } from '@/api/client';
import { tokenStorage } from '@/services/auth/tokenStorage';
import { ATTACHMENT_TYPES, LocalImage, MAX_ATTACHMENT_BYTES, NewFeedbackInput, NewTicketInput, PartnerInquiryInput, SubmissionReceipt, SupportConfig, SupportMessage, SupportTicket } from '@/types/support';

/**
 * Help & Support, Feedback and Advertise & Collaborate. Every submit carries a `clientId` the server uses as an
 * idempotency key, so a retry after a timeout returns the original ticket instead of creating a second one.
 */
export interface SupportRepository {
  config(): Promise<SupportConfig>;
  /** Uploads one picked image privately (only this user and the support team can see it); returns its attachment id. */
  uploadAttachment(image: LocalImage): Promise<string>;
  /** Image source with auth headers for a private attachment URL. */
  attachmentSource(url: string): Promise<{ uri: string; headers: Record<string, string> }>;
  createTicket(input: NewTicketInput): Promise<SupportTicket>;
  listTickets(): Promise<SupportTicket[]>;
  getTicket(id: string): Promise<SupportTicket>;
  reply(id: string, input: { clientId: string; body: string; attachmentIds?: string[] }): Promise<SupportTicket>;
  sendFeedback(input: NewFeedbackInput): Promise<SubmissionReceipt>;
  sendPartnerInquiry(input: PartnerInquiryInput): Promise<SubmissionReceipt>;
}

const meta = () => ({ platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web', appVersion: Constants.expoConfig?.version });

export function checkImage(image: LocalImage) {
  if (!(ATTACHMENT_TYPES as readonly string[]).includes(image.mimeType)) throw new ApiError('validation', 'unsupported-image');
  if (image.size > MAX_ATTACHMENT_BYTES) throw new ApiError('validation', 'image-too-large');
}

export class ApiSupportRepository implements SupportRepository {
  constructor(private http: AxiosInstance, private baseURL: string) {}

  async config() { return (await this.http.get<SupportConfig>('/me/gym/support/config')).data; }

  async uploadAttachment(image: LocalImage) {
    // Declare the size of the bytes actually sent: pickers may hand back a re-encoded copy whose size differs
    // from the size they report (seen on Android), and the server rejects any mismatch.
    const bytes = await (await fetch(image.uri)).blob();
    const size = bytes.size || image.size;
    checkImage({ ...image, size });
    const { data } = await this.http.post<{ id: string; upload: { url: string; method: 'PUT'; headers: Record<string, string> } }>('/me/gym/support/attachments', { mimeType: image.mimeType, sizeBytes: size, originalFilename: image.name });
    // The register call above refreshed the token if needed, so the stored one is current for the raw upload.
    const token = (await tokenStorage.getTokens())?.accessToken;
    const res = await fetch(resolveMediaUrl(this.baseURL, data.upload.url)!, { method: 'PUT', headers: { ...data.upload.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: bytes });
    if (!res.ok) throw new ApiError(res.status === 413 ? 'validation' : 'server', 'upload-failed', res.status);
    await this.http.post(`/me/gym/support/attachments/${data.id}/confirm`);
    return data.id;
  }

  async attachmentSource(url: string) {
    const token = (await tokenStorage.getTokens())?.accessToken;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    return { uri: resolveMediaUrl(this.baseURL, url)!, headers };
  }

  async createTicket(input: NewTicketInput) { return (await this.http.post<SupportTicket>('/me/gym/support/tickets', { ...input, ...meta() })).data; }
  async listTickets() { return (await this.http.get<{ items: SupportTicket[] }>('/me/gym/support/tickets')).data.items; }
  async getTicket(id: string) { return (await this.http.get<SupportTicket>(`/me/gym/support/tickets/${id}`)).data; }
  async reply(id: string, input: { clientId: string; body: string; attachmentIds?: string[] }) { return (await this.http.post<SupportTicket>(`/me/gym/support/tickets/${id}/messages`, input)).data; }
  async sendFeedback(input: NewFeedbackInput) { const { data } = await this.http.post<SubmissionReceipt>('/me/gym/feedback', { ...input, ...meta() }); return { id: data.id, reference: data.reference }; }
  async sendPartnerInquiry(input: PartnerInquiryInput) { const { data } = await this.http.post<SubmissionReceipt>('/me/gym/partner-inquiries', { ...input, ...meta() }); return { id: data.id, reference: data.reference }; }
}

/** Offline demo mode: keeps submissions in memory so the screens work without a server. */
export class MockSupportRepository implements SupportRepository {
  private tickets: SupportTicket[] = [];
  private seq = 1;
  private ref(prefix: string) { return `${prefix}-DEMO${String(this.seq++).padStart(2, '0')}`; }
  async config(): Promise<SupportConfig> { return { contactEmail: 'demo@gymfreak.app', billingRecords: [] }; }
  async uploadAttachment(image: LocalImage) { checkImage(image); return `local-${Date.now()}`; }
  async attachmentSource(url: string) { return { uri: url, headers: {} }; }
  async createTicket(input: NewTicketInput) {
    const existing = this.tickets.find((t) => t.id === input.clientId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const ticket: SupportTicket = { id: input.clientId, reference: this.ref('SUP'), category: input.category, subject: input.subject, description: input.description, contactEmail: input.contactEmail ?? 'demo@gymfreak.app', status: 'OPEN', unread: false, createdAt: now, lastMessageAt: now, attachments: [], messages: [] };
    this.tickets.unshift(ticket);
    return ticket;
  }
  async listTickets() { return this.tickets; }
  async getTicket(id: string) { const t = this.tickets.find((x) => x.id === id); if (!t) throw new ApiError('not-found', 'Not found', 404); return t; }
  async reply(id: string, input: { clientId: string; body: string }) {
    const t = await this.getTicket(id);
    const message: SupportMessage = { id: input.clientId, authorType: 'USER', body: input.body, createdAt: new Date().toISOString(), attachments: [] };
    t.messages = [...(t.messages ?? []).filter((m) => m.id !== input.clientId), message];
    t.status = 'OPEN';
    return t;
  }
  async sendFeedback(input: NewFeedbackInput) { return { id: input.clientId, reference: this.ref('FB') }; }
  async sendPartnerInquiry(input: PartnerInquiryInput) { return { id: input.clientId, reference: this.ref('BIZ') }; }
}
