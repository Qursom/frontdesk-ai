export interface AppConfig {
  /** NODE_ENV === 'production': personal data is kept out of the logs. */
  production: boolean;
  port: number;
  corsOrigins: string[];
  mongoUri: string;
  vectorIndexName: string;
  gemini: {
    apiKey: string;
    chatModel: string;
    embeddingModel: string;
  };
  embeddingDimensions: number;
  adminKey: string;
  chatRetentionDays: number;
  leadRetentionDays: number;
  /**
   * Fallback recipient for lead/handoff emails when a tenant's handoffEmail is not configured.
   * Set HANDOFF_EMAIL in the environment. Leave empty to only log in development.
   */
  handoffEmailFallback?: string;
  /** Optional HTTP POST webhook for lead/handoff alerts alongside email. Set NOTIFICATION_WEBHOOK_URL. */
  notificationWebhookUrl?: string;
  smtp: {
    host?: string;
    port: number;
    user?: string;
    pass?: string;
    from: string;
  };
}

const num = (v: string | undefined, d: number) => (v && !isNaN(Number(v)) ? Number(v) : d);

/**
 * GDPR retention in days, read from the environment. A missing, non-numeric, zero or negative value
 * falls back to the default: a bad value must never mean "no TTL index" (keep forever) or "delete at once".
 * Also used by the schemas at definition time (dotenv is loaded first in main.ts / scripts).
 */
export function retentionDays(envName: 'CHAT_RETENTION_DAYS' | 'LEAD_RETENTION_DAYS', fallback: number): number {
  const n = Number(process.env[envName]);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

export const loadConfig = (): AppConfig => ({
  production: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 4000),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/frontdesk',
  vectorIndexName: process.env.VECTOR_INDEX_NAME ?? 'chunks_vector_index',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    chatModel: process.env.GEMINI_CHAT_MODEL ?? 'gemini-2.5-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
  },
  embeddingDimensions: num(process.env.EMBEDDING_DIMENSIONS, 768),
  adminKey: process.env.ADMIN_KEY ?? '',
  chatRetentionDays: retentionDays('CHAT_RETENTION_DAYS', 30),
  leadRetentionDays: retentionDays('LEAD_RETENTION_DAYS', 90),
  handoffEmailFallback: process.env.HANDOFF_EMAIL || undefined,
  notificationWebhookUrl: process.env.NOTIFICATION_WEBHOOK_URL || undefined,
  smtp: {
    host: process.env.SMTP_HOST || undefined,
    port: num(process.env.SMTP_PORT, 465),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM ?? 'FrontDesk AI <no-reply@example.com>',
  },
});

/** Seconds helper for TTL indexes (read at schema-definition time; dotenv is loaded first in main.ts / scripts). */
export const daysToSeconds = (days: number) => Math.round(days * 24 * 60 * 60);
