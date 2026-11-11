import { Chunk, ChunkSchema } from './chunk.schema';
import { Conversation, ConversationSchema } from './conversation.schema';
import { Lead, LeadSchema } from './lead.schema';
import { Message, MessageSchema } from './message.schema';
import { Tenant, TenantSchema } from './tenant.schema';

export * from './chunk.schema';
export * from './conversation.schema';
export * from './lead.schema';
export * from './message.schema';
export * from './tenant.schema';

/** Register all models once (DatabaseModule is global). */
export const ALL_MODELS = [
  { name: Tenant.name, schema: TenantSchema },
  { name: Chunk.name, schema: ChunkSchema },
  { name: Conversation.name, schema: ConversationSchema },
  { name: Message.name, schema: MessageSchema },
  { name: Lead.name, schema: LeadSchema },
];
