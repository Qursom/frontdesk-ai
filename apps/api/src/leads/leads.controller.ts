import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Types } from 'mongoose';
import { AdminKeyGuard } from '../common/admin-key.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

@Controller('v1')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('leads')
  create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }

  // ---------- Admin (x-admin-key) ----------

  @UseGuards(AdminKeyGuard)
  @Get('admin/leads')
  listLeads(@Query('tenant') tenant: string) {
    return this.leads.listLeads(this.slug(tenant));
  }

  @UseGuards(AdminKeyGuard)
  @Get('admin/conversations')
  listConversations(@Query('tenant') tenant: string) {
    return this.leads.listConversations(this.slug(tenant));
  }

  @UseGuards(AdminKeyGuard)
  @Get('admin/conversations/:id/messages')
  messages(@Query('tenant') tenant: string, @Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('bad id');
    return this.leads.getMessages(this.slug(tenant), id);
  }

  @UseGuards(AdminKeyGuard)
  @Get('admin/stats')
  stats(@Query('tenant') tenant: string, @Query('days') days?: string) {
    // 1..365 whole days; anything else (missing, text, zero, negative) means the default 30.
    const n = Math.floor(Number(days));
    return this.leads.stats(this.slug(tenant), n >= 1 ? Math.min(n, 365) : 30);
  }

  private slug(t?: string) {
    if (!t || !/^[a-z0-9-]{2,60}$/.test(t)) throw new BadRequestException('tenant query param required');
    return t;
  }
}
