import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * One document per client (clinic). All behaviour that differs between clients
 * lives here as CONFIG, not code — adding client #2 = adding one row.
 */
@Schema({ timestamps: true, collection: 'tenants' })
export class Tenant {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 'Sophie' })
  botName: string;

  @Prop({ default: 'en' })
  defaultLanguage: string;

  @Prop({ default: '' })
  phone: string;

  /** Shown for urgent/emergency messages, e.g. "call 999 or NHS 111". Country-specific. */
  @Prop({ default: '' })
  emergencyInfo: string;

  /** First message in the widget. MUST say it is an AI (EU AI Act Art. 50). */
  @Prop({ required: true })
  welcomeMessage: string;

  @Prop({ type: [String], default: [] })
  quickReplies: string[];

  /** Widget look. radius (px) and font (CSS font-family) are optional; the widget has defaults. */
  @Prop({ type: Object, default: { primaryColor: '#0F766E' } })
  theme: { primaryColor: string; radius?: number; font?: string };

  /**
   * Weekly hours, used by the widget for honest after-hours messages.
   * day: 0 = Sunday ... 6 = Saturday. open/close are "HH:MM" in `timezone`. A closed day has no entry.
   */
  @Prop({ type: [Object], default: [] })
  openingHours: { day: number; open: string; close: string }[];

  @Prop({ default: 'Europe/London' })
  timezone: string;

  /** Websites allowed to embed the widget (used for frame-ancestors). e.g. https://brightsmile.co.uk */
  @Prop({ type: [String], default: [] })
  allowedDomains: string[];

  /** Where lead + handoff alerts go. */
  @Prop()
  handoffEmail?: string;

  @Prop({ default: '' })
  privacyUrl: string;

  /** Extra clinic-specific rules added to the system prompt. */
  @Prop({ default: '' })
  extraRules: string;

  /** Feature flags for later phases (WhatsApp, booking). */
  @Prop({ type: Object, default: { booking: false, whatsapp: false } })
  features: { booking: boolean; whatsapp: boolean };

  @Prop({ default: true })
  active: boolean;
}

export type TenantDocument = HydratedDocument<Tenant>;
export const TenantSchema = SchemaFactory.createForClass(Tenant);
