import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { AppConfig } from '../config/configuration';

/** Phase 1 admin protection: one shared key in the x-admin-key header. (Phase 3: real users + roles.) */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const expected = this.config.get('adminKey', { infer: true });
    const given = ctx.switchToHttp().getRequest().headers['x-admin-key'];
    if (!expected || expected.length < 12) throw new UnauthorizedException('ADMIN_KEY not configured');
    if (typeof given !== 'string') throw new UnauthorizedException();
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException();
    return true;
  }
}
