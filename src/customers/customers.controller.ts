import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { type AuthedRequest, requireUser } from '../common/identity.middleware.js';
import { RolesGuard } from '../common/roles.guard.js';
import type { Customer } from './customers.repository.js';
import { CustomersService } from './customers.service.js';

@Controller('customers')
@UseGuards(RolesGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get(':id')
  get(@Param('id') id: string, @Req() req: AuthedRequest): Customer {
    return this.customers.getForUser(id, requireUser(req));
  }
}
