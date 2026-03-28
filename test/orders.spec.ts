import { InventoryService } from '../src/inventory/inventory.service.js';
import { OutboxRepository } from '../src/notifications/outbox.repository.js';
import { admin, alice, bob, createTestContext, paidOrder, support, type TestContext } from './helpers.js';

describe('orders', () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await createTestContext();
  });
  afterEach(async () => {
    await ctx.app.close();
  });

  const stock = (sku: string) => ctx.app.get(InventoryService).get(sku);

  it('creates a DRAFT order priced from the catalog (ORD-5: free shipping at 7500)', async () => {
    const res = await ctx.post('/orders', alice, { items: [{ sku: 'SKU-TENT-2P', qty: 1 }] }).expect(201);
    expect(res.body).toMatchObject({
      status: 'DRAFT',
      customerId: 'cus_alice',
      subtotalCents: 18900,
      taxCents: 1323,
      shippingCents: 0,
      totalCents: 20223,
    });
  });

  it('charges flat shipping on small orders', async () => {
    const res = await ctx.post('/orders', alice, { items: [{ sku: 'SKU-BAR-12', qty: 1 }] }).expect(201);
    expect(res.body).toMatchObject({ shippingCents: 799, totalCents: 2599 });
  });

  it('applies one promo code to the order (ORD-6)', async () => {
    const res = await ctx
      .post('/orders', alice, { items: [{ sku: 'SKU-STOVE-1', qty: 2 }], promoCode: 'SAVE10' })
      .expect(201);
    expect(res.body).toMatchObject({ discountCents: 900, taxCents: 567, totalCents: 8667 });
  });

  it('rejects an unknown promo code', async () => {
    await ctx.post('/orders', alice, { items: [{ sku: 'SKU-BAR-12', qty: 1 }], promoCode: 'NOPE' }).expect(422);
  });

  it('enforces item and quantity limits (ORD-1)', async () => {
    await ctx.post('/orders', alice, { items: [] }).expect(400);
    await ctx.post('/orders', alice, { items: [{ sku: 'SKU-BAR-12', qty: 100 }] }).expect(400);
    await ctx.post('/orders', alice, { items: [{ sku: 'SKU-BAR-12', qty: 0 }] }).expect(400);
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ sku: `SKU-${i}`, qty: 1 }));
    await ctx.post('/orders', alice, { items: tooMany }).expect(400);
  });

  it('rejects the same product twice in one order', async () => {
    await ctx
      .post('/orders', alice, {
        items: [
          { sku: 'SKU-BAR-12', qty: 1 },
          { sku: 'SKU-BAR-12', qty: 2 },
        ],
      })
      .expect(422);
  });

  it('requires customerId when staff create an order', async () => {
    await ctx.post('/orders', support, { items: [{ sku: 'SKU-BAR-12', qty: 1 }] }).expect(422);
    await ctx.post('/orders', support, { customerId: 'cus_bob', items: [{ sku: 'SKU-BAR-12', qty: 1 }] }).expect(201);
  });

  it('reserves stock when placed (ORD-2)', async () => {
    const created = await ctx.post('/orders', alice, { items: [{ sku: 'SKU-FUEL-8', qty: 3 }] });
    await ctx.post(`/orders/${created.body.id}/place`, alice).expect(201);
    expect(stock('SKU-FUEL-8')).toMatchObject({ onHand: 200, reserved: 3, available: 197 });
  });

  it('places nothing when any line is short on stock', async () => {
    const created = await ctx.post('/orders', alice, {
      items: [
        { sku: 'SKU-FUEL-8', qty: 1 },
        { sku: 'SKU-TENT-2P', qty: 30 }, // only 25 in stock
      ],
    });
    await ctx.post(`/orders/${created.body.id}/place`, alice).expect(409);
    expect(stock('SKU-FUEL-8').reserved).toBe(0);
    const order = await ctx.get(`/orders/${created.body.id}`, alice).expect(200);
    expect(order.body.status).toBe('DRAFT');
  });

  it('releases reserved stock when a PLACED order is cancelled (ORD-4)', async () => {
    const created = await ctx.post('/orders', alice, { items: [{ sku: 'SKU-FUEL-8', qty: 2 }] });
    await ctx.post(`/orders/${created.body.id}/place`, alice).expect(201);
    await ctx.post(`/orders/${created.body.id}/cancel`, alice).expect(201);
    expect(stock('SKU-FUEL-8').reserved).toBe(0);
  });

  it('commits stock when shipped (ORD-3)', async () => {
    const order = await paidOrder(ctx, [{ sku: 'SKU-FUEL-8', qty: 2 }]);
    await ctx.post(`/orders/${order.id}/ship`, support).expect(201);
    expect(stock('SKU-FUEL-8')).toMatchObject({ onHand: 198, reserved: 0 });
  });

  it('walks the lifecycle to CLOSED', async () => {
    const order = await paidOrder(ctx, [{ sku: 'SKU-BAR-12', qty: 1 }]);
    expect(order).toMatchObject({ status: 'PAID', paidCents: 2599 });
    await ctx.post(`/orders/${order.id}/ship`, support).expect(201);
    const delivered = await ctx.post(`/orders/${order.id}/deliver`, admin).expect(201);
    expect(delivered.body.deliveredAt).toBeTruthy();
    const closed = await ctx.post(`/orders/${order.id}/close`, admin).expect(201);
    expect(closed.body.status).toBe('CLOSED');
  });

  it('cancels the order when the card is declined (ORD-7)', async () => {
    // Bag + 2 bottles totals 17013 cents; the fake gateway declines amounts ending in 13 (PAY-1)
    const created = await ctx.post('/orders', alice, {
      items: [
        { sku: 'SKU-BAG-20F', qty: 1 },
        { sku: 'SKU-WATER-1', qty: 2 },
      ],
    });
    expect(created.body.totalCents).toBe(17013);
    await ctx.post(`/orders/${created.body.id}/place`, alice).expect(201);
    const paid = await ctx.post(`/orders/${created.body.id}/pay`, alice).expect(201);
    expect(paid.body.status).toBe('CANCELLED');
  });

  it('lets the customer retry payment after a gateway timeout (PAY-2)', async () => {
    ctx.gateway.setMode('timeout-once');
    const created = await ctx.post('/orders', alice, { items: [{ sku: 'SKU-BAR-12', qty: 1 }] });
    await ctx.post(`/orders/${created.body.id}/place`, alice).expect(201);
    await ctx.post(`/orders/${created.body.id}/pay`, alice).expect(504);
    const retry = await ctx.post(`/orders/${created.body.id}/pay`, alice).expect(201);
    expect(retry.body.status).toBe('PAID');
  });

  it('writes outbox events for placed and paid orders (NTF-1)', async () => {
    await paidOrder(ctx, [{ sku: 'SKU-BAR-12', qty: 1 }]);
    const types = ctx.app.get(OutboxRepository).all().map((e) => e.type);
    expect(types).toEqual(['order.placed', 'order.paid']);
  });

  it('summarises orders by status for admins', async () => {
    await paidOrder(ctx, [{ sku: 'SKU-BAR-12', qty: 1 }]);
    const summary = await ctx.get('/reports/orders/summary', admin).expect(200);
    expect(summary.body.byStatus).toEqual([{ status: 'PAID', orders: 1, totalCents: 2599 }]);
  });

  it("does not let a customer place or cancel someone else's order", async () => {
    const created = await ctx.post('/orders', alice, { items: [{ sku: 'SKU-BAR-12', qty: 1 }] });
    await ctx.post(`/orders/${created.body.id}/place`, bob).expect(403);
    await ctx.post(`/orders/${created.body.id}/cancel`, bob).expect(403);
  });

  it('lets a customer read and list their own orders', async () => {
    const created = await ctx.post('/orders', alice, { items: [{ sku: 'SKU-BAR-12', qty: 1 }] });
    await ctx.get(`/orders/${created.body.id}`, alice).expect(200);
    const list = await ctx.get('/orders', alice).expect(200);
    expect(list.body).toHaveLength(1);
    const bobsList = await ctx.get('/orders', bob).expect(200);
    expect(bobsList.body).toHaveLength(0);
  });

  it('refuses to cancel a PAID order through the plain cancel route', async () => {
    const order = await paidOrder(ctx, [{ sku: 'SKU-BAR-12', qty: 1 }]);
    await ctx.post(`/orders/${order.id}/cancel`, alice).expect(409);
  });
});
