import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { type AuthedRequest, requireUser } from '../common/identity.middleware.js';
import { Roles } from '../common/roles.decorator.js';
import { RolesGuard } from '../common/roles.guard.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import type { OrderRecord } from './orders.repository.js';
import { type OrderView, OrdersService } from './orders.service.js';

@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req: AuthedRequest): OrderView {
    return this.orders.create(dto, requireUser(req));
  }

  @Get()
  list(@Req() req: AuthedRequest, @Query('customerId') customerId?: string): OrderRecord[] {
    return this.orders.listForUser(requireUser(req), customerId);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): OrderView {
    return this.orders.getForUser(id, requireUser(req));
  }

  @Post(':id/place')
  place(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): OrderView {
    return this.orders.place(id, requireUser(req));
  }

  @Post(':id/pay')
  pay(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): Promise<OrderView> {
    return this.orders.pay(id, requireUser(req));
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest): OrderView {
    return this.orders.cancel(id, requireUser(req));
  }

  @Post(':id/ship')
  @Roles('support', 'admin')
  ship(@Param('id', ParseIntPipe) id: number): OrderView {
    return this.orders.ship(id);
  }

  @Post(':id/deliver')
  @Roles('support', 'admin')
  deliver(@Param('id', ParseIntPipe) id: number): OrderView {
    return this.orders.deliver(id);
  }

  @Post(':id/close')
  @Roles('support', 'admin')
  close(@Param('id', ParseIntPipe) id: number): OrderView {
    return this.orders.close(id);
  }
}
