import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [TenantsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
