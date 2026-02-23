import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';

export interface StockLevel {
  sku: string;
  onHand: number;
  reserved: number;
  available: number;
}

interface StockRow {
  sku: string;
  on_hand: number;
  reserved: number;
}

@Injectable()
export class InventoryRepository {
  constructor(private readonly database: DatabaseService) {}

  find(sku: string): StockLevel | undefined {
    const row = this.database.db
      .prepare('SELECT sku, on_hand, reserved FROM stock_items WHERE sku = ?')
      .get(sku) as StockRow | undefined;
    return row && { sku: row.sku, onHand: row.on_hand, reserved: row.reserved, available: row.on_hand - row.reserved };
  }

  /** True when the reservation fit. Conditional UPDATE keeps available >= 0 (INV-1). */
  reserve(sku: string, qty: number): boolean {
    const result = this.database.db
      .prepare('UPDATE stock_items SET reserved = reserved + ? WHERE sku = ? AND on_hand - reserved >= ?')
      .run(qty, sku, qty);
    return result.changes === 1;
  }

  release(sku: string, qty: number): boolean {
    const result = this.database.db
      .prepare('UPDATE stock_items SET reserved = reserved - ? WHERE sku = ? AND reserved >= ?')
      .run(qty, sku, qty);
    return result.changes === 1;
  }

  /** Shipping: stock leaves the building, so on-hand and reserved both drop. */
  commit(sku: string, qty: number): boolean {
    const result = this.database.db
      .prepare(
        'UPDATE stock_items SET on_hand = on_hand - ?, reserved = reserved - ? WHERE sku = ? AND reserved >= ?',
      )
      .run(qty, qty, sku, qty);
    return result.changes === 1;
  }

  /** Adds (or removes, if negative) on-hand units. Cannot drop below what is reserved. */
  adjustOnHand(sku: string, delta: number): boolean {
    const result = this.database.db
      .prepare('UPDATE stock_items SET on_hand = on_hand + ? WHERE sku = ? AND on_hand + ? >= reserved')
      .run(delta, sku, delta);
    return result.changes === 1;
  }
}
