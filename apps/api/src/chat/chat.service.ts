import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotifierService } from '../providers/notify/notifier.service';
import { withTimeout } from '../common/with-timeout';
import { ChatTurn } from '../providers/llm/llm.interface';
import { Channel, Conversation, ConversationDocument, Message, TenantDocument } from '../schemas';
import { TenantsService } from '../tenants/tenants.service';
import { AgentService } from './agent.service';
import { ChatAction, ChatResponse, HandoffReason } from './chat.types';
import { checkGuardrails } from './guardrails';

const HISTORY_TURNS = 8;
/** A hung AI call must not leave the visitor waiting forever: after this, they get the fallback reply + handoff. */
const AGENT_TIMEOUT_MS = 30_000;

export interface IncomingMessage {
  tenantSlug: string;
  conversationId?: string;
  text: string;
  channel: Channel;
}

/**
 * Channel-independent orchestration of one message.
 * The web controller calls this today; a WhatsApp adapter will call the same method later.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly tenants: TenantsService,
    private readonly agent: AgentService,
    private readonly notifier: NotifierService,
    @InjectModel(Conversation.name) private readonly conversations: Model<Conversation>,
    @InjectModel(Message.name) private readonly messages: Model<Message>,
  ) {}

  async handle(input: IncomingMessage): Promise<ChatResponse> {
    const tenant = await this.tenants.getActiveBySlug(input.tenantSlug);
    const conversation = await this.getOrCreateConversation(tenant, input.conversationId, input.channel);
    const history = await this.loadHistory(tenant._id, conversation._id);

    await this.messages.create({
      conversationId: conversation._id,
      tenantId: tenant._id,
      role: 'user',
      content: input.text,
    });

    const { reply, action, sources, route, handoffReason } = await this.decide(tenant, conversation, history, input.text);

    await this.messages.create({
      conversationId: conversation._id,
      tenantId: tenant._id,
      role: 'assistant',
      content: reply,
      action,
      route,
    });

    conversation.messageCount += 2;
    conversation.lastMessagePreview = input.text.slice(0, 120);
    if (action === 'HANDOFF') conversation.status = 'handoff';
    await conversation.save();

    return { conversationId: conversation.id, reply, action, sources, ...(handoffReason ? { handoffReason } : {}) };
  }

  private async decide(
    tenant: TenantDocument,
    conversation: ConversationDocument,
    history: ChatTurn[],
    text: string,
  ): Promise<{ reply: string; action: ChatAction; sources: string[]; route: string; handoffReason?: HandoffReason }> {
    const guard = checkGuardrails(text);
    const phone = tenant.phone ? ` on ${tenant.phone}` : '';

    if (guard.type === 'EMERGENCY') {
      void this.notifier.notifyHandoff({
        tenantName: tenant.name,
        to: tenant.handoffEmail,
        reason: 'EMERGENCY',
        userMessage: text,
        conversationId: conversation.id,
      });
      return {
        reply:
          `I'm an AI assistant, so I can't assess symptoms. If this is urgent, please call us now${phone}. ` +
          (tenant.emergencyInfo ? `${tenant.emergencyInfo} ` : '') +
          `You can also leave your details below and the team will contact you as soon as possible.`,
        action: 'HANDOFF',
        handoffReason: 'EMERGENCY',
        sources: [],
        route: 'guard:emergency',
      };
    }

    if (guard.type === 'HUMAN') {
      void this.notifier.notifyHandoff({
        tenantName: tenant.name,
        to: tenant.handoffEmail,
        reason: 'HUMAN_REQUEST',
        userMessage: text,
        conversationId: conversation.id,
      });
      return {
        reply: `Of course. Please leave your name and phone number below and a member of our team will contact you. You can also call us${phone}.`,
        action: 'HANDOFF',
        handoffReason: 'HUMAN',
        sources: [],
        route: 'guard:human',
      };
    }

    try {
      const r = await withTimeout(this.agent.run(tenant, history, text), AGENT_TIMEOUT_MS, 'Agent');
      return { ...r, route: 'agent' };
    } catch (e) {
      // Error fallback: never leave the patient with a blank or broken chat.
      this.logger.error(`Agent failed: ${(e as Error).message}`);
      void this.notifier.notifyHandoff({
        tenantName: tenant.name,
        to: tenant.handoffEmail,
        reason: 'ERROR',
        userMessage: text,
        conversationId: conversation.id,
      });
      return {
        reply: `Sorry, I'm having a technical problem right now. Please call us${phone}, or leave your details below and the team will get back to you.`,
        action: 'HANDOFF',
        handoffReason: 'ERROR',
        sources: [],
        route: 'fallback:error',
      };
    }
  }

  private async getOrCreateConversation(
    tenant: TenantDocument,
    conversationId: string | undefined,
    channel: Channel,
  ): Promise<ConversationDocument> {
    if (conversationId && Types.ObjectId.isValid(conversationId)) {
      // tenantId in the filter = a conversation can never be continued under another clinic.
      const existing = await this.conversations.findOne({ _id: conversationId, tenantId: tenant._id }).exec();
      if (existing) return existing;
    }
    return this.conversations.create({ tenantId: tenant._id, channel });
  }

  private async loadHistory(tenantId: Types.ObjectId, conversationId: Types.ObjectId): Promise<ChatTurn[]> {
    // tenantId is in the filter even though the conversation was already checked: every query is tenant-scoped.
    const last = await this.messages
      .find({ tenantId, conversationId })
      .sort({ createdAt: -1 })
      .limit(HISTORY_TURNS)
      .lean()
      .exec();
    return last.reverse().map((m) => ({ role: m.role, content: m.content }));
  }
}
