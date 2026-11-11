export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

import type { WeeklyHours } from './opening-hours';

export type ChatAction = 'NONE' | 'SHOW_LEAD_FORM' | 'HANDOFF';
export type HandoffReason = 'EMERGENCY' | 'HUMAN' | 'ERROR';

export interface TenantPublicConfig {
  slug: string;
  name: string;
  botName: string;
  welcomeMessage: string;
  quickReplies: string[];
  /** primaryContrast is computed by the API (contrast guard); the widget recomputes it if missing. radius in px, font is a CSS font-family. */
  theme: { primaryColor: string; primaryContrast?: string; radius?: number; font?: string };
  phone: string;
  privacyUrl: string;
  allowedDomains: string[];
  openingHours: WeeklyHours[];
  timezone: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  action: ChatAction;
  handoffReason?: HandoffReason;
  sources: string[];
}

export interface LeadInput {
  tenant: string;
  conversationId?: string;
  name: string;
  phone: string;
  email?: string;
  preferredTime?: string;
  reason?: string;
  consent: boolean;
}

/** Carries the HTTP status so the UI can tell a rate limit (429) from a validation error (400). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** API limits per IP: chat 15/min, leads 5/min, everything else 60/min. */
export const isRateLimited = (e: unknown) => e instanceof ApiError && e.status === 429;
export const isValidationError = (e: unknown) => e instanceof ApiError && e.status === 400;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // The API's AllExceptionsFilter returns { statusCode, message }; validation errors give message as a list.
    const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(msg || `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

export const api = {
  tenant: (slug: string) => request<TenantPublicConfig>(`/v1/tenants/${encodeURIComponent(slug)}/public`),
  chat: (tenant: string, message: string, conversationId?: string) =>
    request<ChatResponse>('/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ tenant, message, ...(conversationId ? { conversationId } : {}) }),
    }),
  lead: (input: LeadInput) => request<{ ok: boolean; leadId: string }>('/v1/leads', { method: 'POST', body: JSON.stringify(input) }),
  admin: <T,>(path: string, key: string) => request<T>(`/v1/admin${path}`, { headers: { 'x-admin-key': key } }),
};
