import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock.js';
import { DatabaseService } from '../db/database.service.js';

export type PaymentStatus = 'PENDING' | 'CAPTURED' | 'FAILED';

export interface Payment {
  id: number;
  orderId: number;
  amountCents: number;
  gatewayRef: string | null;
  status: PaymentStatus;
  idempotencyKey: string | null;
}

interface PaymentRow {
  id: number;
  order_id: number;
  amount_cents: number;
  gateway_ref: string | null;
  status: PaymentStatus;
  idempotency_key: string | null;
}

const toPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  orderId: r.order_id,
  amountCents: r.amount_cents,
  gatewayRef: r.gateway_ref,
  status: r.status,
  idempotencyKey: r.idempotency_key,
});

@Injectable()
export class PaymentsRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly clock: Clock,
  ) {}

  insert(orderId: number, amountCents: number, status: PaymentStatus, idempotencyKey: string): number {
    const result = this.database.db
      .prepare(
        'INSERT INTO payments (order_id, amount_cents, status, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(orderId, amountCents, status, idempotencyKey, this.clock.now().toISOString());
    return Number(result.lastInsertRowid);
  }

  update(id: number, status: PaymentStatus, gatewayRef: string | null): void {
    this.database.db.prepare('UPDATE payments SET status = ?, gateway_ref = ? WHERE id = ?').run(status, gatewayRef, id);
  }

  findLatestByOrder(orderId: number, status: PaymentStatus): Payment | undefined {
    const row = this.database.db
      .prepare('SELECT * FROM payments WHERE order_id = ? AND status = ? ORDER BY id DESC LIMIT 1')
      .get(orderId, status) as PaymentRow | undefined;
    return row && toPayment(row);
  }

  listByOrder(orderId: number): Payment[] {
    const rows = this.database.db
      .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY id')
      .all(orderId) as PaymentRow[];
    return rows.map(toPayment);
  }
}
