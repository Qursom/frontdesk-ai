import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import nodemailer, { Transporter } from 'nodemailer';
import { AppConfig } from '../../config/configuration';

export interface LeadAlert {
  tenantName: string;
  to?: string;
  name: string;
  phone: string;
  email?: string;
  preferredTime?: string;
  reason?: string;
  conversationId?: string;
}

export interface HandoffAlert {
  tenantName: string;
  to?: string;
  reason: 'EMERGENCY' | 'HUMAN_REQUEST' | 'ERROR';
  userMessage: string;
  conversationId: string;
}

/** Strip newlines/tabs so visitor text cannot inject extra header lines. */
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, ' ').trim();

/** Escape HTML special chars for safe interpolation into email body. */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// HTML email templates — inline styles only (Gmail / Outlook / Apple Mail safe)
// ---------------------------------------------------------------------------

function row(label: string, value: string, href?: string): string {
  const cell = href
    ? `<a href="${esc(href)}" style="color:#0F766E;text-decoration:none;font-weight:600;">${esc(value)}</a>`
    : `<span style="color:#111827;">${esc(value)}</span>`;
  return `
    <tr style="border-top:1px solid #e5e7eb;">
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;width:38%;background:#f9fafb;">${label}</td>
      <td style="padding:12px 16px;font-size:15px;">${cell}</td>
    </tr>`;
}

