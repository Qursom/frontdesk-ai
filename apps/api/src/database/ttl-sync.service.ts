import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppConfig, daysToSeconds } from '../config/configuration';

/**
 * Keeps the GDPR auto-delete (TTL) indexes in line with CHAT_RETENTION_DAYS / LEAD_RETENTION_DAYS.
 *
 * Why this exists: Mongoose creates a TTL index once. If the retention setting changes later, MongoDB
 * refuses to re-create the index with a different expiry and Mongoose only logs it, so the old
 * retention would silently stay in force. On every start we check the real index and correct it.
 */
@Injectable()
export class TtlSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TtlSyncService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async onApplicationBootstrap() {
    const chat = daysToSeconds(this.config.get('chatRetentionDays', { infer: true }));
    const leads = daysToSeconds(this.config.get('leadRetentionDays', { infer: true }));
    // Not awaited by the caller's request path, and never fatal: the API must still start if this fails.
    for (const [collection, seconds] of [
      ['conversations', chat],
      ['messages', chat],
      ['leads', leads],
    ] as const) {
      await this.sync(collection, seconds).catch((e) =>
        this.logger.error(`TTL check failed for "${collection}": ${(e as Error).message}`),
      );
    }
  }

  private async sync(collection: string, seconds: number) {
    const db = this.connection.db;
    if (!db) throw new Error('no database connection');
    const col = db.collection(collection);

    // Collection may not exist yet on a brand-new database; Mongoose creates it with the index.
    const indexes = await col.indexes().catch(() => []);
    const ttl = indexes.find((i) => JSON.stringify(i.key) === JSON.stringify({ createdAt: 1 }));

    if (!ttl) {
      await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: seconds });
      this.logger.log(`TTL index created on ${collection}.createdAt (${seconds / 86_400} days)`);
    } else if (ttl.expireAfterSeconds !== seconds) {
      await db.command({ collMod: collection, index: { keyPattern: { createdAt: 1 }, expireAfterSeconds: seconds } });
      this.logger.warn(
        `TTL on ${collection} changed from ${(ttl.expireAfterSeconds ?? 0) / 86_400} to ${seconds / 86_400} days`,
      );
    } else {
      this.logger.log(`TTL on ${collection}: ${seconds / 86_400} days`);
    }
  }
}
