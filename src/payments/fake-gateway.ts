import { Injectable } from '@nestjs/common';
import {
  type ChargeRequest,
  type GatewayAdapter,
  type GatewayRefundRequest,
  type GatewayResult,
  GatewayTimeoutError,
} from './gateway.adapter.js';

export type FakeGatewayMode = 'normal' | 'timeout-once';

/**
 * Deterministic stand-in for a real gateway (PAY-1).
 *  - A charge whose amount ends in 13 cents is declined.
 *  - A refund whose amount ends in 13 cents fails on its first attempt per
 *    idempotency key and succeeds on retry.
 *  - Mode "timeout-once": the first charge for each reference is recorded and
 *    then times out, as a real network failure would after the bank said yes.
 * A real adapter would authenticate with GATEWAY_API_KEY.
 */
@Injectable()
export class FakeGateway implements GatewayAdapter {
  /** Every successful charge, for tests to inspect (e.g. double-charge checks). */
  readonly chargeLog: { reference: string; amountCents: number; idempotencyKey?: string }[] = [];

  private mode: FakeGatewayMode = process.env.FAKE_GATEWAY_MODE === 'timeout-once' ? 'timeout-once' : 'normal';
  private readonly results = new Map<string, GatewayResult>();
  private readonly timedOut = new Set<string>();
  private readonly refundAttempts = new Map<string, number>();
  private sequence = 0;
  private refundFailureArmed = false;

  setMode(mode: FakeGatewayMode): void {
    this.mode = mode;
  }

  async charge(request: ChargeRequest): Promise<GatewayResult> {
    const cached = request.idempotencyKey ? this.results.get(request.idempotencyKey) : undefined;
    let result: GatewayResult;
    if (cached) {
      result = cached;
    } else {
      result =
        request.amountCents % 100 === 13
          ? { ok: false, code: 'DECLINED' }
          : { ok: true, reference: `gw_ch_${++this.sequence}` };
      if (result.ok) {
        this.chargeLog.push({
          reference: request.reference,
          amountCents: request.amountCents,
          idempotencyKey: request.idempotencyKey,
        });
      }
      if (request.idempotencyKey) {
        this.results.set(request.idempotencyKey, result);
      }
    }
    if (this.mode === 'timeout-once' && !this.timedOut.has(request.reference)) {
      this.timedOut.add(request.reference);
      throw new GatewayTimeoutError();
    }
    return result;
  }

  /** Test hook: the next refund call is declined once, whatever the amount. */
  failNextRefund(): void {
    this.refundFailureArmed = true;
  }

  async refund(request: GatewayRefundRequest): Promise<GatewayResult> {
    if (this.refundFailureArmed) {
      this.refundFailureArmed = false;
      return { ok: false, code: 'REFUND_DECLINED' };
    }
    const key = request.idempotencyKey ?? `anon-${++this.sequence}`;
    const cached = this.results.get(`refund:${key}`);
    if (cached?.ok) {
      return cached;
    }
    const attempt = this.refundAttempts.get(key) ?? 0;
    this.refundAttempts.set(key, attempt + 1);
    if (request.amountCents % 100 === 13 && attempt === 0) {
      return { ok: false, code: 'REFUND_DECLINED' };
    }
    const result: GatewayResult = { ok: true, reference: `gw_rf_${++this.sequence}` };
    this.results.set(`refund:${key}`, result);
    return result;
  }
}
