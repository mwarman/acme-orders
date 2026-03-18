import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';

@Injectable()
export class ReportingService {
  constructor(private readonly database: DatabaseService) {}

  orderSummary() {
    const byStatus = this.database.db.prepare(
      'SELECT status, COUNT(*) AS orders, SUM(total_cents) AS totalCents FROM orders GROUP BY status ORDER BY status',
    ).all();
    const daily = this.database.db.prepare(
      `SELECT substr(created_at,1,10) AS day, COUNT(*) AS orders, SUM(paid_cents) AS grossCents,
       SUM(refunded_cents) AS refundedCents, SUM(paid_cents-refunded_cents) AS netCents
       FROM orders WHERE status NOT IN ('DRAFT','CANCELLED') GROUP BY day ORDER BY day`,
    ).all();
    return { byStatus, daily };
  }

  refundSummary() {
    return this.database.db.prepare(
      `SELECT reason, status, COUNT(*) AS refunds, SUM(amount_cents) AS amountCents,
       SUM(fee_cents) AS feeCents, SUM(shipping_cents) AS shippingCents
       FROM refunds GROUP BY reason, status ORDER BY reason, status`,
    ).all();
  }
}
