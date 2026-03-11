import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import type { OrderStatus } from './order-state.js';

export interface OrderRecord {
  id: number;
  customerId: string;
  status: OrderStatus;
  promoCode: string | null;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  paidCents: number;
  refundedCents: number;
  placedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface OrderItemRecord {
  id: number;
  orderId: number;
  sku: string;
  qty: number;
  unitPriceCents: number;
  promoCode: string | null;
  taxCategory: string;
}

export interface Totals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

interface OrderRow {
  id: number;
  customer_id: string;
  status: OrderStatus;
  promo_code: string | null;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  paid_cents: number;
  refunded_cents: number;
  placed_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface ItemRow {
  id: number;
  order_id: number;
  sku: string;
  qty: number;
  unit_price_cents: number;
  promo_code: string | null;
  tax_category: string;
}

const toOrder = (r: OrderRow): OrderRecord => ({
  id: r.id,
  customerId: r.customer_id,
  status: r.status,
  promoCode: r.promo_code,
  subtotalCents: r.subtotal_cents,
  discountCents: r.discount_cents,
  taxCents: r.tax_cents,
  shippingCents: r.shipping_cents,
  totalCents: r.total_cents,
  paidCents: r.paid_cents,
  refundedCents: r.refunded_cents,
  placedAt: r.placed_at,
  deliveredAt: r.delivered_at,
  createdAt: r.created_at,
});

const toItem = (r: ItemRow): OrderItemRecord => ({
  id: r.id,
  orderId: r.order_id,
  sku: r.sku,
  qty: r.qty,
  unitPriceCents: r.unit_price_cents,
  promoCode: r.promo_code,
  taxCategory: r.tax_category,
});

@Injectable()
export class OrdersRepository {
  constructor(private readonly database: DatabaseService) {}

  insert(customerId: string, promoCode: string | null, createdAt: string): number {
    const result = this.database.db
      .prepare("INSERT INTO orders (customer_id, status, promo_code, created_at) VALUES (?, 'DRAFT', ?, ?)")
      .run(customerId, promoCode, createdAt);
    return Number(result.lastInsertRowid);
  }

  insertItem(orderId: number, sku: string, qty: number, unitPriceCents: number, promoCode: string | null): void {
    this.database.db
      .prepare('INSERT INTO order_items (order_id, sku, qty, unit_price_cents, promo_code) VALUES (?, ?, ?, ?, ?)')
      .run(orderId, sku, qty, unitPriceCents, promoCode);
  }

  findById(id: number): OrderRecord | undefined {
    const row = this.database.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow | undefined;
    return row && toOrder(row);
  }

  findItems(orderId: number): OrderItemRecord[] {
    const rows = this.database.db
      .prepare(
        `SELECT i.*, p.tax_category FROM order_items i JOIN products p ON p.sku = i.sku
         WHERE i.order_id = ? ORDER BY i.id`,
      )
      .all(orderId) as ItemRow[];
    return rows.map(toItem);
  }

  list(customerId?: string): OrderRecord[] {
    const rows = (
      customerId
        ? this.database.db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY id').all(customerId)
        : this.database.db.prepare('SELECT * FROM orders ORDER BY id').all()
    ) as OrderRow[];
    return rows.map(toOrder);
  }

  setStatus(id: number, status: OrderStatus): void {
    this.database.db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  }

  setTotals(id: number, t: Totals): void {
    this.database.db
      .prepare(
        `UPDATE orders SET subtotal_cents = ?, discount_cents = ?, tax_cents = ?,
         shipping_cents = ?, total_cents = ? WHERE id = ?`,
      )
      .run(t.subtotalCents, t.discountCents, t.taxCents, t.shippingCents, t.totalCents, id);
  }

  markPlaced(id: number, placedAt: string): void {
    this.database.db.prepare("UPDATE orders SET status = 'PLACED', placed_at = ? WHERE id = ?").run(placedAt, id);
  }

  markPaid(id: number, paidCents: number): void {
    this.database.db.prepare("UPDATE orders SET status = 'PAID', paid_cents = ? WHERE id = ?").run(paidCents, id);
  }

  markDelivered(id: number, deliveredAt: string): void {
    this.database.db
      .prepare("UPDATE orders SET status = 'DELIVERED', delivered_at = ? WHERE id = ?")
      .run(deliveredAt, id);
  }

  addRefunded(id: number, cents: number): void {
    this.database.db.prepare('UPDATE orders SET refunded_cents = refunded_cents + ? WHERE id = ?').run(cents, id);
  }
}
