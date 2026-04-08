import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { type AuthedRequest, requireUser } from '../common/identity.middleware.js';
import { Roles } from '../common/roles.decorator.js';
import { RolesGuard } from '../common/roles.guard.js';
import { CreateRefundDto } from './dto/create-refund.dto.js';
import type { RefundRecord } from './refunds.repository.js';
import { type RefundView, RefundsService } from './refunds.service.js';

@Controller()
@UseGuards(RolesGuard)
export class RefundsController {
  constructor(private readonly refunds: RefundsService) {}

  @Post('refunds')
  create(@Body() dto: CreateRefundDto, @Req() req: AuthedRequest): Promise<RefundView> {
    return this.refunds.create(dto, requireUser(req));
  }

  @Get('refunds/:id')
  get(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): RefundView {
    return this.refunds.getForUser(id, requireUser(req));
  }

  @Post('refunds/:id/approve')
  @Roles('support', 'admin')
  approve(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): Promise<RefundView> {
    return this.refunds.approve(id, requireUser(req));
  }

  @Post('refunds/:id/reject')
  @Roles('support', 'admin')
  reject(@Param('id', ParseIntPipe) id: number): RefundView {
    return this.refunds.reject(id);
  }

  @Post('refunds/:id/retry')
  @Roles('support', 'admin')
  retry(@Param('id', ParseIntPipe) id: number): Promise<RefundView> {
    return this.refunds.retry(id);
  }

  @Get('orders/:id/refunds')
  listForOrder(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): RefundRecord[] {
    return this.refunds.listForOrder(id, requireUser(req));
  }

  @Post('orders/:id/cancel-with-refund')
  cancelPaid(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): Promise<RefundView> {
    return this.refunds.cancelPaidOrder(id, requireUser(req));
  }
}
