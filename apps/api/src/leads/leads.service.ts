import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotifierService } from '../providers/notify/notifier.service';
import { Conversation, Lead, Message } from '../schemas';
import { TenantsService } from '../tenants/tenants.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly tenants: TenantsService,
    private readonly notifier: NotifierService,
    @InjectModel(Lead.name) private readonly leads: Model<Lead>,
    @InjectModel(Conversation.name) private readonly conversations: Model<Conversation>,
    @InjectModel(Message.name) private readonly messages: Model<Message>,
  ) {}

  async create(dto: CreateLeadDto) {
    const tenant = await this.tenants.getActiveBySlug(dto.tenant);

    let conversationId: Types.ObjectId | undefined;
    if (dto.conversationId) {
      const conv = await this.conversations
        .findOneAndUpdate({ _id: dto.conversationId, tenantId: tenant._id }, { leadCaptured: true })
        .exec();
      conversationId = conv?._id;
    }

    const lead = await this.leads.create({
      tenantId: tenant._id,
      conversationId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      preferredTime: dto.preferredTime,
      reason: dto.reason,
      consentAt: new Date(),
    });

    void this.notifier.notifyLead({
      tenantName: tenant.name,
      to: tenant.handoffEmail,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      preferredTime: lead.preferredTime,
      reason: lead.reason,
      conversationId: conversationId?.toString(),
    });

    return { ok: true, leadId: lead.id };
  }

  // ---------- Admin ----------

  async listLeads(slug: string) {
    const tenant = await this.tenants.getActiveBySlug(slug);
    return this.leads.find({ tenantId: tenant._id }).sort({ createdAt: -1 }).limit(200).lean().exec();
  }

  async listConversations(slug: string) {
    const tenant = await this.tenants.getActiveBySlug(slug);
    return this.conversations
      .find({ tenantId: tenant._id })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean()
      .exec();
  }

  async getMessages(slug: string, conversationId: string) {
    const tenant = await this.tenants.getActiveBySlug(slug);
    return this.messages
      .find({ tenantId: tenant._id, conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  /** Basis of the monthly "care plan" report you send to the clinic. */
  async stats(slug: string, days = 30) {
    const tenant = await this.tenants.getActiveBySlug(slug);
    const since = new Date(Date.now() - days * 86_400_000);
    const [conversations, leads, handoffs, byRoute, afterHours] = await Promise.all([
      this.conversations.countDocuments({ tenantId: tenant._id, createdAt: { $gte: since } }),
      this.leads.countDocuments({ tenantId: tenant._id, createdAt: { $gte: since } }),
      this.conversations.countDocuments({ tenantId: tenant._id, status: 'handoff', createdAt: { $gte: since } }),
      this.messages.aggregate([
        { $match: { tenantId: tenant._id, role: 'assistant', createdAt: { $gte: since } } },
        { $group: { _id: '$route', count: { $sum: 1 } } },
      ]),
      // UTC approximation: before 09:00 or at/after 18:00, or weekend (Sun=1, Sat=7)
      this.conversations.countDocuments({
        tenantId: tenant._id,
        createdAt: { $gte: since },
        $expr: {
          $or: [
            { $lt: [{ $hour: '$createdAt' }, 9] },
            { $gte: [{ $hour: '$createdAt' }, 18] },
            { $in: [{ $dayOfWeek: '$createdAt' }, [1, 7]] },
          ],
        },
      }),
    ]);
    return { days, conversations, leads, handoffs, afterHours, repliesByRoute: byRoute };
  }
}
