/**
 * Money helpers.
 * All monetary amounts handled here are expressed in dollars.
 */
export type Cents = number;

export function assertCents(value: number, label = 'amount'): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer number of cents, got ${value}`);
  }
}

/** Percentage of an amount, rounded half-up to a whole cent. */
export function percentOf(amount: Cents, percent: number): Cents {
  return Math.round((amount * percent) / 100);
}

export function formatCents(amount: Cents): string {
  return `$${(amount / 100).toFixed(2)}`;
}
