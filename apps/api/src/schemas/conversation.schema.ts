import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { daysToSeconds, retentionDays } from '../config/configuration';

export type Channel = 'web' | 'whatsapp';
export type ConversationStatus = 'open' | 'handoff' | 'closed';

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  /** Channel adapter that created it. Phase 2 adds 'whatsapp' — same ChatService. */
  @Prop({ type: String, enum: ['web', 'whatsapp'], default: 'web' })
  channel: Channel;

  @Prop({ type: String, enum: ['open', 'handoff', 'closed'], default: 'open' })
  status: ConversationStatus;

  @Prop({ default: false })
  leadCaptured: boolean;

  @Prop({ default: 0 })
  messageCount: number;

  @Prop({ default: '' })
  lastMessagePreview: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ConversationDocument = HydratedDocument<Conversation>;
export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// GDPR: auto-delete conversations after CHAT_RETENTION_DAYS (MongoDB TTL index).
ConversationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: daysToSeconds(retentionDays('CHAT_RETENTION_DAYS', 30)) },
);
ConversationSchema.index({ tenantId: 1, updatedAt: -1 });
