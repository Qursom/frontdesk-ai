import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas';
import { contrastTextFor } from './contrast';

/** Small in-memory cache: tenant config is read on every chat message. */
const TTL_MS = 60_000;

@Injectable()
export class TenantsService {
  private cache = new Map<string, { at: number; doc: TenantDocument }>();

  constructor(@InjectModel(Tenant.name) private readonly tenants: Model<Tenant>) {}

  async getActiveBySlug(slug: string): Promise<TenantDocument> {
    const key = slug.toLowerCase();
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.doc;

    const doc = await this.tenants.findOne({ slug: key, active: true }).exec();
    if (!doc) throw new NotFoundException('Unknown tenant'); // never echo visitor input back
    this.cache.set(key, { at: Date.now(), doc });
    return doc;
  }

  /** Safe, public subset used by the widget (no emails, no rules). */
  async getPublicConfig(slug: string) {
    const t = await this.getActiveBySlug(slug);
    return {
      slug: t.slug,
      name: t.name,
      botName: t.botName,
      welcomeMessage: t.welcomeMessage,
      quickReplies: t.quickReplies,
      theme: { ...t.theme, primaryContrast: contrastTextFor(t.theme?.primaryColor ?? '#0F766E') },
      phone: t.phone,
      privacyUrl: t.privacyUrl,
      allowedDomains: t.allowedDomains,
      openingHours: t.openingHours ?? [],
      timezone: t.timezone || 'Europe/London',
    };
  }
}
