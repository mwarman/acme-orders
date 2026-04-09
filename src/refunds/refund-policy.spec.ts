import { computeRefund, isWithinWindow, requiredApprover } from './refund-policy.js';

const NOW = new Date('2026-04-01T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const items = [
  { id: 1, qty: 2, unitPriceCents: 4500 },
  { id: 2, qty: 1, unitPriceCents: 1000 },
];

describe('refund window', () => {
  it('allows a return shortly after purchase', () => {
    expect(isWithinWindow('UNOPENED_RETURN', daysAgo(10), NOW)).toBe(true);
  });

  it('rejects a return well past 30 days', () => {
    expect(isWithinWindow('UNOPENED_RETURN', daysAgo(45), NOW)).toBe(false);
  });

  it('gives defective items the longer window', () => {
    expect(isWithinWindow('DEFECTIVE', daysAgo(45), NOW)).toBe(true);
    expect(isWithinWindow('DEFECTIVE', daysAgo(120), NOW)).toBe(false);
  });
});

describe('computeRefund', () => {
  const base = { shippingCents: 799, items, alreadyRefundedQty: new Map<number, number>() };

  it('refunds list price for the requested quantity', () => {
    const r = computeRefund({ ...base, reason: 'UNOPENED_RETURN', lines: [{ orderItemId: 1, qty: 1 }] });
    expect(r.amountCents).toBe(4500);
    expect(r.shippingCents).toBe(0);
  });

  it('takes a 15% restocking fee on opened returns', () => {
    const r = computeRefund({ ...base, reason: 'OPENED_RETURN', lines: [{ orderItemId: 1, qty: 1 }] });
    expect(r.restockingFeeCents).toBe(675);
    expect(r.amountCents).toBe(3825);
  });

  it('refunds shipping when the whole order comes back', () => {
    const r = computeRefund({
      ...base,
      reason: 'UNOPENED_RETURN',
      lines: [
        { orderItemId: 1, qty: 2 },
        { orderItemId: 2, qty: 1 },
      ],
    });
    expect(r.shippingCents).toBe(799);
    expect(r.amountCents).toBe(10799); // 9000 + 1000 items + 799 shipping
  });

  it('rejects quantities beyond what remains refundable', () => {
    expect(() =>
      computeRefund({ ...base, reason: 'UNOPENED_RETURN', lines: [{ orderItemId: 1, qty: 3 }] }),
    ).toThrowError(/remain refundable/);
  });

  it('rejects items that are not on the order', () => {
    expect(() =>
      computeRefund({ ...base, reason: 'UNOPENED_RETURN', lines: [{ orderItemId: 99, qty: 1 }] }),
    ).toThrowError(/not part of this order/);
  });
});

describe('requiredApprover', () => {
  it('auto-approves small refunds, then escalates', () => {
    expect(requiredApprover(2000)).toBe('system');
    expect(requiredApprover(5000)).toBe('system');
    expect(requiredApprover(12000)).toBe('support');
    expect(requiredApprover(25000)).toBe('support');
    expect(requiredApprover(40000)).toBe('admin');
  });
});
