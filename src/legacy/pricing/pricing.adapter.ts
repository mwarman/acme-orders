import { Injectable } from '@nestjs/common';
import { priceOrder } from './pricing.js';

export interface PricingLine {
  sku: string;
  qty: number;
  unitPriceCents: number;
  taxCategory: string;
}

export interface PricingResult {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

/** The only Nest-aware file in legacy/pricing: a typed wrapper around the old functions. */
@Injectable()
export class PricingAdapter {
  price(lines: PricingLine[], promoPercent: number): PricingResult {
    const r = priceOrder(
      lines.map((l) => ({ qty: l.qty, unit: l.unitPriceCents, taxCategory: l.taxCategory })),
      promoPercent,
    );
    return {
      subtotalCents: r.subtotal,
      discountCents: r.discount,
      taxCents: r.tax,
      shippingCents: r.shipping,
      totalCents: r.total,
    };
  }
}
