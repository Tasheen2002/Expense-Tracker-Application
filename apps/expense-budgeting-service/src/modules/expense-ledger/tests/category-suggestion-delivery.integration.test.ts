import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@expense-tracker/core';
import { ExpenseRepositoryImpl } from '../infrastructure/persistence/expense.repository.impl';
import { ExpenseService } from '../application/services/expense.service';
import { registerExpenseOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';

const url = process.env.CATEGORY_DELIVERY_TEST_DATABASE_URL;
describe.skipIf(!url)('Category acceptance PostgreSQL delivery', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const replicaPrisma = new PrismaClient({ datasources: { db: { url } } });
  const workspaceId = randomUUID(), userId = randomUUID();
  let app: FastifyInstance;
  let replica: FastifyInstance;
  let expenseId: string, categoryId: string;
  beforeAll(async () => {
    const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!name.startsWith('codex_test_expense_')) throw new Error('Dedicated expense test database required');
    app = Fastify();
    await registerExpenseOutboxEventRoutes(app, new ExpenseService(new ExpenseRepositoryImpl(prisma, new InMemoryEventBus())), prisma);
    await app.ready();
    replica = Fastify();
    await registerExpenseOutboxEventRoutes(replica, new ExpenseService(new ExpenseRepositoryImpl(replicaPrisma, new InMemoryEventBus())), replicaPrisma);
    await replica.ready();
  });
  beforeEach(async () => {
    const category = await prisma.category.create({ data: { workspaceId, name: randomUUID() } });
    categoryId = category.id;
    const expense = await prisma.expense.create({ data: { workspaceId, userId, title: 'Category delivery', amount: 10,
      expenseDate: new Date(), status: 'DRAFT' } });
    expenseId = expense.id;
  });
  afterEach(async () => {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_category_outbox ON expense_ledger.outbox_event');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS expense_ledger.fail_category_outbox()');
  });
  afterAll(async () => { await app?.close(); await replica?.close(); await prisma.$disconnect(); await replicaPrisma.$disconnect(); });
  function event(patch: Record<string, unknown> = {}) {
    return { eventId: randomUUID(), eventType: 'CategorySuggestionAccepted', payload: {
      expenseId, workspaceId, categoryId, acceptedBy: userId, expenseVersion: 1, ...patch,
    } };
  }
  const deliver = (payload: ReturnType<typeof event>) => app.inject({ method: 'POST', url: '/event-outbox/events', payload });
  it('updates once under simultaneous redelivery and commits its event and deduplication record', async () => {
    const message = event();
    const before = await prisma.outboxEvent.count();
    const responses = await Promise.all([deliver(message), replica.inject({ method: 'POST', url: '/event-outbox/events', payload: message })]);
    expect(responses.map(response => response.statusCode)).toEqual([200, 200]);
    expect(responses.filter(response => response.json().duplicate)).toHaveLength(1);
    const stored = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
    expect(stored.categoryId).toBe(categoryId); expect(stored.version).toBe(2);
    expect(await prisma.outboxEvent.count()).toBe(before + 1);
    expect(await prisma.processedEvent.count({ where: { eventId: message.eventId } })).toBe(1);
  });
  it('rejects a stale version without marking the event processed', async () => {
    await prisma.expense.update({ where: { id: expenseId }, data: { version: 2 } });
    const message = event(); expect((await deliver(message)).statusCode).toBe(409);
    expect(await prisma.processedEvent.findUnique({ where: { eventId: message.eventId } })).toBeNull();
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } })).categoryId).toBeNull();
  });
  it('rejects inactive and foreign-workspace categories', async () => {
    await prisma.category.update({ where: { id: categoryId }, data: { isActive: false } });
    expect((await deliver(event())).statusCode).toBe(404);
    const foreign = await prisma.category.create({ data: { workspaceId: randomUUID(), name: randomUUID() } });
    expect((await deliver(event({ categoryId: foreign.id }))).statusCode).toBe(404);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } })).categoryId).toBeNull();
  });
  it('rejects a foreign workspace and an approved expense', async () => {
    expect((await deliver(event({ workspaceId: randomUUID() }))).statusCode).toBe(404);
    await prisma.expense.update({ where: { id: expenseId }, data: { status: 'APPROVED' } });
    expect((await deliver(event())).statusCode).toBe(400);
  });
  it('rolls back expense, version and deduplication on outbox failure, then retries successfully', async () => {
    await prisma.$executeRawUnsafe(`CREATE FUNCTION expense_ledger.fail_category_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$`);
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_category_outbox BEFORE INSERT ON expense_ledger.outbox_event FOR EACH ROW EXECUTE FUNCTION expense_ledger.fail_category_outbox()');
    const message = event(); expect((await deliver(message)).statusCode).toBe(500);
    const stored = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
    expect(stored.categoryId).toBeNull(); expect(stored.version).toBe(1);
    expect(await prisma.processedEvent.findUnique({ where: { eventId: message.eventId } })).toBeNull();
    await prisma.$executeRawUnsafe('DROP TRIGGER fail_category_outbox ON expense_ledger.outbox_event');
    expect((await deliver(message)).statusCode).toBe(200);
  });
  it('rejects missing acceptance metadata', async () => {
    expect((await deliver(event({ expenseVersion: undefined }))).statusCode).toBe(400);
  });
});
