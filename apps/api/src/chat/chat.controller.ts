import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { ChatResponse } from './chat.types';
import { ChatRequestDto } from './dto/chat-request.dto';

/** WEB channel adapter. (Phase 2: WhatsAppController -> same ChatService.handle()) */
@Controller('v1/chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // Stricter limit on the expensive endpoint: 15 messages / minute / IP.
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post()
  @HttpCode(200)
  send(@Body() dto: ChatRequestDto): Promise<ChatResponse> {
    return this.chat.handle({
      tenantSlug: dto.tenant,
      conversationId: dto.conversationId,
      text: dto.message.trim(),
      channel: 'web',
    });
  }
}
