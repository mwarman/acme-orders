import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../common/roles.decorator.js';
import { RolesGuard } from '../common/roles.guard.js';
import { ReportingService } from './reporting.service.js';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('orders/summary')
  @Roles('admin')
  orderSummary() {
    return this.reporting.orderSummary();
  }

  @Get('refunds/summary')
  @Roles('admin')
  refundSummary() {
    return this.reporting.refundSummary();
  }

  @Get('refunds/export')
  refundExport() {
    return this.reporting.refundExport();
  }
}
