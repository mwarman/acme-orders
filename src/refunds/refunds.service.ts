import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock.js';
import { DomainError } from '../common/domain-error.js';
import type { User } from '../common/identity.middleware.js';
import { DatabaseService } from '../db/database.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { OutboxRepository } from '../notifications/outbox.repository.js';
import { isShipped } from '../orders/order-state.js';
import { OrdersService } from '../orders/orders.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { CreateRefundDto } from './dto/create-refund.dto.js';
import { computeRefund, isWithinWindow, requiredApprover } from './refund-policy.js';
import { type RefundLineRecord, type RefundRecord, RefundsRepository } from './refunds.repository.js';

export interface RefundView extends RefundRecord {
  lines: RefundLineRecord[];
}

@Injectable()
export class RefundsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly refunds: RefundsRepository,
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
    private readonly inventory: InventoryService,
    private readonly outbox: OutboxRepository,
    private readonly clock: Clock,
  ) {}

  async create(dto: CreateRefundDto, user: User): Promise<RefundView> {
    const order = this.orders.findOrThrow(dto.orderId);
    this.orders.assertAccess(order, user);
    if (!isShipped(order.status)) {
      throw new DomainError('RULE_VIOLATION', 'Only shipped orders can be refunded. Cancel unshipped orders instead.');
    }
    if (!order.placedAt || !isWithinWindow(dto.reason, order.placedAt, this.clock.now())) {
      throw new DomainError('RULE_VIOLATION', 'The order is outside the refund window for this reason');
    }

    const committed = this.refunds.committedTotals(order.id);
    const result = computeRefund({
      shippingCents: order.shippingCents,
      items: this.orders.findItems(order.id),
      lines: dto.lines,
      reason: dto.reason,
      alreadyRefundedQty: committed.qtyByItem,
    });
    if (committed.amountCents + result.amountCents > order.paidCents) {
      throw new DomainError('RULE_VIOLATION', 'Total refunds would exceed the amount paid for this order');
    }

    const returnToStock = new Map(dto.lines.map((l) => [l.orderItemId, l.returnToStock === true]));
    const auto = requiredApprover(result.amountCents) === 'system';
    const id = this.database.transaction(() => {
      const refundId = this.refunds.insert(
        {
          orderId: order.id,
          status: auto ? 'APPROVED' : 'REQUESTED',
          reason: dto.reason,
          amountCents: result.amountCents,
          shippingCents: result.shippingCents,
          feeCents: result.restockingFeeCents,
          requestedBy: user.id,
          approvedBy: auto ? 'system' : null,
          notes: dto.notes ?? null,
        },
        result.lineAmounts.map((l) => ({ ...l, returnToStock: returnToStock.get(l.orderItemId) ?? false })),
      );
      if (auto) {
        this.outbox.add('refund.approved', { refundId, orderId: order.id, amountCents: result.amountCents });
      }
      return refundId;
    });
    return auto ? this.process(id) : this.view(id);
  }

  getForUser(id: number, user: User): RefundView {
    const refund = this.findOrThrow(id);
    this.orders.assertAccess(this.orders.findOrThrow(refund.orderId), user);
    return this.view(id);
  }

  listForOrder(orderId: number, user: User): RefundRecord[] {
    this.orders.assertAccess(this.orders.findOrThrow(orderId), user);
    return this.refunds.listByOrder(orderId);
  }

  async approve(id: number, user: User): Promise<RefundView> {
    const refund = this.findOrThrow(id);
    if (refund.status !== 'REQUESTED') {
      throw new DomainError('CONFLICT', `Refund ${id} is ${refund.status}, not REQUESTED`);
    }
    if (requiredApprover(refund.amountCents) === 'admin' && user.role !== 'admin') {
      throw new DomainError('FORBIDDEN', 'Refunds above the support limit need an admin');
    }
    this.database.transaction(() => {
      this.refunds.setApproved(id, user.id);
      this.outbox.add('refund.approved', { refundId: id, orderId: refund.orderId, amountCents: refund.amountCents });
    });
    return this.process(id);
  }

  reject(id: number): RefundView {
    const refund = this.findOrThrow(id);
    if (refund.status !== 'REQUESTED') {
      throw new DomainError('CONFLICT', `Refund ${id} is ${refund.status}, not REQUESTED`);
    }
    this.refunds.setStatus(id, 'REJECTED');
    return this.view(id);
  }

  /** REF-7: a FAILED refund may be retried. */
  async retry(id: number): Promise<RefundView> {
    const refund = this.findOrThrow(id);
    if (refund.status !== 'FAILED') {
      throw new DomainError('CONFLICT', `Refund ${id} is ${refund.status}, not FAILED`);
    }
    this.refunds.setStatus(id, 'APPROVED');
    return this.process(id);
  }

  /** ORD-4: cancelling a PAID order refunds everything that was paid. */
  async cancelPaidOrder(orderId: number, user: User): Promise<RefundView> {
    const order = this.orders.findOrThrow(orderId);
    this.orders.assertAccess(order, user);
    if (order.status !== 'PAID') {
      throw new DomainError('CONFLICT', `Order ${orderId} is ${order.status}, not PAID`);
    }
    const refundId = this.database.transaction(() => {
      this.orders.cancelPaid(orderId);
      const id = this.refunds.insert(
        {
          orderId,
          status: 'APPROVED',
          reason: 'ORDER_CANCELLED',
          amountCents: order.paidCents,
          shippingCents: order.shippingCents,
          feeCents: 0,
          requestedBy: user.id,
          approvedBy: 'system',
          notes: null,
        },
        [],
      );
      this.outbox.add('refund.approved', { refundId: id, orderId, amountCents: order.paidCents });
      return id;
    });
    return this.process(refundId);
  }

  // ---- internals ----------------------------------------------------------------------------

  /** Send an APPROVED refund to the gateway and record the outcome. */
  private async process(id: number): Promise<RefundView> {
    const refund = this.findOrThrow(id);
    const outcome = await this.payments.refund({
      orderId: refund.orderId,
      refundId: id,
      amountCents: refund.amountCents,
    });
    if (!outcome.ok) {
      this.database.transaction(() => {
        this.refunds.setStatus(id, 'FAILED');
        this.outbox.add('refund.failed', { refundId: id, orderId: refund.orderId, code: outcome.code });
      });
      return this.view(id);
    }
    const items = new Map(this.orders.findItems(refund.orderId).map((i) => [i.id, i]));
    this.database.transaction(() => {
      this.refunds.setStatus(id, 'COMPLETED', outcome.gatewayRef);
      this.orders.recordRefunded(refund.orderId, refund.amountCents);
      for (const line of this.refunds.findLines(id)) {
        const item = items.get(line.orderItemId);
        if (line.returnToStock && item) {
          this.inventory.restock(item.sku, line.qty);
        }
      }
    });
    return this.view(id);
  }

  private findOrThrow(id: number): RefundRecord {
    const refund = this.refunds.findById(id);
    if (!refund) {
      throw new DomainError('NOT_FOUND', `Refund ${id} not found`);
    }
    return refund;
  }

  private view(id: number): RefundView {
    return { ...this.findOrThrow(id), lines: this.refunds.findLines(id) };
  }
}
