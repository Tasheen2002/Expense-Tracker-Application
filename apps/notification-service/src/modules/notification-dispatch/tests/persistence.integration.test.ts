import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaClient } from '../../../prisma-client';
import { PrismaOutboxEventRepository } from '../../../repositories/outbox-event.repository';
import { databaseTime } from '../../../shared/infrastructure/persistence/database-time';
import { NotificationRepositoryImpl, NotificationPreferenceRepositoryImpl, NotificationTemplateRepositoryImpl,
  EmailDeliveryRepositoryImpl } from '../infrastructure/persistence';
import { Notification, NotificationPreference, NotificationTemplate } from '../domain/entities';
import { UserId, WorkspaceId } from '../domain/value-objects';
import { NotificationType, NotificationChannel } from '../domain/enums';
import { NotificationConcurrencyError, NotificationPreferenceAlreadyExistsError, InvalidNotificationDataError } from '../domain/errors/notification.errors';
import { NotificationService } from '../application/services/notification.service';
import { EmailDeliveryService } from '../application/services/email-delivery.service';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('All notification persistence adapters — PostgreSQL', () => {
  const prisma = new PrismaClient(), bus = new InMemoryEventBus(); const scopes: string[] = [];
  const notifications = new NotificationRepositoryImpl(prisma, bus);
  const preferences = new NotificationPreferenceRepositoryImpl(prisma), templates = new NotificationTemplateRepositoryImpl(prisma);
  const deliveries = new EmailDeliveryRepositoryImpl(prisma, bus), outbox = new PrismaOutboxEventRepository(prisma);
  afterEach(async () => {
    vi.restoreAllMocks();
    const rows = await prisma.notification.findMany({ where: { workspaceId: { in: scopes } }, select: { id: true } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: [...scopes, ...rows.map(row => row.id)] } } });
    await prisma.notification.deleteMany({ where: { workspaceId: { in: scopes } } });
    await prisma.notificationRequest.deleteMany({ where: { workspaceId: { in: scopes } } });
    await prisma.notificationPreference.deleteMany({ where: { workspaceId: { in: scopes } } });
    await prisma.notificationTemplate.deleteMany({ where: { workspaceId: { in: scopes } } });
    scopes.length = 0;
  });
  afterAll(async () => { await prisma.$disconnect(); });
  function scope() {
    const workspaceId = WorkspaceId.create(), userId = UserId.create(); scopes.push(workspaceId.getValue()); return { workspaceId, userId };
  }
  function notification(c: ReturnType<typeof scope>) {
    return Notification.create({ workspaceId: c.workspaceId, recipientId: c.userId, type: NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.IN_APP, title: 'Persistence', content: 'Persistence content' });
  }
  async function queuedEmail() {
    const c = scope(); const service = new NotificationService(notifications, templates, preferences);
    const rows = await service.send({ requestId: randomUUID(), workspaceId: c.workspaceId.getValue(), recipientId: c.userId.getValue(),
      type: NotificationType.SYSTEM_ALERT, title: 'Email title', content: 'Email body', data: {} });
    const id = rows.find(row => row.channel === NotificationChannel.EMAIL)!.id;
    const send = vi.fn().mockResolvedValue({ success: true });
    const provider = { providerName: 'test-idempotent', senderEmail: 'sender@example.com', send };
    const worker = new EmailDeliveryService(deliveries, provider, { findEmail: async () => 'recipient@example.com' });
    const message = { idempotencyKey: id, recipientId: c.userId.getValue(), recipientEmail: 'recipient@example.com',
      senderEmail: provider.senderEmail, subject: 'Email title', content: 'Email body' };
    return { ...c, id, provider, worker, message };
  }

  it('rejects a stale notification snapshot without losing a concurrent read or emitting a sent event', async () => {
    const c = scope(), value = notification(c); await notifications.save(value);
    const stale = (await notifications.findById(value.id))!;
    await notifications.mutate(value.id, c.userId, c.workspaceId, current => current.markAsRead()); stale.markAsSent();
    await expect(notifications.save(stale)).rejects.toBeInstanceOf(NotificationConcurrencyError);
    expect((await notifications.findById(value.id))!.status).toBe('READ'); expect(stale.domainEvents).toHaveLength(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: value.id.getValue(), eventType: 'notification.sent' } })).toBe(0);
  });
  it('allows one of two concurrent snapshot saves and rejects the losing revision', async () => {
    const c = scope(), value = notification(c); await notifications.save(value);
    const a = (await notifications.findById(value.id))!, b = (await notifications.findById(value.id))!;
    a.markAsRead(); b.markAsSent(); const results = await Promise.allSettled([notifications.save(a), notifications.save(b)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find(result => result.status === 'rejected');
    expect(failure?.status === 'rejected' && failure.reason).toBeInstanceOf(NotificationConcurrencyError);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: value.id.getValue(), eventType: { in: ['notification.read', 'notification.sent'] } } })).toBe(1);
  });
  it('rolls back the full batch on a stale member and keeps revision metadata usable after rollback', async () => {
    const c = scope(); const values = [notification(c), notification(c)].sort((a, b) => a.id.getValue().localeCompare(b.id.getValue()));
    await notifications.saveBatch(values);
    const first = (await notifications.findById(values[0].id))!, second = (await notifications.findById(values[1].id))!;
    await notifications.mutate(second.id, c.userId, c.workspaceId, value => value.markAsSent());
    first.markAsRead(); second.markAsRead(); await expect(notifications.saveBatch([first, second])).rejects.toBeInstanceOf(NotificationConcurrencyError);
    expect((await notifications.findById(first.id))!.status).toBe('PENDING');
    expect(await prisma.outboxEvent.count({ where: { aggregateId: first.id.getValue(), eventType: 'notification.read' } })).toBe(0);
    await notifications.save(first); expect((await notifications.findById(first.id))!.status).toBe('READ');
  });
  it('rejects a stale template save instead of undoing a locked update', async () => {
    const c = scope(); const value = NotificationTemplate.create({ workspaceId: c.workspaceId, name: 'Template',
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.EMAIL, subjectTemplate: 'Subject', bodyTemplate: 'Body' });
    await templates.save(value); const stale = (await templates.findById(value.id))!;
    await templates.mutate(value.id, c.workspaceId, current => current.updateTemplates('New subject', 'New body'));
    stale.deactivate(); await expect(templates.save(stale)).rejects.toBeInstanceOf(NotificationConcurrencyError);
    expect((await templates.findById(value.id))!.subjectTemplate).toBe('New subject');
    expect((await templates.findById(value.id))!.isActive).toBe(true);
  });
  it('rejects a stale preference save and preserves entity timestamps on creation', async () => {
    const c = scope(), value = NotificationPreference.create({ userId: c.userId, workspaceId: c.workspaceId });
    await preferences.save(value); const persisted = (await preferences.findById(value.id))!;
    expect(persisted.createdAt).toEqual(value.createdAt); expect(persisted.updatedAt).toEqual(value.updatedAt);
    await preferences.mutate(c.userId, c.workspaceId, current => current.updateGlobalSettings({ email: false }));
    persisted.updateGlobalSettings({ inApp: false });
    await expect(preferences.save(persisted)).rejects.toBeInstanceOf(NotificationConcurrencyError);
    expect((await preferences.findById(value.id))!.emailEnabled).toBe(false); expect((await preferences.findById(value.id))!.inAppEnabled).toBe(true);
  });
  it('translates duplicate preference creation into a typed conflict', async () => {
    const c = scope(); await preferences.save(NotificationPreference.create(c));
    await expect(preferences.save(NotificationPreference.create(c))).rejects.toBeInstanceOf(NotificationPreferenceAlreadyExistsError);
  });
  it('rejects channel records outside the request scope without any partial receipt', async () => {
    const c = scope(), foreign = scope(); const id = randomUUID();
    await expect(notifications.saveRequest({ id, workspaceId: c.workspaceId.getValue(), recipientId: c.userId.getValue(), fingerprint: 'a'.repeat(64) },
      [notification(foreign)])).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(await prisma.notificationRequest.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.notification.count({ where: { workspaceId: foreign.workspaceId.getValue() } })).toBe(0);
  });
  it('uses database time for email lease creation and retry windows despite an application clock skew', async () => {
    const c = await queuedEmail(), before = await databaseTime(prisma);
    vi.spyOn(Date, 'now').mockReturnValue(before.getTime() + 7 * 86400000);
    const [claim] = await deliveries.claim(1); await deliveries.prepare(claim, c.message, c.provider.providerName);
    const row = await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: c.id } });
    expect(row.leaseExpiresAt!.getTime() - before.getTime()).toBeGreaterThanOrEqual(60000);
    expect(row.leaseExpiresAt!.getTime() - before.getTime()).toBeLessThan(62000);
    expect(row.retryDeadline!.getTime() - before.getTime()).toBeLessThan(23 * 3600000 + 2000);
    expect(await deliveries.complete(claim, true)).toBe(true);
  });
  it('stops an eleventh claim after a crash at the retry budget boundary', async () => {
    const c = await queuedEmail(); await prisma.emailDelivery.update({ where: { notificationId: c.id }, data: { attempts: 10 } });
    await c.worker.runBatch(); expect(c.provider.send).not.toHaveBeenCalled();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: c.id } })).status).toBe('RECONCILIATION_REQUIRED');
  });
  it('rejects an unsafe persisted delivery key instead of contacting a provider', async () => {
    const c = await queuedEmail(); const now = await databaseTime(prisma);
    await prisma.emailDelivery.update({ where: { notificationId: c.id }, data: {
      message: { ...c.message, idempotencyKey: randomUUID() }, provider: c.provider.providerName,
      firstAttemptAt: now, retryDeadline: new Date(now.getTime() + 3600000) } });
    await c.worker.runBatch(); expect(c.provider.send).not.toHaveBeenCalled();
    expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: c.id } })).status).toBe('RECONCILIATION_REQUIRED');
  });
  it.each(['job', 'notification'])('rechecks email lease expiry after waiting for the %s row lock', async target => {
    const c = await queuedEmail(); const [claim] = await deliveries.claim(1);
    await prisma.$executeRaw`UPDATE notification_dispatch.email_deliveries SET lease_expires_at = clock_timestamp() + INTERVAL '200 milliseconds'
      WHERE notification_id = ${c.id}::uuid`;
    let locked!: () => void; const ready = new Promise<void>(resolve => { locked = resolve; });
    const blocker = prisma.$transaction(async tx => {
      if (target === 'job') await tx.$queryRaw`SELECT notification_id FROM notification_dispatch.email_deliveries WHERE notification_id = ${c.id}::uuid FOR UPDATE`;
      else await tx.$queryRaw`SELECT id FROM notification_dispatch.notifications WHERE id = ${c.id}::uuid FOR UPDATE`;
      locked(); await tx.$queryRaw`SELECT pg_sleep(0.35)::text`;
    });
    await ready; const result = await deliveries.complete(claim, true); await blocker;
    expect(result).toBe(false); expect((await prisma.notification.findUniqueOrThrow({ where: { id: c.id } })).sentAt).toBeNull();
  });
  it('honors scheduled pending outbox dates and uses database time for claims and backoff', async () => {
    const c = scope(), id = randomUUID(), now = await databaseTime(prisma);
    await prisma.outboxEvent.create({ data: { id, aggregateId: c.workspaceId.getValue(), aggregateType: 'Test', eventType: 'test',
      payload: {}, status: 'PENDING', createdAt: new Date('1900-01-01'), nextAttemptAt: new Date(now.getTime() + 3600000) } });
    expect((await outbox.findPending(1000)).map(row => row.id)).not.toContain(id);
    expect((await outbox.claimPending(1000)).map(row => row.id)).not.toContain(id);
    await prisma.outboxEvent.update({ where: { id }, data: { nextAttemptAt: new Date(0) } });
    vi.spyOn(Date, 'now').mockReturnValue(now.getTime() - 7 * 86400000);
    const [claim] = await outbox.claimPending(1); expect(new Date(claim.leaseExpiresAt!).getTime()).toBeGreaterThan(now.getTime());
    expect(await outbox.markDelivered(id, 'test://subscriber', claim.leaseToken)).toBe(true);
    expect(await outbox.incrementRetry(id, 'transient', claim.leaseToken)).toBe(true);
    const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
    expect(stored.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime()); expect(stored.deliveredTo).toEqual(['test://subscriber']);
  });
  it('refuses an outbox owner whose lease expires while waiting on the row lock', async () => {
    const c = scope(), id = randomUUID(), token = randomUUID();
    await prisma.outboxEvent.create({ data: { id, aggregateId: c.workspaceId.getValue(), aggregateType: 'Test', eventType: 'test',
      payload: {}, status: 'PROCESSING', leaseToken: token, leaseExpiresAt: new Date('2100-01-01') } });
    await prisma.$executeRaw`UPDATE notification_dispatch.outbox_event
      SET lease_expires_at = (clock_timestamp() AT TIME ZONE 'UTC') + INTERVAL '200 milliseconds' WHERE id = ${id}`;
    let locked!: () => void; const ready = new Promise<void>(resolve => { locked = resolve; });
    const blocker = prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM notification_dispatch.outbox_event WHERE id = ${id} FOR UPDATE`;
      locked(); await tx.$queryRaw`SELECT pg_sleep(0.35)::text`;
    });
    await ready; const updated = await outbox.updateStatus(id, 'PROCESSED', null, token); await blocker;
    expect(updated).toBe(false); expect((await prisma.outboxEvent.findUniqueOrThrow({ where: { id } })).status).toBe('PROCESSING');
  });
});
