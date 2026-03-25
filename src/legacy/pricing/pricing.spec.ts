import { priceOrder } from './pricing.js';

describe('legacy pricing', () => {
  it('prices a single taxable line with free shipping', () => {
    const r = priceOrder([{ qty: 2, unit: 4500, taxCategory: 'GENERAL' }], 0);
    expect(r).toEqual({ subtotal: 9000, discount: 0, tax: 630, shipping: 0, total: 9630 });
  });

  it('charges flat shipping below the free-shipping threshold', () => {
    const r = priceOrder([{ qty: 1, unit: 1800, taxCategory: 'EXEMPT' }], 0);
    expect(r).toEqual({ subtotal: 1800, discount: 0, tax: 0, shipping: 799, total: 2599 });
  });

  it('applies a percentage promo to the subtotal and the taxable amount', () => {
    const r = priceOrder([{ qty: 2, unit: 4500, taxCategory: 'GENERAL' }], 10);
    expect(r).toEqual({ subtotal: 9000, discount: 900, tax: 567, shipping: 0, total: 8667 });
  });

  it('uses each category rate on a mixed cart', () => {
    const r = priceOrder(
      [
        { qty: 1, unit: 18900, taxCategory: 'GENERAL' },
        { qty: 2, unit: 1050, taxCategory: 'APPAREL' },
      ],
      0,
    );
    expect(r.tax).toBe(1428);
    expect(r.total).toBe(22428);
  });
});
