import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { daysToSeconds, retentionDays } from '../config/configuration';

export type MessageRole = 'user' | 'assistant';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'messages' })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;

  @Prop({ type: String, enum: ['user', 'assistant'], required: true })
  role: MessageRole;

  @Prop({ required: true })
  content: string;

  /** NONE | SHOW_LEAD_FORM | HANDOFF — what the widget should do after this reply. */
  @Prop({ default: 'NONE' })
  action: string;

  /** Which guardrail or path produced the reply (for debugging + monthly report). */
  @Prop({ default: 'agent' })
  route: string;

  createdAt?: Date;
}

export type MessageDocument = HydratedDocument<Message>;
export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: daysToSeconds(retentionDays('CHAT_RETENTION_DAYS', 30)) },
);
MessageSchema.index({ conversationId: 1, createdAt: 1 });
