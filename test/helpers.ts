import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { Clock } from '../src/common/clock.js';
import type { Role } from '../src/common/identity.middleware.js';
import { FakeGateway } from '../src/payments/fake-gateway.js';
import { GATEWAY_ADAPTER } from '../src/payments/gateway.adapter.js';

export interface Actor {
  id: string;
  role: Role;
}

export const alice: Actor = { id: 'cus_alice', role: 'customer' };
export const bob: Actor = { id: 'cus_bob', role: 'customer' };
export const support: Actor = { id: 'sup_1', role: 'support' };
export const admin: Actor = { id: 'adm_1', role: 'admin' };

/** A clock tests can move forward. */
export class TestClock extends Clock {
  current = new Date('2026-03-02T12:00:00Z');

  override now(): Date {
    return new Date(this.current);
  }

  advanceDays(days: number): void {
    this.current = new Date(this.current.getTime() + days * 86_400_000);
  }
}

export interface Line {
  sku: string;
  qty: number;
}

export interface TestContext {
  app: INestApplication;
  clock: TestClock;
  gateway: FakeGateway;
  get(path: string, actor?: Actor): request.Test;
  post(path: string, actor?: Actor, body?: object): request.Test;
}

/** Fresh app and in-memory database per call. */
export async function createTestContext(): Promise<TestContext> {
  process.env.DB_PATH = ':memory:';
  const clock = new TestClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  const server = app.getHttpServer();
  const withActor = (req: request.Test, actor?: Actor) =>
    actor ? req.set('x-user-id', actor.id).set('x-user-role', actor.role) : req;
  return {
    app,
    clock,
    gateway: app.get<FakeGateway>(GATEWAY_ADAPTER),
    get: (path, actor) => withActor(request(server).get(path), actor),
    post: (path, actor, body) => withActor(request(server).post(path), actor).send(body ?? {}),
  };
}

/** Create, place and pay an order as `who`. Returns the paid order body. */
export async function paidOrder(ctx: TestContext, items: Line[], who: Actor = alice, promoCode?: string) {
  const created = await ctx.post('/orders', who, { items, promoCode }).expect(201);
  const id: number = created.body.id;
  await ctx.post(`/orders/${id}/place`, who).expect(201);
  const paid = await ctx.post(`/orders/${id}/pay`, who).expect(201);
  return paid.body;
}

/** Paid, shipped and delivered. */
export async function deliveredOrder(ctx: TestContext, items: Line[], who: Actor = alice) {
  const order = await paidOrder(ctx, items, who);
  await ctx.post(`/orders/${order.id}/ship`, support).expect(201);
  const delivered = await ctx.post(`/orders/${order.id}/deliver`, support).expect(201);
  return delivered.body;
}
