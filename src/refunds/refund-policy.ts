import { DomainError } from '../common/domain-error.js';
import { percentOf } from '../common/money.js';

export const RETURN_WINDOW_DAYS = 30; // REF-1
export const DEFECT_WINDOW_DAYS = 90; // REF-2
export const RESTOCKING_FEE_PERCENT = 15; // REF-3
export const AUTO_APPROVE_LIMIT_CENTS = 5000; // REF-6
export const SUPPORT_APPROVAL_LIMIT_CENTS = 25000; // REF-6

export const REFUND_REASONS = ['UNOPENED_RETURN', 'OPENED_RETURN', 'DEFECTIVE'] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export interface PolicyItem {
  id: number;
  qty: number;
  unitPriceCents: number;
}

export interface PolicyLine {
  orderItemId: number;
  qty: number;
}

export interface PolicyInput {
  shippingCents: number;
  items: PolicyItem[];
  lines: PolicyLine[];
  reason: RefundReason;
  /** Units already refunded (or committed) per order item. */
  alreadyRefundedQty: Map<number, number>;
}

export interface PolicyResult {
  lineAmounts: { orderItemId: number; qty: number; amountCents: number }[];
  itemsCents: number;
  restockingFeeCents: number;
  shippingCents: number;
  amountCents: number;
}

export type Approver = 'system' | 'support' | 'admin';

export function daysSince(isoTimestamp: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(isoTimestamp)) / 86_400_000);
}

export function isWithinWindow(reason: RefundReason, placedAt: string, now: Date): boolean {
  const limit = reason === 'DEFECTIVE' ? DEFECT_WINDOW_DAYS : RETURN_WINDOW_DAYS;
  return daysSince(placedAt, now) <= limit;
}

/** Who may approve a refund of this size (REF-6). */
export function requiredApprover(amountCents: number): Approver {
  if (amountCents <= AUTO_APPROVE_LIMIT_CENTS) return 'system';
  if (amountCents <= SUPPORT_APPROVAL_LIMIT_CENTS) return 'support';
  return 'admin';
}

export function computeRefund(input: PolicyInput): PolicyResult {
  const byId = new Map(input.items.map((i) => [i.id, i]));
  const requested = new Map<number, number>();
  const lineAmounts = input.lines.map((line) => {
    const item = byId.get(line.orderItemId);
    if (!item) {
      throw new DomainError('RULE_VIOLATION', `Order item ${line.orderItemId} is not part of this order`);
    }
    if (requested.has(item.id)) {
      throw new DomainError('RULE_VIOLATION', `Order item ${item.id} appears twice in the request`);
    }
    const remaining = item.qty - (input.alreadyRefundedQty.get(item.id) ?? 0);
    if (line.qty > remaining) {
      throw new DomainError('RULE_VIOLATION', `Only ${remaining} unit(s) of order item ${item.id} remain refundable`);
    }
    requested.set(item.id, line.qty);
    return { orderItemId: item.id, qty: line.qty, amountCents: line.qty * item.unitPriceCents };
  });

  const itemsCents = lineAmounts.reduce((sum, l) => sum + l.amountCents, 0);
  const restockingFeeCents = input.reason === 'OPENED_RETURN' ? percentOf(itemsCents, RESTOCKING_FEE_PERCENT) : 0;

  // REF-5: shipping comes back when the whole order is refunded in one go.
  const wholeOrder =
    input.alreadyRefundedQty.size === 0 && input.items.every((i) => requested.get(i.id) === i.qty);
  const shippingCents = wholeOrder ? input.shippingCents : 0;

  return {
    lineAmounts,
    itemsCents,
    restockingFeeCents,
    shippingCents,
    amountCents: itemsCents - restockingFeeCents + shippingCents,
  };
}
