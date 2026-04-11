import { InventoryService } from '../src/inventory/inventory.service.js';
import { OutboxRepository } from '../src/notifications/outbox.repository.js';
import {
  admin,
  alice,
  bob,
  createTestContext,
  deliveredOrder,
  paidOrder,
  support,
  type TestContext,
} from './helpers.js';

describe('refunds', () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await createTestContext();
  });
  afterEach(async () => {
    await ctx.app.close();
  });

  const request = (orderId: number, reason: string, lines: object[], who = alice) =>
    ctx.post('/refunds', who, { orderId, reason, lines });
  const events = () => ctx.app.get(OutboxRepository).all().map((e) => e.type);

  it('auto-approves and completes a small refund (REF-6)', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-STOVE-1', qty: 2 }]);
    const res = await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1 }]).expect(201);
    expect(res.body).toMatchObject({ status: 'COMPLETED', amountCents: 4500, approvedBy: 'system' });
    expect(events()).toContain('refund.approved');
    const after = await ctx.get(`/orders/${order.id}`, alice).expect(200);
    expect(after.body.refundedCents).toBe(4500);
  });

  it('takes a restocking fee on opened returns (REF-3)', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-STOVE-1', qty: 2 }]);
    const res = await request(order.id, 'OPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1 }]).expect(201);
    expect(res.body).toMatchObject({ feeCents: 675, amountCents: 3825 });
  });

  it('refunds shipping only when the whole order comes back (REF-5)', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-FUEL-8', qty: 2 }]); // shipping 799
    const partial = await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1 }]).expect(201);
    expect(partial.body).toMatchObject({ shippingCents: 0, amountCents: 899 });

    const second = await deliveredOrder(ctx, [{ sku: 'SKU-FUEL-8', qty: 2 }]);
    const whole = await request(second.id, 'UNOPENED_RETURN', [{ orderItemId: second.items[0].id, qty: 2 }]).expect(201);
    expect(whole.body).toMatchObject({ shippingCents: 799, amountCents: 1798 + 799 });
  });

  it('holds larger refunds for support approval (REF-6)', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-TENT-2P', qty: 1 }]);
    const requested = await request(order.id, 'DEFECTIVE', [{ orderItemId: order.items[0].id, qty: 1 }]).expect(201);
    expect(requested.body).toMatchObject({ status: 'REQUESTED', amountCents: 18900 });

    await ctx.post(`/refunds/${requested.body.id}/approve`, alice).expect(403); // customers cannot approve
    const approved = await ctx.post(`/refunds/${requested.body.id}/approve`, support).expect(201);
    expect(approved.body).toMatchObject({ status: 'COMPLETED', approvedBy: 'sup_1' });
  });

  it('needs an admin above the support limit (REF-6)', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-TENT-2P', qty: 2 }]);
    const requested = await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 2 }]).expect(201);
    expect(requested.body.amountCents).toBe(37800);
    await ctx.post(`/refunds/${requested.body.id}/approve`, support).expect(403);
    await ctx.post(`/refunds/${requested.body.id}/approve`, admin).expect(201);
  });

  it('can reject a requested refund', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-TENT-2P', qty: 1 }]);
    const requested = await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1 }]);
    const rejected = await ctx.post(`/refunds/${requested.body.id}/reject`, support).expect(201);
    expect(rejected.body.status).toBe('REJECTED');
  });

  it('rejects refunds on orders that have not shipped', async () => {
    const order = await paidOrder(ctx, [{ sku: 'SKU-BAR-12', qty: 1 }]);
    await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1 }]).expect(422);
  });

  it('rejects returns after 30 days but still allows defects (REF-1, REF-2)', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-STOVE-1', qty: 2 }]);
    ctx.clock.advanceDays(45);
    await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1 }]).expect(422);
    await request(order.id, 'DEFECTIVE', [{ orderItemId: order.items[0].id, qty: 1 }]).expect(201);
  });

  it('cannot refund more units than were bought', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-STOVE-1', qty: 2 }]);
    const itemId = order.items[0].id;
    await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: itemId, qty: 3 }]).expect(422);
    await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: itemId, qty: 1 }]).expect(201);
    await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: itemId, qty: 1 }]).expect(201);
    await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: itemId, qty: 1 }]).expect(422);
  });

  it('puts returned goods back on the shelf when asked (REF-9)', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-STOVE-1', qty: 2 }]);
    const before = ctx.app.get(InventoryService).get('SKU-STOVE-1').onHand;
    await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1, returnToStock: true }]).expect(201);
    expect(ctx.app.get(InventoryService).get('SKU-STOVE-1').onHand).toBe(before + 1);
  });

  it('marks a refund FAILED when the gateway declines, and lets support retry it (REF-7)', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-STOVE-1', qty: 2 }]);
    ctx.gateway.failNextRefund();
    const failed = await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1 }]).expect(201);
    expect(failed.body.status).toBe('FAILED');
    expect(events()).toContain('refund.failed');
    const mid = await ctx.get(`/orders/${order.id}`, alice).expect(200);
    expect(mid.body.refundedCents).toBe(0);

    const retried = await ctx.post(`/refunds/${failed.body.id}/retry`, support).expect(201);
    expect(retried.body.status).toBe('COMPLETED');
    const after = await ctx.get(`/orders/${order.id}`, alice).expect(200);
    expect(after.body.refundedCents).toBe(4500);
  });

  it('cancels a PAID order with a full refund and releases its stock (ORD-4)', async () => {
    const order = await paidOrder(ctx, [{ sku: 'SKU-STOVE-1', qty: 2 }]);
    const res = await ctx.post(`/orders/${order.id}/cancel-with-refund`, alice).expect(201);
    expect(res.body).toMatchObject({ status: 'COMPLETED', amountCents: order.paidCents, reason: 'ORDER_CANCELLED' });
    const after = await ctx.get(`/orders/${order.id}`, alice).expect(200);
    expect(after.body).toMatchObject({ status: 'CANCELLED', refundedCents: order.paidCents });
    expect(ctx.app.get(InventoryService).get('SKU-STOVE-1').reserved).toBe(0);
  });

  it('lets customers view their own refunds', async () => {
    const order = await deliveredOrder(ctx, [{ sku: 'SKU-STOVE-1', qty: 2 }]);
    const refund = await request(order.id, 'UNOPENED_RETURN', [{ orderItemId: order.items[0].id, qty: 1 }]);
    await ctx.get(`/refunds/${refund.body.id}`, alice).expect(200);
    await ctx.get(`/refunds/${refund.body.id}`, bob).expect(403);
    const list = await ctx.get(`/orders/${order.id}/refunds`, alice).expect(200);
    expect(list.body).toHaveLength(1);
  });
});
