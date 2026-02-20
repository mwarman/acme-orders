import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';

export interface Product {
  sku: string;
  name: string;
  unitPriceCents: number;
  taxCategory: string;
}

interface ProductRow {
  sku: string;
  name: string;
  unit_price_cents: number;
  tax_category: string;
}

const toProduct = (r: ProductRow): Product => ({
  sku: r.sku,
  name: r.name,
  unitPriceCents: r.unit_price_cents,
  taxCategory: r.tax_category,
});

@Injectable()
export class CatalogRepository {
  constructor(private readonly database: DatabaseService) {}

  findAll(): Product[] {
    const rows = this.database.db.prepare('SELECT * FROM products ORDER BY sku').all() as ProductRow[];
    return rows.map(toProduct);
  }

  findBySku(sku: string): Product | undefined {
    const row = this.database.db.prepare('SELECT * FROM products WHERE sku = ?').get(sku) as
      | ProductRow
      | undefined;
    return row && toProduct(row);
  }

  findPromoPercent(code: string): number | undefined {
    const row = this.database.db.prepare('SELECT percent FROM promo_codes WHERE code = ?').get(code) as
      | { percent: number }
      | undefined;
    return row?.percent;
  }
}
