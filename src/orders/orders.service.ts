import { Injectable } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service.js';
import { Clock } from '../common/clock.js';
import { DomainError } from '../common/domain-error.js';
import { ROLE_NAMES, type User } from '../common/identity.middleware.js';
import { CustomersService } from '../customers/customers.service.js';
import { DatabaseService } from '../db/database.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { PricingAdapter } from '../legacy/pricing/pricing.adapter.js';
import { OutboxRepository } from '../notifications/outbox.repository.js';
import { PaymentsService } from '../payments/payments.service.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import { assertTransition, type OrderStatus } from './order-state.js';
import { type OrderItemRecord, type OrderRecord, OrdersRepository } from './orders.repository.js';

export interface OrderView extends OrderRecord {
  items: OrderItemRecord[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly orders: OrdersRepository,
    private readonly catalog: CatalogService,
    private readonly customers: CustomersService,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentsService,
    private readonly pricing: PricingAdapter,
    private readonly outbox: OutboxRepository,
    private readonly clock: Clock,
  ) {}

  // ---- authorization helpers ----------------------------------------------------------------

  canAccess(order: OrderRecord, user: User): boolean {
    return user.role !== 'customer' || order.customerId === user.id;
  }

  assertAccess(order: OrderRecord, user: User): void {
    if (!this.canAccess(order, user)) {
      throw new DomainError('FORBIDDEN', `Order ${order.id} belongs to another customer`);
    }
  }

  // ---- internal lookups (no authorization; callers decide) ------------------------------------

  findOrThrow(id: number): OrderRecord {
    const order = this.orders.findById(id);
    if (!order) {
      throw new DomainError('NOT_FOUND', `Order ${id} not found`);
    }
    return order;
  }

  findItems(orderId: number): OrderItemRecord[] {
    return this.orders.findItems(orderId);
  }

  // ---- queries ------------------------------------------------------------------------------

  getForUser(id: number, user: User): OrderView {
    const order = this.findOrThrow(id);
    if (!(ROLE_NAMES as readonly string[]).includes(user.role)) {
      throw new DomainError('FORBIDDEN', `Unknown role '${user.role}'`);
    }
    return this.view(order);
  }

  listForUser(user: User, customerId?: string): OrderRecord[] {
    return this.orders.list(user.role === 'customer' ? user.id : customerId);
  }

  // ---- commands -----------------------------------------------------------------------------

  create(dto: CreateOrderDto, user: User): OrderView {
    const customerId = user.role === 'customer' ? user.id : dto.customerId;
    if (!customerId) {
      throw new DomainError('RULE_VIOLATION', 'customerId is required when staff create an order');
    }
    if (user.role === 'customer' && dto.customerId && dto.customerId !== user.id) {
      throw new DomainError('FORBIDDEN', 'Customers may only create orders for themselves');
    }
    if (!this.customers.exists(customerId)) {
      throw new DomainError('NOT_FOUND', `Customer '${customerId}' not found`);
    }
    const skus = dto.items.map((i) => i.sku);
    if (new Set(skus).size !== skus.length) {
      throw new DomainError('RULE_VIOLATION', 'Each product may appear only once per order');
    }
    if (dto.promoCode) {
      this.catalog.promoPercent(dto.promoCode);
    }
    const orderId = this.database.transaction(() => {
      const id = this.orders.insert(customerId, dto.promoCode ?? null, this.clock.now().toISOString());
      for (const item of dto.items) {
        const product = this.catalog.get(item.sku);
        this.orders.insertItem(id, item.sku, item.qty, product.unitPriceCents, dto.promoCode ?? null);
      }
      this.reprice(id);
      return id;
    });
    return this.view(this.findOrThrow(orderId));
  }

