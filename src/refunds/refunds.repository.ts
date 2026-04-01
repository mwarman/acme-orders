import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock.js';
import { DatabaseService } from '../db/database.service.js';

export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'COMPLETED' | 'FAILED' | 'REJECTED';

export interface RefundRecord {
  id: number;
  orderId: number;
  status: RefundStatus;
  reason: string;
  amountCents: number;
  shippingCents: number;
  feeCents: number;
  requestedBy: string;
  approvedBy: string | null;
  gatewayRef: string | null;
  notes: string | null;
  createdAt: string;
}

export interface RefundLineRecord {
  id: number;
  refundId: number;
  orderItemId: number;
  qty: number;
  amountCents: number;
  returnToStock: boolean;
}

export interface NewRefund {
  orderId: number;
  status: RefundStatus;
  reason: string;
  amountCents: number;
  shippingCents: number;
  feeCents: number;
  requestedBy: string;
  approvedBy: string | null;
  notes: string | null;
}

export interface NewRefundLine {
  orderItemId: number;
  qty: number;
  amountCents: number;
  returnToStock: boolean;
}

interface RefundRow {
  id: number;
  order_id: number;
  status: RefundStatus;
  reason: string;
  amount_cents: number;
  shipping_cents: number;
  fee_cents: number;
  requested_by: string;
  approved_by: string | null;
  gateway_ref: string | null;
  notes: string | null;
  created_at: string;
}

interface LineRow {
  id: number;
  refund_id: number;
  order_item_id: number;
  qty: number;
  amount_cents: number;
  return_to_stock: number;
}

/** Statuses whose amounts count against what an order can still have refunded (REF-4). */
const COUNTED_STATUSES = "('REQUESTED', 'APPROVED', 'COMPLETED', 'FAILED')";

const toRefund = (r: RefundRow): RefundRecord => ({
  id: r.id,
  orderId: r.order_id,
  status: r.status,
  reason: r.reason,
  amountCents: r.amount_cents,
  shippingCents: r.shipping_cents,
  feeCents: r.fee_cents,
  requestedBy: r.requested_by,
  approvedBy: r.approved_by,
  gatewayRef: r.gateway_ref,
  notes: r.notes,
  createdAt: r.created_at,
});

@Injectable()
export class RefundsRepository {
  constructor(
    private readonly database: DatabaseService,
    private readonly clock: Clock,
  ) {}

  insert(refund: NewRefund, lines: NewRefundLine[]): number {
    const db = this.database.db;
    const result = db
      .prepare(
        `INSERT INTO refunds (order_id, status, reason, amount_cents, shipping_cents, fee_cents,
         requested_by, approved_by, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        refund.orderId,
        refund.status,
        refund.reason,
        refund.amountCents,
        refund.shippingCents,
        refund.feeCents,
        refund.requestedBy,
        refund.approvedBy,
        refund.notes,
        this.clock.now().toISOString(),
      );
    const id = Number(result.lastInsertRowid);
    const insertLine = db.prepare(
      'INSERT INTO refund_lines (refund_id, order_item_id, qty, amount_cents, return_to_stock) VALUES (?, ?, ?, ?, ?)',
    );
    for (const l of lines) {
      insertLine.run(id, l.orderItemId, l.qty, l.amountCents, l.returnToStock ? 1 : 0);
    }
    return id;
  }

  findById(id: number): RefundRecord | undefined {
    const row = this.database.db.prepare('SELECT * FROM refunds WHERE id = ?').get(id) as RefundRow | undefined;
    return row && toRefund(row);
  }

  listByOrder(orderId: number): RefundRecord[] {
    const rows = this.database.db
      .prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY id')
      .all(orderId) as RefundRow[];
    return rows.map(toRefund);
  }

  findLines(refundId: number): RefundLineRecord[] {
    const rows = this.database.db
      .prepare('SELECT * FROM refund_lines WHERE refund_id = ? ORDER BY id')
      .all(refundId) as LineRow[];
    return rows.map((r) => ({
      id: r.id,
      refundId: r.refund_id,
      orderItemId: r.order_item_id,
      qty: r.qty,
      amountCents: r.amount_cents,
      returnToStock: r.return_to_stock === 1,
    }));
  }

  /** Money and units already spoken for on an order. */
  committedTotals(orderId: number): { amountCents: number; qtyByItem: Map<number, number> } {
    const db = this.database.db;
    const amount = db
      .prepare(`SELECT COALESCE(SUM(amount_cents), 0) AS total FROM refunds WHERE order_id = ? AND status IN ${COUNTED_STATUSES}`)
      .get(orderId) as { total: number };
    const lines = db
      .prepare(
        `SELECT l.order_item_id AS item, SUM(l.qty) AS qty FROM refund_lines l
         JOIN refunds r ON r.id = l.refund_id
         WHERE r.order_id = ? AND r.status IN ${COUNTED_STATUSES} GROUP BY l.order_item_id`,
      )
      .all(orderId) as { item: number; qty: number }[];
    return { amountCents: amount.total, qtyByItem: new Map(lines.map((l) => [l.item, l.qty])) };
  }

  setApproved(id: number, approvedBy: string): void {
    this.database.db.prepare("UPDATE refunds SET status = 'APPROVED', approved_by = ? WHERE id = ?").run(approvedBy, id);
  }

  setStatus(id: number, status: RefundStatus, gatewayRef: string | null = null): void {
    this.database.db
      .prepare('UPDATE refunds SET status = ?, gateway_ref = COALESCE(?, gateway_ref) WHERE id = ?')
      .run(status, gatewayRef, id);
  }
}
