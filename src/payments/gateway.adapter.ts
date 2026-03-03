/** DI token for the payment gateway implementation. */
export const GATEWAY_ADAPTER = Symbol('GATEWAY_ADAPTER');

export type GatewayResult = { ok: true; reference: string } | { ok: false; code: string };

export interface ChargeRequest {
  /** Our own reference, e.g. "order-42". */
  reference: string;
  amountCents: number;
  /** Same key on a retry returns the original outcome instead of charging twice. */
  idempotencyKey?: string;
}

export interface GatewayRefundRequest {
  /** Gateway reference of the original charge. */
  chargeReference: string;
  amountCents: number;
  idempotencyKey?: string;
}

export interface GatewayAdapter {
  charge(request: ChargeRequest): Promise<GatewayResult>;
  refund(request: GatewayRefundRequest): Promise<GatewayResult>;
}

/** The gateway did not answer in time. The charge may or may not have happened. */
export class GatewayTimeoutError extends Error {
  constructor() {
    super('Payment gateway timed out');
    this.name = 'GatewayTimeoutError';
  }
}
