import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AgentService } from './agent.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [RagModule, TenantsModule],
  controllers: [ChatController],
  providers: [ChatService, AgentService],
  exports: [ChatService],
})
export class ChatModule {}
