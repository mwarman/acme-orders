// Legacy pricing, ported from the old storefront. Not idiomatic Nest on purpose:
// plain functions, loose types, float math. Callers should go through pricing.adapter.ts.
import { FLAT_SHIPPING, FREE_SHIPPING_THRESHOLD, taxTable } from './tax-table.js';

export const USE_DISCOUNT_V2 = true;

/** @deprecated v1 discount rule (floor per line). Kept in case finance asks for it again. */
export function discountV1(lines: any[], pct: any): any {
  var total = 0;
  for (var i = 0; i < lines.length; i++) {
    total += Math.floor((lines[i].qty * lines[i].unit * pct) / 100);
  }
  return total;
}

export function calcDiscount(lines: any[], subtotal: any, pct: any): any {
  if (!USE_DISCOUNT_V2) {
    return discountV1(lines, pct);
  }
  return Math.round((subtotal * pct) / 100);
}

export function calcTax(lines: any[], pct: any): any {
  var tax = 0;
  for (var i = 0; i < lines.length; i++) {
    var l = lines[i];
    var rate = taxTable[l.taxCategory];
    if (rate === undefined) rate = taxTable.GENERAL;
    var net = l.qty * l.unit * (1 - pct / 100);
    tax += Math.round(net * rate);
  }
  return tax;
}

export function calcShipping(subtotal: any): any {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
}

/** lines: [{ qty, unit, taxCategory }], pct: whole-number percent off. Returns cents. */
export function priceOrder(lines: any[], pct: any): any {
  var subtotal = 0;
  for (var i = 0; i < lines.length; i++) {
    subtotal += lines[i].qty * lines[i].unit;
  }
  var discount = calcDiscount(lines, subtotal, pct || 0);
  var tax = calcTax(lines, pct || 0);
  var shipping = calcShipping(subtotal);
  return {
    subtotal: subtotal,
    discount: discount,
    tax: tax,
    shipping: shipping,
    total: subtotal - discount + tax + shipping,
  };
}
