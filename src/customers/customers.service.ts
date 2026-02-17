import { Injectable } from '@nestjs/common';
import { DomainError } from '../common/domain-error.js';
import type { User } from '../common/identity.middleware.js';
import { type Customer, CustomersRepository } from './customers.repository.js';

@Injectable()
export class CustomersService {
  constructor(private readonly repository: CustomersRepository) {}

  exists(id: string): boolean {
    return this.repository.findById(id) !== undefined;
  }

  /** Customers may only read their own record. Staff may read any. */
  getForUser(id: string, user: User): Customer {
    if (user.role === 'customer' && user.id !== id) {
      throw new DomainError('FORBIDDEN', 'Customers may only view their own record');
    }
    const customer = this.repository.findById(id);
    if (!customer) {
      throw new DomainError('NOT_FOUND', `Customer '${id}' not found`);
    }
    return customer;
  }
}
