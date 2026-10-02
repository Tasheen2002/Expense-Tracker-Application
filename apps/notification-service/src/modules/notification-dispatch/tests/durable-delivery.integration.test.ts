import Fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { InMemoryEventBus, DomainEvent } from '@expense-tracker/core';
import { PrismaClient } from '../../../prisma-client';
import { NotificationRepositoryImpl } from '../infrastructure/persistence/notification.repository.impl';
import { NotificationPreferenceRepositoryImpl } from '../infrastructure/persistence/notification-preference.repository.impl';
import { NotificationTemplateRepositoryImpl } from '../infrastructure/persistence/notification-template.repository.impl';
import { EmailDeliveryRepositoryImpl } from '../infrastructure/persistence/email-delivery.repository.impl';
import { NotificationService } from '../application/services/notification.service';
import { EmailDeliveryService } from '../application/services/email-delivery.service';
import { PreferenceService } from '../application/services/preference.service';
import { SendNotificationHandler } from '../application/commands/send-notification.command';
import { IRecoverableEmailProvider } from '../application/providers/recoverable-email-provider.interface';
import { IChannelProvider, SendResult } from '../application/providers/channel-provider.interface';
import { NotificationType, NotificationChannel } from '../domain/enums';
import { NotificationRequestConflictError } from '../domain/errors/notification.errors';
import { registerNotificationOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';
import { NotificationEventHandler } from '../application/handlers/notification.handler';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('Durable request and email recovery — PostgreSQL', () => {
  const prisma = new PrismaClient(); const bus = new InMemoryEventBus(); const workspaces: string[] = [];
  const notifications = new NotificationService(new NotificationRepositoryImpl(prisma, bus),
    new NotificationTemplateRepositoryImpl(prisma), new NotificationPreferenceRepositoryImpl(prisma));
  const handler = new SendNotificationHandler(notifications);
  const preferences = new PreferenceService(new NotificationPreferenceRepositoryImpl(prisma));
  const deliveries = new EmailDeliveryRepositoryImpl(prisma, bus);
  let app: FastifyInstance;
  beforeAll(async () => { app = Fastify({ logger: false }); await registerNotificationOutboxEventRoutes(app, prisma); });
  afterEach(async () => {
    const rows = await prisma.notification.findMany({ where: { workspaceId: { in: workspaces } }, select: { id: true } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: rows.map(row => row.id) } } });
    await prisma.notification.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.notificationRequest.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.notificationPreference.deleteMany({ where: { workspaceId: { in: workspaces } } });
    workspaces.length = 0;
  });
  afterAll(async () => { await app.close(); await prisma.$disconnect(); });

  function context() {
    const workspaceId = randomUUID(), recipientId = randomUUID(); workspaces.push(workspaceId);
    const request = { requestId: randomUUID(), workspaceId, recipientId, type: NotificationType.SYSTEM_ALERT,
      title: 'Durable title', content: 'Durable body', data: { a: 1, b: 2 } };
    const accepted = new Map<string, string>();
    const send = vi.fn(async (message: Parameters<IChannelProvider['send']>[0]): Promise<SendResult> => {
      const payload = JSON.stringify({ from: message.senderEmail, to: message.recipientEmail,
        subject: message.subject, html: message.content });
      if (accepted.has(message.idempotencyKey)) expect(accepted.get(message.idempotencyKey)).toBe(payload);
      accepted.set(message.idempotencyKey, payload);
      return { success: true, messageId: message.idempotencyKey };
    });
    const provider: IRecoverableEmailProvider = { providerName: 'test-idempotent', senderEmail: 'sender@example.com', send };
    const lookup = { findEmail: vi.fn().mockResolvedValue('original@example.com') };
    const worker = new EmailDeliveryService(deliveries, provider, lookup);
    const enqueue = () => handler.handle(request);
    return { request, provider, send, accepted, lookup, worker, enqueue };
  }
  const webhook = (input: object) => app.inject({ method: 'POST', url: '/event-outbox/events', payload: input });
  async function due(id: string) {
    await prisma.emailDelivery.update({ where: { notificationId: id }, data: { nextAttemptAt: new Date(0) } });
  }

  it('reconciles a non-idempotent prepared attempt without resending after an uncertain response', async () => {
    const c = context(); const id = await emailId(c);
    c.send.mockResolvedValue({ success: false, retryable: true, error: 'Uncertain capture' });
    const worker = new EmailDeliveryService(deliveries, { ...c.provider, supportsIdempotency: false }, c.lookup);
    await worker.runBatch(); expect(c.send).toHaveBeenCalledOnce();
    await due(id); await worker.runBatch();
    expect(c.send).toHaveBeenCalledOnce();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } })).status).toBe('RECONCILIATION_REQUIRED');
  });

  it('reconciles a non-idempotent attempt after a crash between preparation and sending', async () => {
    const c = context(); const id = await emailId(c); const [claim] = await deliveries.claim(1);
    await deliveries.prepare(claim, { idempotencyKey: id, recipientId: c.request.recipientId,
      recipientEmail: 'developer@example.test', senderEmail: 'sender@example.test', subject: 'Crash test', content: 'Body' },
      c.provider.providerName, false);
    await prisma.emailDelivery.update({ where: { notificationId: id }, data: { leaseExpiresAt: new Date(0) } });
    await new EmailDeliveryService(deliveries, { ...c.provider, supportsIdempotency: false }, c.lookup).runBatch();
    expect(c.send).not.toHaveBeenCalled();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } })).status).toBe('RECONCILIATION_REQUIRED');
  });
  async function emailId(c: ReturnType<typeof context>) {
    const result = await c.enqueue(); return result.data!.find(row => row.channel === NotificationChannel.EMAIL)!.id;
  }

  it('deduplicates concurrent internal commands and returns the same durable IDs', async () => {
    const c = context(); const results = await Promise.all(Array.from({ length: 6 }, () => c.enqueue()));
    expect(new Set(results.map(result => JSON.stringify(result.data!.map(row => row.id)))).size).toBe(1);
    expect(await prisma.notification.count({ where: { workspaceId: c.request.workspaceId } })).toBe(2);
    expect(await prisma.emailDelivery.count()).toBe(1);
    expect(await prisma.notificationRequest.count({ where: { id: c.request.requestId } })).toBe(1);
    expect(c.send).not.toHaveBeenCalled();
    const reordered = await handler.handle({ ...c.request, data: { b: 2, a: 1 } });
    expect(reordered.data!.map(row => row.id)).toEqual(results[0].data!.map(row => row.id));
    await expect(handler.handle({ ...c.request, content: 'Different input' })).rejects.toBeInstanceOf(NotificationRequestConflictError);
    await expect(handler.handle({ ...c.request, workspaceId: randomUUID() })).rejects.toBeInstanceOf(NotificationRequestConflictError);
  });

  it('keeps a suppressed internal request suppressed even if preferences later enable delivery', async () => {
    const c = context();
    await preferences.updateGlobalPreferences(c.request.recipientId, c.request.workspaceId, { email: false, inApp: false });
    expect((await c.enqueue()).data).toEqual([]);
    await preferences.updateGlobalPreferences(c.request.recipientId, c.request.workspaceId, { email: true, inApp: true });
    expect((await c.enqueue()).data).toEqual([]);
    expect((await handler.handle({ ...c.request, requestId: randomUUID() })).data).toHaveLength(2);
  });

  it('rejects missing request identity at runtime before any persistence', async () => {
    const c = context();
    // @ts-expect-error Simulate an untyped internal caller.
    await expect(handler.handle({ ...c.request, requestId: undefined })).rejects.toThrow();
    expect(await prisma.notification.count({ where: { workspaceId: c.request.workspaceId } })).toBe(0);
  });

  it.each(['expense.status_changed', 'approval.workflow_started', 'budget.threshold_exceeded'])('event handler %s reuses the source event identity', async sourceType => {
    const c = context();
    class SourceEvent extends DomainEvent {
      expenseId = randomUUID(); workspaceId = c.request.workspaceId; expenseOwnerId = c.request.recipientId;
      requesterId = c.request.recipientId; workflowId = randomUUID(); changedBy = c.request.recipientId;
      budgetId = randomUUID(); createdBy = c.request.recipientId;
      oldStatus = 'PENDING'; newStatus = 'APPROVED';
      constructor() { super(randomUUID(), 'Source'); }
      get eventType() { return sourceType; }
      getPayload() { return {}; }
    }
    const event = new SourceEvent(); const events = new NotificationEventHandler(notifications);
    const process = sourceType === 'expense.status_changed'
      ? () => events.handleExpenseStatusChanged.handle(event)
      : sourceType === 'approval.workflow_started' ? () => events.handleApprovalStarted.handle(event)
      : () => events.handleBudgetExceeded.handle(event);
    await process(); await process();
    expect(await prisma.notificationRequest.count({ where: { id: event.eventId } })).toBe(1);
    expect(await prisma.notification.count({ where: { workspaceId: c.request.workspaceId } })).toBe(2);
  });

  it('reconciles credential changes and exhausted retry budgets without calling a provider', async () => {
    const c = context(); const id = await emailId(c); const [claim] = await deliveries.claim(1);
    await deliveries.prepare(claim, { idempotencyKey: id, recipientId: c.request.recipientId,
      recipientEmail: 'original@example.com', senderEmail: 'sender@example.com', subject: c.request.title, content: c.request.content }, 'another-provider');
    await prisma.emailDelivery.update({ where: { notificationId: id }, data: { leaseExpiresAt: new Date(0) } });
    await c.worker.runBatch(); expect(c.send).not.toHaveBeenCalled();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } })).status).toBe('RECONCILIATION_REQUIRED');
    const second = context(); const secondId = await emailId(second);
    await prisma.emailDelivery.update({ where: { notificationId: secondId }, data: { attempts: 9 } });
    second.lookup.findEmail.mockRejectedValue(new Error('Identity temporarily down'));
    await second.worker.runBatch(); expect(second.send).not.toHaveBeenCalled();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: secondId } })).status).toBe('RECONCILIATION_REQUIRED');
  });

  it('records missing recipients as terminal failures and lookup outages as retryable jobs', async () => {
    const c = context(); const id = await emailId(c); c.lookup.findEmail.mockResolvedValue(null);
    await c.worker.runBatch(); expect(c.send).not.toHaveBeenCalled();
    expect((await prisma.notification.findUniqueOrThrow({ where: { id } })).status).toBe('FAILED');
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } })).status).toBe('FAILED');
    const second = context(); const secondId = await emailId(second);
    second.lookup.findEmail.mockRejectedValue(new Error('Identity temporarily down'));
    await second.worker.runBatch(); expect(second.send).not.toHaveBeenCalled();
    const job = await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: secondId } });
    expect(job.status).toBe('PENDING'); expect(job.message).toBeNull();
  });

  it('rolls back receipt, notifications and jobs together on outbox failure', async () => {
    const c = context();
    await prisma.$executeRawUnsafe(`ALTER TABLE notification_dispatch.outbox_event ADD CONSTRAINT durable_reject_initial CHECK (payload->>'workspaceId' <> '${c.request.workspaceId}')`);
    try {
      await expect(c.enqueue()).rejects.toThrow();
      expect(await prisma.notificationRequest.findUnique({ where: { id: c.request.requestId } })).toBeNull();
      expect(await prisma.emailDelivery.count()).toBe(0);
      expect(await prisma.notification.count({ where: { workspaceId: c.request.workspaceId } })).toBe(0);
    } finally { await prisma.$executeRawUnsafe('ALTER TABLE notification_dispatch.outbox_event DROP CONSTRAINT durable_reject_initial'); }
    expect((await c.enqueue()).data).toHaveLength(2);
  });

  it('recovers a crash after provider acceptance using the same key and frozen address/content', async () => {
    const c = context(); const id = await emailId(c); const [claim] = await deliveries.claim(1);
    const message = { idempotencyKey: id, recipientId: c.request.recipientId, recipientEmail: 'original@example.com',
      senderEmail: 'sender@example.com', subject: c.request.title, content: c.request.content };
    await deliveries.prepare(claim, message, c.provider.providerName);
    await c.provider.send(message); // Provider accepted; process dies before outcome write.
    await prisma.emailDelivery.update({ where: { notificationId: id }, data: { leaseExpiresAt: new Date(0) } });
    c.lookup.findEmail.mockResolvedValue('changed@example.com');
    const restartedWorker = new EmailDeliveryService(deliveries,
      { ...c.provider, senderEmail: 'changed-sender@example.com' }, c.lookup);
    await notifications.markAsRead(id, c.request.recipientId, c.request.workspaceId);
    await restartedWorker.runBatch();
    expect(c.lookup.findEmail).not.toHaveBeenCalled(); expect(c.send).toHaveBeenCalledTimes(2);
    expect(c.accepted.size).toBe(1);
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id } });
    expect(stored.status).toBe('READ'); expect(stored.sentAt).not.toBeNull();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } })).status).toBe('DELIVERED');
    expect(await prisma.outboxEvent.count({ where: { aggregateId: id, eventType: 'notification.sent' } })).toBe(1);
    expect(await deliveries.complete(claim, true)).toBe(false);
  });

  it('retries an accepted delivery after its outcome transaction fails without duplicating provider acceptance', async () => {
    const c = context(); const id = await emailId(c);
    await prisma.$executeRawUnsafe(`ALTER TABLE notification_dispatch.outbox_event ADD CONSTRAINT durable_reject_outcome CHECK (aggregate_id <> '${id}' OR event_type <> 'notification.sent')`);
    try {
      await c.worker.runBatch();
      expect((await prisma.notification.findUniqueOrThrow({ where: { id } })).sentAt).toBeNull();
      expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } })).status).toBe('PENDING');
    } finally { await prisma.$executeRawUnsafe('ALTER TABLE notification_dispatch.outbox_event DROP CONSTRAINT durable_reject_outcome'); }
    await due(id); await c.worker.runBatch();
    expect(c.send).toHaveBeenCalledTimes(2); expect(c.accepted.size).toBe(1);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id } })).status).toBe('SENT');
    expect(await prisma.outboxEvent.count({ where: { aggregateId: id, eventType: 'notification.sent' } })).toBe(1);
  });

  it('parallel worker claims are disjoint and expired owners cannot mutate a new claim', async () => {
    const first = context(), second = context(); await first.enqueue(); await second.enqueue();
    const [a, b] = await Promise.all([deliveries.claim(1), deliveries.claim(1)]);
    expect(a[0].notificationId).not.toBe(b[0].notificationId);
    await prisma.emailDelivery.update({ where: { notificationId: a[0].notificationId }, data: { leaseExpiresAt: new Date(0) } });
    const [replacement] = await deliveries.claim(1);
    expect(replacement.notificationId).toBe(a[0].notificationId);
    expect(await deliveries.complete(a[0], true)).toBe(false);
    expect(await deliveries.retry(a[0], 'late')).toBe(false);
    expect(await deliveries.load(a[0])).toBeNull();
  });

  it('never retries beyond the safe provider window', async () => {
    const c = context(); const id = await emailId(c); const [claim] = await deliveries.claim(1);
    await deliveries.prepare(claim, { idempotencyKey: id, recipientId: c.request.recipientId,
      recipientEmail: 'original@example.com', senderEmail: 'sender@example.com', subject: c.request.title, content: c.request.content }, c.provider.providerName);
    await prisma.emailDelivery.update({ where: { notificationId: id }, data: { leaseExpiresAt: new Date(0), retryDeadline: new Date(0) } });
    await c.worker.runBatch();
    expect(c.send).not.toHaveBeenCalled();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } })).status).toBe('RECONCILIATION_REQUIRED');
    expect((await prisma.notification.findUniqueOrThrow({ where: { id } })).status).toBe('PENDING');
  });

  it('backs off retryable provider failures and records terminal rejections atomically', async () => {
    const c = context(); const id = await emailId(c);
    c.send.mockResolvedValueOnce({ success: false, retryable: true });
    await c.worker.runBatch();
    const retry = await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } });
    expect(retry.status).toBe('PENDING'); expect(retry.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    c.send.mockResolvedValueOnce({ success: false, messageId: 'unused' });
    await due(id); await c.worker.runBatch();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: id } })).status).toBe('FAILED');
    expect((await prisma.notification.findUniqueOrThrow({ where: { id } })).status).toBe('FAILED');
    expect(await prisma.outboxEvent.count({ where: { aggregateId: id, eventType: 'notification.failed' } })).toBe(1);
  });

  it.each(['global', 'type'] as const)('webhooks honor %s preferences and retain a durable suppressed receipt', async setting => {
    const c = context();
    if (setting === 'global') await preferences.updateGlobalPreferences(c.request.recipientId, c.request.workspaceId, { inApp: false });
    else await preferences.updateTypePreference(c.request.recipientId, c.request.workspaceId, NotificationType.SYSTEM_ALERT, { inApp: false });
    const input = { eventId: randomUUID(), eventType: 'SyncSessionFailed',
      payload: { workspaceId: c.request.workspaceId, userId: c.request.recipientId, mandatory: true } };
    const result = await webhook(input); expect(result.statusCode).toBe(200); expect(result.json().suppressed).toBe(true);
    await preferences.updateGlobalPreferences(c.request.recipientId, c.request.workspaceId, { inApp: true });
    await preferences.updateTypePreference(c.request.recipientId, c.request.workspaceId, NotificationType.SYSTEM_ALERT, { inApp: true });
    const replay = await webhook(input); expect(replay.statusCode).toBe(200); expect(replay.json()).toMatchObject({ duplicate: true, suppressed: true });
    expect(await prisma.notification.count({ where: { workspaceId: c.request.workspaceId } })).toBe(0);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: input.eventId } })).toBe(0);
    expect((await webhook({ ...input, eventType: 'BudgetAlert' })).statusCode).toBe(409);
  });

  it('routes budget thresholds to the creator and honors explicit recipients and replay', async () => {
    const c = context();
    const input = { eventId: randomUUID(), eventType: 'budget.threshold_exceeded',
      payload: { workspaceId: c.request.workspaceId, budgetId: randomUUID(), createdBy: c.request.recipientId } };
    expect((await webhook(input)).statusCode).toBe(201);
    const stored = await prisma.notification.findUniqueOrThrow({ where: { id: input.eventId } });
    expect(stored.recipientId).toBe(c.request.recipientId);
    expect(stored.type).toBe('BUDGET_ALERT');
    expect((await webhook(input)).json().duplicate).toBe(true);
    const override = { ...input, eventId: randomUUID(), payload: { ...input.payload, recipientId: randomUUID() } };
    expect((await webhook(override)).statusCode).toBe(201);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: override.eventId } })).recipientId).toBe(override.payload.recipientId);
    const missing = { ...input, eventId: randomUUID(), payload: { workspaceId: c.request.workspaceId } };
    expect((await webhook(missing)).statusCode).toBe(400);
    expect(await prisma.notificationRequest.findUnique({ where: { id: missing.eventId } })).toBeNull();
  });

  it('concurrent suppressed webhooks persist one receipt; a new event can deliver after opt-in', async () => {
    const c = context(); await preferences.updateGlobalPreferences(c.request.recipientId, c.request.workspaceId, { inApp: false });
    const input = { eventId: randomUUID(), eventType: 'BudgetAlert', payload: { workspaceId: c.request.workspaceId, userId: c.request.recipientId } };
    const results = await Promise.all(Array.from({ length: 5 }, () => webhook(input)));
    expect(results.every(result => result.statusCode === 200 && result.json().suppressed)).toBe(true);
    expect(await prisma.notificationRequest.count({ where: { id: input.eventId } })).toBe(1);
    await preferences.updateGlobalPreferences(c.request.recipientId, c.request.workspaceId, { inApp: true });
    const next = await webhook({ ...input, eventId: randomUUID() }); expect(next.statusCode).toBe(201);
    expect(await prisma.notification.count({ where: { workspaceId: c.request.workspaceId } })).toBe(1);
  });
});