  /** ORD-2: reserve stock for every line or place nothing. */
  place(id: number, user: User): OrderView {
    const order = this.findOrThrow(id);
    this.assertAccess(order, user);
    assertTransition(order.status, 'PLACED');
    this.database.transaction(() => {
      this.inventory.reserveAll(this.orders.findItems(id));
      this.reprice(id);
      this.orders.markPlaced(id, this.clock.now().toISOString());
      this.outbox.add('order.placed', { orderId: id, customerId: order.customerId });
    });
    return this.view(this.findOrThrow(id));
  }

  /**
   * Charge the customer. A declined card cancels the order and releases its stock (ORD-7).
   * A gateway timeout leaves the order PLACED so the payment can be retried.
   */
  async pay(id: number, user: User): Promise<OrderView> {
    const order = this.findOrThrow(id);
    this.assertAccess(order, user);
    if (order.status === 'PAID') {
      return this.view(order);
    }
    assertTransition(order.status, 'PAID');
    const result = await this.payments.capture({ orderId: id, amountCents: order.totalCents });
    this.database.transaction(() => {
      if (result.status === 'CAPTURED') {
        this.orders.markPaid(id, order.totalCents);
        this.outbox.add('order.paid', { orderId: id, amountCents: order.totalCents });
      } else {
        this.orders.setStatus(id, 'CANCELLED');
      }
    });
    return this.view(this.findOrThrow(id));
  }

  /** Cancels DRAFT and PLACED orders. PAID orders go through the refunds module (ORD-4). */
  cancel(id: number, user: User): OrderView {
    const order = this.findOrThrow(id);
    this.assertAccess(order, user);
    if (order.status === 'PAID') {
      throw new DomainError('CONFLICT', 'Paid orders must be cancelled with a refund: POST /orders/:id/cancel-with-refund');
    }
    assertTransition(order.status, 'CANCELLED');
    this.database.transaction(() => {
      if (order.status === 'PLACED') {
        this.inventory.releaseAll(this.orders.findItems(id));
      }
      this.orders.setStatus(id, 'CANCELLED');
    });
    return this.view(this.findOrThrow(id));
  }

  /** Called by RefundsService when a PAID order is cancelled. Stock was only reserved, never shipped. */
  cancelPaid(id: number): void {
    const order = this.findOrThrow(id);
    assertTransition(order.status, 'CANCELLED');
    this.inventory.releaseAll(this.orders.findItems(id));
    this.orders.setStatus(id, 'CANCELLED');
  }

  /** ORD-3: shipping commits reserved stock. */
  ship(id: number): OrderView {
    const order = this.findOrThrow(id);
    assertTransition(order.status, 'FULFILLED');
    this.database.transaction(() => {
      this.inventory.commitAll(this.orders.findItems(id));
      this.orders.setStatus(id, 'FULFILLED');
    });
    return this.view(this.findOrThrow(id));
  }

  deliver(id: number): OrderView {
    const order = this.findOrThrow(id);
    assertTransition(order.status, 'DELIVERED');
    this.orders.markDelivered(id, this.clock.now().toISOString());
    return this.view(this.findOrThrow(id));
  }

  close(id: number): OrderView {
    const order = this.findOrThrow(id);
    assertTransition(order.status, 'CLOSED');
    this.orders.setStatus(id, 'CLOSED');
    return this.view(this.findOrThrow(id));
  }

  /** Bookkeeping hook for RefundsService once money has actually moved. */
  recordRefunded(id: number, cents: number): void {
    this.orders.addRefunded(id, cents);
  }

  // ---- helpers ------------------------------------------------------------------------------

  private reprice(orderId: number): void {
    const order = this.findOrThrow(orderId);
    const items = this.orders.findItems(orderId);
    const percent = order.promoCode ? this.catalog.promoPercent(order.promoCode) : 0;
    this.orders.setTotals(
      orderId,
      this.pricing.price(
        items.map((i) => ({
          sku: i.sku,
          qty: i.qty,
          unitPriceCents: i.unitPriceCents,
          taxCategory: i.taxCategory,
        })),
        percent,
      ),
    );
  }

  private view(order: OrderRecord): OrderView {
    return { ...order, items: this.orders.findItems(order.id) };
  }
}

export type { OrderStatus };
