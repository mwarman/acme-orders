import { admin, alice, bob, createTestContext, support, type TestContext } from './helpers.js';

describe('identity, roles and customer records', () => {
  let ctx: TestContext;
  beforeEach(async () => {
    ctx = await createTestContext();
  });
  afterEach(async () => {
    await ctx.app.close();
  });

  it('serves the catalog and health check without identity', async () => {
    await ctx.get('/health').expect(200);
    const products = await ctx.get('/catalog/products').expect(200);
    expect(products.body).toHaveLength(12);
    await ctx.get('/catalog/products/SKU-TENT-2P').expect(200);
    await ctx.get('/catalog/products/NOPE').expect(404);
  });

  it('returns 401 without identity headers on guarded routes', async () => {
    await ctx.get('/orders').expect(401);
    await ctx.get('/customers/cus_alice').expect(401);
  });

  it('ignores an unknown role', async () => {
    await ctx.get('/orders').set('x-user-id', 'x').set('x-user-role', 'superuser').expect(401);
  });

  it('lets customers read only their own record', async () => {
    await ctx.get('/customers/cus_alice', alice).expect(200);
    await ctx.get('/customers/cus_bob', alice).expect(403);
    await ctx.get('/customers/cus_bob', support).expect(200);
    await ctx.get('/customers/cus_nobody', admin).expect(404);
  });

  it('restricts inventory to staff and adjustments to admins', async () => {
    await ctx.get('/inventory/SKU-FUEL-8', alice).expect(403);
    await ctx.get('/inventory/SKU-FUEL-8', support).expect(200);
    await ctx.post('/inventory/SKU-FUEL-8/adjust', support, { delta: 5 }).expect(403);
    const res = await ctx.post('/inventory/SKU-FUEL-8/adjust', admin, { delta: 5 }).expect(201);
    expect(res.body.onHand).toBe(205);
  });

  it('refuses an adjustment that would drop on-hand below reserved', async () => {
    const created = await ctx.post('/orders', bob, { items: [{ sku: 'SKU-TENT-2P', qty: 10 }] });
    await ctx.post(`/orders/${created.body.id}/place`, bob).expect(201);
    await ctx.post('/inventory/SKU-TENT-2P/adjust', admin, { delta: -20 }).expect(422); // 25 - 20 < 10 reserved
  });

  it('restricts report summaries to admins', async () => {
    await ctx.get('/reports/orders/summary', alice).expect(403);
    await ctx.get('/reports/refunds/summary', support).expect(403);
    await ctx.get('/reports/orders/summary', admin).expect(200);
    await ctx.get('/reports/refunds/summary', admin).expect(200);
  });

  it('lets only staff ship, deliver and close orders', async () => {
    const created = await ctx.post('/orders', alice, { items: [{ sku: 'SKU-BAR-12', qty: 1 }] });
    await ctx.post(`/orders/${created.body.id}/ship`, alice).expect(403);
    await ctx.post(`/orders/${created.body.id}/deliver`, alice).expect(403);
  });
});
