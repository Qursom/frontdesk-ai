import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';

const SLUG_RE = /^[a-z0-9-]{2,60}$/;

@Controller('v1/tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get(':slug/public')
  getPublic(@Param('slug') slug: string) {
    // Same slug rule as the chat and lead DTOs. Anything else cannot be a tenant, so skip the database
    // and do not echo the raw value back in the error.
    if (!SLUG_RE.test(slug)) throw new NotFoundException('Unknown tenant');
    return this.tenants.getPublicConfig(slug);
  }
}
