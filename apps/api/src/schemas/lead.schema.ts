import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { daysToSeconds, retentionDays } from '../config/configuration';

@Schema({ timestamps: true, collection: 'leads' })
export class Lead {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ trim: true })
  preferredTime?: string;

  @Prop({ trim: true })
  reason?: string;

  /** The visitor ticked the consent box (GDPR lawful basis + proof). */
  @Prop({ required: true })
  consentAt: Date;

  @Prop({ type: String, enum: ['new', 'contacted', 'booked', 'closed'], default: 'new' })
  status: string;

  createdAt?: Date;
}

export type LeadDocument = HydratedDocument<Lead>;
export const LeadSchema = SchemaFactory.createForClass(Lead);

LeadSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: daysToSeconds(retentionDays('LEAD_RETENTION_DAYS', 90)) },
);
