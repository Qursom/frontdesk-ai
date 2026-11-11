import { IsMongoId, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Trim } from '../../common/trim.decorator';

export class ChatRequestDto {
  @IsString()
  @Matches(/^[a-z0-9-]{2,60}$/, { message: 'tenant must be a slug' })
  tenant: string;

  @IsOptional()
  @IsMongoId()
  conversationId?: string;

  @Trim()
  @IsString()
  @Length(1, 1000)
  message: string;
}
