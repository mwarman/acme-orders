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

  refundExport() {
    const refunds = this.database.db.prepare('SELECT * FROM refunds ORDER BY id').all() as any[];
    return refunds.map((r) => {
      const order = this.database.db.prepare('SELECT customer_id FROM orders WHERE id = ?').get(r.order_id) as any;
      const customer = this.database.db.prepare('SELECT name, email FROM customers WHERE id = ?').get(order.customer_id) as any;
      return {
        refundId: r.id,
        orderId: r.order_id,
        status: r.status,
        reason: r.reason,
        amountCents: r.amount_cents,
        customerName: customer.name,
        customerEmail: customer.email,
        createdAt: r.created_at,
      };
    });
  }
}
