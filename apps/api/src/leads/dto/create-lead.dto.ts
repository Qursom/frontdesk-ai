import { Equals, IsBoolean, IsEmail, IsMongoId, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Trim } from '../../common/trim.decorator';

export class CreateLeadDto {
  @IsString()
  @Matches(/^[a-z0-9-]{2,60}$/)
  tenant: string;

  @IsOptional()
  @IsMongoId()
  conversationId?: string;

  @Trim()
  @IsString()
  @Length(2, 100)
  name: string;

  // Allowed characters and length, plus at least 6 digits: "------" or spaces alone is not a number staff can call.
  @Trim()
  @IsString()
  @Matches(/^[+()\d\s-]{6,25}$/, { message: 'phone looks invalid' })
  @Matches(/^(?:\D*\d){6}/, { message: 'phone looks invalid' })
  phone: string;

  @IsOptional()
  @Trim()
  @IsEmail()
  @Length(3, 254)
  email?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(0, 100)
  preferredTime?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(0, 300)
  reason?: string;

  /** GDPR: the visitor must actively tick "I agree the clinic may contact me". */
  @IsBoolean()
  @Equals(true, { message: 'consent is required' })
  consent: boolean;
}
