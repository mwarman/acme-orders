import { DomainError } from '../common/domain-error.js';

export const ORDER_STATUSES = [
  'DRAFT',
  'PLACED',
  'PAID',
  'FULFILLED',
  'DELIVERED',
  'CLOSED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  DRAFT: ['PLACED', 'CANCELLED'],
  PLACED: ['PAID', 'CANCELLED'],
  PAID: ['FULFILLED', 'CANCELLED'],
  FULFILLED: ['DELIVERED'],
  DELIVERED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new DomainError('CONFLICT', `Order cannot move from ${from} to ${to}`);
  }
}

/** True once goods have left the warehouse. */
export function isShipped(status: OrderStatus): boolean {
  return status === 'FULFILLED' || status === 'DELIVERED' || status === 'CLOSED';
}
