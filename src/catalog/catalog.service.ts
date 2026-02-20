import { Injectable } from '@nestjs/common';
import { DomainError } from '../common/domain-error.js';
import { CatalogRepository, type Product } from './catalog.repository.js';

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  list(): Product[] {
    return this.repository.findAll();
  }

  get(sku: string): Product {
    const product = this.repository.findBySku(sku);
    if (!product) {
      throw new DomainError('NOT_FOUND', `Unknown product '${sku}'`);
    }
    return product;
  }

  /** Percent off for a promo code. Unknown codes are a rule violation, not a 404. */
  promoPercent(code: string): number {
    const percent = this.repository.findPromoPercent(code);
    if (percent === undefined) {
      throw new DomainError('RULE_VIOLATION', `Unknown promo code '${code}'`);
    }
    return percent;
  }
}
