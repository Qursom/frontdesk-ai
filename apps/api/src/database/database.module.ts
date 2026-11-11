import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfig } from '../config/configuration';
import { ALL_MODELS } from '../schemas';
import { TtlSyncService } from './ttl-sync.service';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        uri: config.get('mongoUri', { infer: true }),
        autoIndex: true,
      }),
    }),
    MongooseModule.forFeature(ALL_MODELS),
  ],
  providers: [TtlSyncService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
