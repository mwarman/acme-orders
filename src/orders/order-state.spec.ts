import { assertTransition, canTransition, isShipped, ORDER_STATUSES } from './order-state.js';

describe('order state machine', () => {
  it('allows the happy path', () => {
    const path = ['DRAFT', 'PLACED', 'PAID', 'FULFILLED', 'DELIVERED', 'CLOSED'] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it('allows cancelling before shipment only', () => {
    expect(canTransition('DRAFT', 'CANCELLED')).toBe(true);
    expect(canTransition('PLACED', 'CANCELLED')).toBe(true);
    expect(canTransition('PAID', 'CANCELLED')).toBe(true);
    expect(canTransition('FULFILLED', 'CANCELLED')).toBe(false);
  });

  it('treats CLOSED and CANCELLED as terminal', () => {
    for (const to of ORDER_STATUSES) {
      expect(canTransition('CLOSED', to)).toBe(false);
      expect(canTransition('CANCELLED', to)).toBe(false);
    }
  });

  it('rejects skipping steps with a CONFLICT', () => {
    expect(() => assertTransition('DRAFT', 'PAID')).toThrowError(/cannot move from DRAFT to PAID/);
  });

  it('knows which statuses have shipped', () => {
    expect(isShipped('PAID')).toBe(false);
    expect(isShipped('FULFILLED')).toBe(true);
    expect(isShipped('CLOSED')).toBe(true);
  });

  it('treats DELIVERED as terminal', () => {
    expect(canTransition('DELIVERED', 'CLOSED')).toBe(false);
  });
});
