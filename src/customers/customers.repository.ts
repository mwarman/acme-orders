import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';

export interface Customer {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class CustomersRepository {
  constructor(private readonly database: DatabaseService) {}

  findById(id: string): Customer | undefined {
    return this.database.db.prepare('SELECT id, name, email FROM customers WHERE id = ?').get(id) as
      | Customer
      | undefined;
  }
}
