import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../common/domain-error.js';
import { GATEWAY_ADAPTER, type GatewayAdapter, GatewayTimeoutError } from './gateway.adapter.js';
import { PaymentsRepository } from './payments.repository.js';

export type CaptureResult = { status: 'CAPTURED'; gatewayRef: string } | { status: 'DECLINED'; code: string };
export type RefundOutcome = { ok: true; gatewayRef: string } | { ok: false; code: string };

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentsRepository,
    @Inject(GATEWAY_ADAPTER) private readonly gateway: GatewayAdapter,
  ) {}

  /**
   * Charge the customer for an order (PAY-2: safe to retry after a timeout).
   * A timeout leaves the payment PENDING and throws GATEWAY_TIMEOUT; calling
   * capture again reuses the same idempotency key.
   */
  async capture(args: { orderId: number; amountCents: number }): Promise<CaptureResult> {
    const captured = this.repository.findLatestByOrder(args.orderId, 'CAPTURED');
    if (captured?.gatewayRef) {
      return { status: 'CAPTURED', gatewayRef: captured.gatewayRef };
    }
    const key = `order-${args.orderId}-capture`;
    const pending = this.repository.findLatestByOrder(args.orderId, 'PENDING');
    const paymentId = pending?.id ?? this.repository.insert(args.orderId, args.amountCents, 'PENDING', key);

    let result;
    try {
      result = await this.gateway.charge({
        reference: `order-${args.orderId}`,
        amountCents: args.amountCents,
      });
    } catch (error) {
      if (error instanceof GatewayTimeoutError) {
        throw new DomainError('GATEWAY_TIMEOUT', 'Payment gateway timed out. Retry the payment.');
      }
      throw error;
    }
    if (result.ok) {
      this.repository.update(paymentId, 'CAPTURED', result.reference);
      return { status: 'CAPTURED', gatewayRef: result.reference };
    }
    this.repository.update(paymentId, 'FAILED', null);
    return { status: 'DECLINED', code: result.code };
  }

  /** Refund part or all of a captured payment back to the original method (REF-7). */
  async refund(args: { orderId: number; refundId: number; amountCents: number }): Promise<RefundOutcome> {
    const payment = this.repository.findLatestByOrder(args.orderId, 'CAPTURED');
    if (!payment?.gatewayRef) {
      throw new DomainError('CONFLICT', `Order ${args.orderId} has no captured payment to refund`);
    }
    const result = await this.gateway.refund({
      chargeReference: payment.gatewayRef,
      amountCents: args.amountCents,
      idempotencyKey: `refund-${args.refundId}`,
    });
    return result.ok ? { ok: true, gatewayRef: result.reference } : { ok: false, code: result.code };
  }
}
