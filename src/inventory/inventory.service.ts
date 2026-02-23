import { Injectable } from '@nestjs/common';
import { DomainError } from '../common/domain-error.js';
import { InventoryRepository, type StockLevel } from './inventory.repository.js';

export interface StockLine {
  sku: string;
  qty: number;
}

/**
 * Multi-line operations are all-or-nothing only when the caller wraps them in
 * a DatabaseService.transaction (OrdersService does).
 */
@Injectable()
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  get(sku: string): StockLevel {
    const level = this.repository.find(sku);
    if (!level) {
      throw new DomainError('NOT_FOUND', `No stock record for '${sku}'`);
    }
    return level;
  }

  reserveAll(lines: StockLine[]): void {
    for (const { sku, qty } of lines) {
      if (!this.repository.reserve(sku, qty)) {
        throw new DomainError('CONFLICT', `Insufficient stock for '${sku}'`);
      }
    }
  }

  releaseAll(lines: StockLine[]): void {
    for (const { sku, qty } of lines) {
      if (!this.repository.release(sku, qty)) {
        throw new DomainError('CONFLICT', `Cannot release ${qty} of '${sku}': not reserved`);
      }
    }
  }

  commitAll(lines: StockLine[]): void {
    for (const { sku, qty } of lines) {
      if (!this.repository.commit(sku, qty)) {
        throw new DomainError('CONFLICT', `Cannot ship ${qty} of '${sku}': not reserved`);
      }
    }
  }

  /** Returned goods go back on the shelf (REF-9). */
  restock(sku: string, qty: number): void {
    this.adjust(sku, qty);
  }

  adjust(sku: string, delta: number): StockLevel {
    this.get(sku);
    if (!this.repository.adjustOnHand(sku, delta)) {
      throw new DomainError('RULE_VIOLATION', `Adjustment would drop on-hand below reserved for '${sku}'`);
    }
    return this.get(sku);
  }
}
