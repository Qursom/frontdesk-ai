import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ChatModule } from './chat/chat.module';
import { loadConfig } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { LeadsModule } from './leads/leads.module';
import { ProvidersModule } from './providers/providers.module';
import { RagModule } from './rag/rag.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] }),
    // Global default: 60 requests / minute / IP. Chat + leads have stricter limits.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    DatabaseModule,
    ProvidersModule,
    TenantsModule,
    RagModule,
    ChatModule,
    LeadsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
