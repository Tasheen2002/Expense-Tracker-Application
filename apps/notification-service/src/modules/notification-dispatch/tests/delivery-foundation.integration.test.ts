import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaClient } from '../../../prisma-client';
import { registerNotificationOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';
import { NotificationRepositoryImpl } from '../infrastructure/persistence/notification.repository.impl';
import { Notification } from '../domain/entities/notification.entity';
import { UserId, WorkspaceId } from '../domain/value-objects';
import { NotificationType, NotificationChannel } from '../domain/enums';
import { PrismaOutboxEventRepository } from '../../../repositories/outbox-event.repository';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('Notification delivery foundation — PostgreSQL', () => {
  const prisma = new PrismaClient();
  const workspaceId = randomUUID();
  const recipientId = randomUUID();
  const notificationIds: string[] = [];
  const aggregateIds: string[] = [];
  const templateIds: string[] = [];
  let app: FastifyInstance;
  beforeAll(async () => {
    app = Fastify({ logger: false });
    await registerNotificationOutboxEventRoutes(app, prisma);
  });
  afterAll(async () => {
    await app.close();
    await prisma.notification.deleteMany({ where: { id: { in: notificationIds } } });
    await prisma.notificationTemplate.deleteMany({ where: { id: { in: templateIds } } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: [...notificationIds, ...aggregateIds] } } });
    await prisma.$disconnect();
  });
  function event() {
    const eventId = randomUUID(); notificationIds.push(eventId);
    return { eventId, eventType: 'SyncSessionFailed', aggregateId: randomUUID(), aggregateType: 'SyncSession',
      timestamp: '2026-09-30T10:00:00.000Z', payload: { workspaceId, userId: recipientId, detail: { a: 1, b: 2 } } };
  }
  const send = (payload: object) => app.inject({ method: 'POST', url: '/event-outbox/events', payload });

  it.each(['APPROVED', 'REJECTED'])('consumes the expense producer status payload for its owner: %s', async newStatus => {
    const base = event();
    const input = { ...base, eventType: 'expense.status_changed', aggregateType: 'Expense',
      payload: { expenseId: base.aggregateId, workspaceId, oldStatus: 'SUBMITTED', newStatus,
        changedBy: randomUUID(), expenseOwnerId: recipientId } };
    expect((await send(input)).statusCode).toBe(201);
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: input.eventId } });
    expect(stored.recipientId).toBe(recipientId);
    expect(stored.type).toBe(newStatus === 'APPROVED' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED');
    expect(stored.status).toBe('SENT');
    expect((await send(input)).json().duplicate).toBe(true);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: input.eventId } })).toBe(2);
  });

  it('consumes the approval workflow producer payload for its requester', async () => {
    const base = event();
    const input = { ...base, eventType: 'approval.workflow_started', aggregateType: 'ApprovalWorkflow',
      payload: { workflowId: base.aggregateId, expenseId: randomUUID(), workspaceId,
        requesterId: recipientId, totalSteps: 2 } };
    expect((await send(input)).statusCode).toBe(201);
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: input.eventId } });
    expect(stored.recipientId).toBe(recipientId);
    expect(stored.type).toBe('SYSTEM_ALERT');
    expect(stored.title).toBe('Approval Started');
    expect((await send(input)).json().duplicate).toBe(true);
  });

  it('does not notify an owner for nonterminal expense status changes', async () => {
    const base = event();
    const input = { ...base, eventType: 'expense.status_changed',
      payload: { workspaceId, expenseOwnerId: recipientId, newStatus: 'SUBMITTED' } };
    expect((await send(input)).statusCode).toBe(200);
    expect(await prisma.notification.findUnique({ where: { id: input.eventId } })).toBeNull();
  });

  it.each(['exemption.approved', 'exemption.rejected'])('does not misclassify policy events as expense outcomes: %s', async eventType => {
    const input = { ...event(), eventType };
    expect((await send(input)).statusCode).toBe(201);
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: input.eventId } });
    expect(stored.type).toBe('SYSTEM_ALERT');
    expect(stored.content).not.toContain('Your expense');
  });

  it('enforces global and tenant template uniqueness without preventing another workspace', async () => {
    const data = { name: 'Foundation', type: 'INVITATION' as const, channel: 'PUSH' as const,
      subjectTemplate: 'Subject', bodyTemplate: 'Body' };
    // This pair is unused by the other service tests.
    const global = await prisma.notificationTemplate.create({ data }); templateIds.push(global.id);
    await expect(prisma.notificationTemplate.create({ data: { ...data, isActive: false } })).rejects.toMatchObject({ code: 'P2002' });
    const tenant = await prisma.notificationTemplate.create({ data: { ...data, workspaceId } }); templateIds.push(tenant.id);
    await expect(prisma.notificationTemplate.create({ data: { ...data, workspaceId } })).rejects.toMatchObject({ code: 'P2002' });
    const other = await prisma.notificationTemplate.create({ data: { ...data, workspaceId: randomUUID() } }); templateIds.push(other.id);
  });

  it('rejects invalid workspace and timestamp contracts without a write', async () => {
    for (const invalid of [undefined, 'invalid', '00000000-0000-0000-0000-000000000000']) {
      const input = event();
      expect((await send({ ...input, payload: { ...input.payload, workspaceId: invalid } })).statusCode).toBe(400);
      expect(await prisma.notification.findUnique({ where: { id: input.eventId } })).toBeNull();
    }
    expect((await send({ ...event(), timestamp: 'invalid' })).statusCode).toBe(400);
  });

  it('deduplicates reordered JSON and rejects conflicting event identities', async () => {
    const input = event();
    expect((await send(input)).statusCode).toBe(201);
    expect((await send({ ...input, payload: { detail: { b: 2, a: 1 }, userId: recipientId, workspaceId } })).statusCode).toBe(200);
    for (const conflict of [
      { ...input, eventType: 'expense.approved' },
      { ...input, aggregateId: randomUUID() },
      { ...input, payload: { ...input.payload, workspaceId: randomUUID() } },
      { ...input, payload: { ...input.payload, userId: randomUUID() } },
      { ...input, payload: { ...input.payload, detail: { a: 9, b: 2 } } },
    ]) expect((await send(conflict)).statusCode).toBe(409);
    expect(await prisma.notification.count({ where: { id: input.eventId } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: input.eventId, eventType: 'notification.created' } })).toBe(1);
  });

  it('concurrent identical deliveries create one notification and exactly one event per transition', async () => {
    const input = event();
    const results = await Promise.all(Array.from({ length: 5 }, () => send(input)));
    expect(results.map(result => result.statusCode).sort()).toEqual([200, 200, 200, 200, 201]);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: input.eventId } })).toBe(2);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: input.eventId, eventType: 'notification.sent' } })).toBe(1);
  });

  it('stores safe, delivered content before a replay or bulk read', async () => {
    const base = event();
    const input = { ...base, eventType: 'BudgetThresholdExceeded',
      payload: { ...base.payload, message: '<script>steal()</script><img src=x onerror=steal()>Budget exceeded' } };
    expect((await send(input)).statusCode).toBe(201);
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: input.eventId } });
    expect(stored.content).toBe('Budget exceeded');
    expect(stored.status).toBe('SENT'); expect(stored.sentAt).not.toBeNull();
    const repository = new NotificationRepositoryImpl(prisma, new InMemoryEventBus());
    await repository.markAllAsRead(UserId.fromString(recipientId), WorkspaceId.fromString(workspaceId));
    expect((await send(input)).statusCode).toBe(200);
    const read = await prisma.notification.findUniqueOrThrow({ where: { id: input.eventId } });
    expect(read.status).toBe('READ'); expect(read.sentAt).toEqual(stored.sentAt);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: input.eventId, eventType: 'notification.read' } })).toBe(1);
  });

  it.each(['x'.repeat(5001), '   ', '<script>onlyUnsafeContent()</script>'])('rejects invalid generated content without rows or events', async message => {
    const input = { ...event(), eventType: 'BudgetThresholdExceeded' };
    const response = await send({ ...input, payload: { ...input.payload, message } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('INVALID_NOTIFICATION_DATA');
    expect(await prisma.notification.findUnique({ where: { id: input.eventId } })).toBeNull();
    expect(await prisma.outboxEvent.count({ where: { aggregateId: input.eventId } })).toBe(0);
  });

  it('normalizes uppercase event and scope IDs so a repeated delivery is acknowledged', async () => {
    const input = event();
    const upper = { ...input, eventId: input.eventId.toUpperCase(),
      payload: { ...input.payload, userId: recipientId.toUpperCase(), workspaceId: workspaceId.toUpperCase() } };
    expect((await send(upper)).statusCode).toBe(201);
    expect((await send(upper)).statusCode).toBe(200);
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: input.eventId } });
    expect(stored.recipientId).toBe(recipientId); expect(stored.workspaceId).toBe(workspaceId);
  });

  it('concurrent conflicting deliveries yield one success and one conflict', async () => {
    const input = event();
    const results = await Promise.all([send(input), send({ ...input, payload: { ...input.payload, userId: randomUUID() } })]);
    expect(results.map(result => result.statusCode).sort()).toEqual([201, 409]);
  });

  it('adopts a verified legacy replay and then protects its complete identity', async () => {
    const input = event();
    await prisma.notification.create({ data: {
      id: input.eventId, workspaceId, recipientId, type: 'SYSTEM_ALERT', channel: 'IN_APP', title: 'Legacy', content: 'Legacy',
      data: { ...input.payload, eventId: input.eventId, sourceEventType: input.eventType }, createdAt: new Date(input.timestamp),
    } });
    expect((await send({ ...input, payload: { ...input.payload, userId: randomUUID() } })).statusCode).toBe(409);
    expect((await send(input)).statusCode).toBe(200);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: input.eventId } })).sourceEventFingerprint).toHaveLength(64);
    expect((await send({ ...input, aggregateId: randomUUID() })).statusCode).toBe(409);
  });

  it('rolls back incoming notification creation when the outbox write fails', async () => {
    const input = event();
    // UUID is generated locally, never accepted from user input in this SQL.
    await prisma.$executeRawUnsafe(`ALTER TABLE notification_dispatch.outbox_event ADD CONSTRAINT foundation_reject_event CHECK (aggregate_id <> '${input.eventId}')`);
    try {
      const response = await send(input);
      expect(response.statusCode).toBe(500);
      expect(response.json().message).toBe('An unexpected error occurred');
      expect(await prisma.notification.findUnique({ where: { id: input.eventId } })).toBeNull();
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE notification_dispatch.outbox_event DROP CONSTRAINT foundation_reject_event');
    }
    expect((await send(input)).statusCode).toBe(201);
  });

  function aggregate() {
    const value = Notification.create({ workspaceId: WorkspaceId.fromString(workspaceId), recipientId: UserId.fromString(recipientId),
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.IN_APP, title: 'Foundation', content: 'Content' });
    notificationIds.push(value.id.getValue()); return value;
  }

  it('rolls back notification creation if its outbox insert fails, retains events, and supports retry', async () => {
    const value = aggregate();
    const source = value.domainEvents[0];
    await prisma.outboxEvent.create({ data: { id: source.eventId, aggregateId: value.id.getValue(), aggregateType: 'Notification',
      eventType: 'collision', payload: {}, status: 'PENDING' } });
    const repository = new NotificationRepositoryImpl(prisma, new InMemoryEventBus());
    await expect(repository.save(value)).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.notification.findUnique({ where: { id: value.id.getValue() } })).toBeNull();
    expect(value.domainEvents).toHaveLength(1);
    await prisma.outboxEvent.delete({ where: { id: source.eventId } });
    await repository.save(value);
    expect(value.domainEvents).toHaveLength(0);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: value.id.getValue(), eventType: 'notification.created' } })).toBe(1);
  });

  it('keeps committed events durable if post-commit in-process dispatch fails', async () => {
    const value = aggregate(); value.markAsSent();
    const bus = new InMemoryEventBus();
    const dispatch = vi.spyOn(bus, 'publishAll').mockRejectedValue(new Error('Subscriber unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await new NotificationRepositoryImpl(prisma, bus).save(value);
      expect(await prisma.outboxEvent.count({ where: { aggregateId: value.id.getValue() } })).toBe(2);
      expect(value.domainEvents).toHaveLength(0);
    } finally { dispatch.mockRestore(); log.mockRestore(); }
  });

  it('rolls back an existing notification update if its new outbox event cannot be stored', async () => {
    const value = aggregate();
    const repository = new NotificationRepositoryImpl(prisma, new InMemoryEventBus());
    await repository.save(value);
    value.markAsRead();
    const readEvent = value.domainEvents[0];
    await prisma.outboxEvent.create({ data: { id: readEvent.eventId, aggregateId: value.id.getValue(),
      aggregateType: 'Notification', eventType: 'collision', payload: {}, status: 'PENDING' } });
    await expect(repository.save(value)).rejects.toMatchObject({ code: 'P2002' });
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: value.id.getValue() } });
    expect(stored.readAt).toBeNull(); expect(stored.status).toBe('PENDING');
    expect(value.domainEvents).toHaveLength(1);
    await prisma.outboxEvent.delete({ where: { id: readEvent.eventId } });
    await repository.save(value);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: value.id.getValue(), eventType: 'notification.read' } })).toBe(1);
  });

  it('records one read event per notification under concurrent bulk-read requests', async () => {
    const first = aggregate(); const second = aggregate();
    const repository = new NotificationRepositoryImpl(prisma, new InMemoryEventBus());
    await repository.save(first); await repository.save(second);
    await Promise.all([
      repository.markAllAsRead(UserId.fromString(recipientId), WorkspaceId.fromString(workspaceId)),
      repository.markAllAsRead(UserId.fromString(recipientId), WorkspaceId.fromString(workspaceId)),
    ]);
    for (const value of [first, second]) {
      expect(await prisma.outboxEvent.count({ where: { aggregateId: value.id.getValue(), eventType: 'notification.read' } })).toBe(1);
      expect((await prisma.notification.findUniqueOrThrow({ where: { id: value.id.getValue() } })).status).toBe('READ');
    }
  });

  const outbox = new PrismaOutboxEventRepository(prisma);
  async function seed(count: number) {
    const aggregateId = randomUUID(); aggregateIds.push(aggregateId);
    await prisma.outboxEvent.createMany({ data: Array.from({ length: count }, () => ({ id: randomUUID(), aggregateId,
      aggregateType: 'Foundation', eventType: 'foundation', payload: {}, status: 'PENDING' as const, createdAt: new Date('2000-01-01') })) });
    return aggregateId;
  }

  it('parallel workers claim disjoint batches using PostgreSQL locks', async () => {
    const aggregateId = await seed(20);
    const [first, second] = await Promise.all([outbox.claimPending(10), outbox.claimPending(10)]);
    expect(first).toHaveLength(10); expect(second).toHaveLength(10);
    expect(new Set([...first, ...second].map(item => item.id)).size).toBe(20);
    expect([...first, ...second].every(item => item.aggregateId === aggregateId && item.leaseToken)).toBe(true);
    await prisma.outboxEvent.deleteMany({ where: { aggregateId } });
  });

  it('recovers expired leases and fences stale completion, retry, renewal, and subscriber acknowledgments', async () => {
    const aggregateId = await seed(1);
    const [first] = await outbox.claimPending(1);
    await prisma.outboxEvent.update({ where: { id: first.id }, data: { leaseExpiresAt: new Date(0) } });
    expect(await outbox.updateStatus(first.id, 'PROCESSED', null, first.leaseToken)).toBe(false);
    expect(await outbox.renewLease(first.id, first.leaseToken!, 60000)).toBe(false);
    expect(await outbox.markDelivered(first.id, 'subscriber', first.leaseToken)).toBe(false);
    expect(await outbox.releaseExpiredLeases()).toBeGreaterThanOrEqual(1);
    const [second] = await outbox.claimPending(1);
    expect(second.leaseToken).not.toBe(first.leaseToken);
    expect(await outbox.incrementRetry(first.id, 'stale', first.leaseToken)).toBe(false);
    expect(await outbox.updateStatus(second.id, 'PROCESSED')).toBe(false);
    expect(await outbox.updateStatus(second.id, 'PROCESSED', null, second.leaseToken)).toBe(true);
    await prisma.outboxEvent.deleteMany({ where: { aggregateId } });
  });

  it('preserves subscriber progress and schedules retries with backoff', async () => {
    const aggregateId = await seed(1);
    const [job] = await outbox.claimPending(1);
    expect(await outbox.markDelivered(job.id, 'one', job.leaseToken)).toBe(true);
    await Promise.all([outbox.markDelivered(job.id, 'two', job.leaseToken), outbox.markDelivered(job.id, 'three', job.leaseToken)]);
    expect(await outbox.markDelivered(job.id, 'one', job.leaseToken)).toBe(true);
    expect(await outbox.incrementRetry(job.id, 'network', job.leaseToken)).toBe(true);
    expect(await outbox.claimFailed(1, 5)).toHaveLength(0);
    await prisma.outboxEvent.update({ where: { id: job.id }, data: { nextAttemptAt: new Date(0) } });
    const [retry] = await outbox.claimFailed(1, 5);
    expect(retry.retryCount).toBe(1);
    expect(retry.deliveredTo?.sort()).toEqual(['one', 'three', 'two']);
    expect(await outbox.updateStatus(retry.id, 'DEAD_LETTER', 'exhausted', retry.leaseToken)).toBe(true);
    await prisma.outboxEvent.deleteMany({ where: { aggregateId } });
  });
});