function htmlShell(headerBg: string, headerLabel: string, title: string, subtitle: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td>
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">

      <!-- Header -->
      <tr>
        <td style="background:${headerBg};border-radius:10px 10px 0 0;padding:28px 32px 24px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.75);">${esc(headerLabel)}</p>
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${esc(title)}</h1>
          <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${esc(subtitle)}</p>
        </td>
      </tr>

      <!-- Body card -->
      <tr>
        <td style="background:#ffffff;border-radius:0 0 10px 10px;padding:28px 32px 32px;">
          ${body}
          <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
            FrontDesk AI &nbsp;·&nbsp; Sent automatically &nbsp;·&nbsp; Do not reply to this email
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildLeadHtml(a: LeadAlert): string {
  const extraRows = [
    row('Phone', a.phone, `tel:${a.phone.replace(/[^\d+]/g, '')}`),
    ...(a.email ? [row('Email', a.email, `mailto:${a.email}`)] : []),
    ...(a.preferredTime ? [row('Preferred time', a.preferredTime)] : []),
    ...(a.reason ? [row('Reason', a.reason)] : []),
    row('Conversation', a.conversationId ?? '-'),
  ].join('');

  const callBtn = `<a href="tel:${esc(a.phone.replace(/[^\d+]/g, ''))}" style="display:inline-block;background:#0F766E;color:#fff;text-decoration:none;padding:11px 22px;border-radius:6px;font-size:14px;font-weight:600;margin-right:10px;">📞 Call now</a>`;
  const emailBtn = a.email
    ? `<a href="mailto:${esc(a.email)}" style="display:inline-block;border:1.5px solid #0F766E;color:#0F766E;text-decoration:none;padding:11px 22px;border-radius:6px;font-size:14px;font-weight:600;">✉ Email</a>`
    : '';

  const body = `
    <h2 style="margin:0 0 16px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#6b7280;">Contact details</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;overflow:hidden;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;width:38%;background:#f9fafb;">Name</td>
        <td style="padding:12px 16px;font-size:15px;color:#111827;font-weight:600;">${esc(a.name)}</td>
      </tr>
      ${extraRows}
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:22px 0 0;">
      <tr><td>${callBtn}${emailBtn}</td></tr>
    </table>`;

  return htmlShell(
    '#0F766E',
    `FrontDesk AI · ${a.tenantName}`,
    'New patient enquiry',
    `A visitor left their details and wants to be contacted.`,
    body,
  );
}

function buildHandoffHtml(a: HandoffAlert): string {
  const isEmergency = a.reason === 'EMERGENCY';
  const isError = a.reason === 'ERROR';
  const headerBg = isEmergency ? '#dc2626' : isError ? '#d97706' : '#1d4ed8';
  const badge = isEmergency ? '🚨 Urgent' : isError ? '⚠️ Bot error' : '👤 Human requested';
  const title = isEmergency ? 'Patient needs urgent help' : isError ? 'Bot could not respond' : 'Patient wants to speak to staff';
  const subtitle = isEmergency
    ? 'Please call the patient or alert clinical staff immediately.'
    : isError
      ? 'The AI hit a technical problem. Please follow up with the patient.'
      : 'The patient asked to speak with a person.';

  const body = `
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">Patient message</p>
      <p style="margin:8px 0 0;font-size:15px;color:#1f2937;font-style:italic;">"${esc(a.userMessage)}"</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;">
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;width:38%;background:#f9fafb;">Clinic</td>
        <td style="padding:12px 16px;font-size:15px;color:#111827;font-weight:600;">${esc(a.tenantName)}</td>
      </tr>
      <tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;background:#f9fafb;">Alert type</td>
        <td style="padding:12px 16px;font-size:15px;color:#111827;">${badge}</td>
      </tr>
      <tr style="border-top:1px solid #e5e7eb;">
        <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;background:#f9fafb;">Conversation</td>
        <td style="padding:12px 16px;font-size:14px;color:#6b7280;font-family:monospace;">${esc(a.conversationId)}</td>
      </tr>
    </table>`;

  return htmlShell(headerBg, `FrontDesk AI · ${a.tenantName}`, title, subtitle, body);
}

// ---------------------------------------------------------------------------

/** Email + optional webhook. Phase 2: add WhatsApp/Slack notifiers behind the same methods. */
@Injectable()
export class NotifierService implements OnModuleInit {
  private readonly logger = new Logger(NotifierService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;
  private readonly production: boolean;
  /** Destination used when a tenant has no handoffEmail set. */
  private readonly fallbackEmail?: string;
  /** Optional HTTP POST webhook (Slack, Discord, ntfy.sh, Make.com, etc.). */
  private readonly webhookUrl?: string;

  constructor(config: ConfigService<AppConfig, true>) {
    this.production = config.get('production', { infer: true });
    const smtp = config.get('smtp', { infer: true });
    this.from = smtp.from;
    this.fallbackEmail = config.get('handoffEmailFallback', { infer: true });
    this.webhookUrl = config.get('notificationWebhookUrl', { infer: true });
    if (smtp.host && smtp.user && smtp.pass) {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });
    }
  }

  /** Verify SMTP credentials at startup so misconfiguration is caught immediately, not on the first lead. */
  async onModuleInit(): Promise<void> {
    if (!this.transporter) return;
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified ✓');
    } catch (e) {
      this.logger.error(
        `SMTP verification failed — email alerts will not send. ` +
          `Cause: ${(e as Error).message}. ` +
          `Check SMTP_HOST, SMTP_USER, SMTP_PASS and that SMTP_FROM matches the Gmail account.`,
      );
    }
  }

  /**
   * `ref` is a non-personal reference (conversation id) that is safe to log.
   * GDPR: names, phone numbers and patient messages go in the email only. They are written to the
   * log only outside production, where the log IS the alert (local demo without SMTP).
   */
  private async send(
    to: string | undefined,
    subject: string,
    text: string,
    html: string,
    ref: string,
  ) {
    const recipient = to || this.fallbackEmail;
    if (!this.transporter || !recipient) {
      if (this.production) {
        this.logger.warn(`[ALERT NOT SENT] ${subject} (${ref}): SMTP or handoffEmail is not configured.`);
      } else {
        this.logger.log(`[ALERT] ${subject}\n${text}`);
      }
      this.postWebhook(subject, text, ref);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to: recipient, subject, text, html });
      this.logger.log(`[ALERT SENT] ${subject} (${ref})`);
    } catch (e) {
      // Never break the chat because an email failed.
      this.logger.error(`Email failed for "${subject}" (${ref}): ${(e as Error).message}`);
    }
    this.postWebhook(subject, text, ref);
  }

  /**
   * Fire-and-forget HTTP POST to the optional webhook URL.
   * Uses Node's built-in https module — no extra dependency.
   * Payload: { "text": "<subject>\n\n<body>" } — compatible with Slack, Discord, Make.com, ntfy.sh.
   * PII note: same data as the email body reaches the webhook; configure only trusted endpoints.
   */
  private postWebhook(subject: string, text: string, ref: string): void {
    if (!this.webhookUrl) return;
    const body = JSON.stringify({ text: `${subject}\n\n${text}` });
    try {
      const url = new URL(this.webhookUrl);
      const req = httpsRequest(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          this.logger.log(`[WEBHOOK SENT] ${subject} (${ref}): HTTP ${res.statusCode}`);
        },
      );
      req.on('error', (e) => this.logger.error(`Webhook failed for "${subject}" (${ref}): ${e.message}`));
      req.write(body);
      req.end();
    } catch (e) {
      this.logger.error(`Webhook error for "${subject}" (${ref}): ${(e as Error).message}`);
    }
  }

  notifyLead(a: LeadAlert) {
    const subject = `New patient enquiry - ${a.tenantName}`;
    const text = [
      `New patient enquiry — ${a.tenantName}`,
      '',
      `Name:           ${oneLine(a.name)}`,
      `Phone:          ${oneLine(a.phone)}`,
      `Email:          ${oneLine(a.email ?? '-')}`,
      `Preferred time: ${oneLine(a.preferredTime ?? '-')}`,
      `Reason:         ${oneLine(a.reason ?? '-')}`,
      `Conversation:   ${a.conversationId ?? '-'}`,
    ].join('\n');
    return this.send(a.to, subject, text, buildLeadHtml(a), `conversation ${a.conversationId ?? '-'}`);
  }

  notifyHandoff(a: HandoffAlert) {
    const label = a.reason === 'EMERGENCY' ? 'URGENT' : a.reason === 'ERROR' ? 'Bot error' : 'Human requested';
    const subject = `[${label}] Chat needs staff - ${a.tenantName}`;
    const text = [
      `${subject}`,
      '',
      `Patient message: "${oneLine(a.userMessage)}"`,
      `Conversation:    ${a.conversationId}`,
    ].join('\n');
    return this.send(a.to, subject, text, buildHandoffHtml(a), `conversation ${a.conversationId}`);
  }
}
