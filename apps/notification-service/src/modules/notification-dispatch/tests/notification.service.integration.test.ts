import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaClient } from '../../../prisma-client';
import { NotificationRepositoryImpl } from '../infrastructure/persistence/notification.repository.impl';
import { NotificationTemplateRepositoryImpl } from '../infrastructure/persistence/notification-template.repository.impl';
import { NotificationPreferenceRepositoryImpl } from '../infrastructure/persistence/notification-preference.repository.impl';
import { NotificationService, SendNotificationParams } from '../application/services/notification.service';
import { EmailDeliveryService } from '../application/services/email-delivery.service';
import { EmailDeliveryRepositoryImpl } from '../infrastructure/persistence/email-delivery.repository.impl';
import { NotificationId } from '../domain/value-objects/notification-id';
import { PreferenceService } from '../application/services/preference.service';
import { TemplateService } from '../application/services/template.service';
import { Notification } from '../domain/entities/notification.entity';
import { NotificationType, NotificationChannel, NotificationStatus } from '../domain/enums';
import { UserId, WorkspaceId } from '../domain/value-objects';
import { NotificationNotFoundError, UnauthorizedNotificationAccessError } from '../domain/errors/notification.errors';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('Notification service — PostgreSQL', () => {
  const prisma = new PrismaClient();
  const repository = new NotificationRepositoryImpl(prisma, new InMemoryEventBus());
  const workspaces: string[] = [];
  function setup() {
    const user = UserId.create(), workspace = WorkspaceId.create(); workspaces.push(workspace.getValue());
    const provider = { send: vi.fn().mockResolvedValue({ success: true }) };
    const service = new NotificationService(repository, new NotificationTemplateRepositoryImpl(prisma),
      new NotificationPreferenceRepositoryImpl(prisma));
    const delivery = new EmailDeliveryService(new EmailDeliveryRepositoryImpl(prisma, new InMemoryEventBus()),
      { ...provider, providerName: 'test-idempotent', senderEmail: 'sender@example.com' },
      { findEmail: vi.fn().mockResolvedValue('review@example.com') });
    const params = { recipientId: user.getValue(), workspaceId: workspace.getValue(), type: NotificationType.SYSTEM_ALERT,
      title: 'Title', content: 'Content', data: {} };
    async function send(input: Omit<SendNotificationParams, 'requestId'> = params) {
      const queued = await service.send({ ...input, requestId: randomUUID() });
      await delivery.runBatch();
      return Promise.all(queued.map(async row => Notification.toDTO((await repository.findById(NotificationId.fromString(row.id)))!)));
    }
    return { user, workspace, provider, service, params, send };
  }
  afterAll(async () => {
    const records = await prisma.notification.findMany({ where: { workspaceId: { in: workspaces } }, select: { id: true } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: records.map(record => record.id) } } });
    await prisma.notification.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.notificationPreference.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.notificationTemplate.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.$disconnect();
  });

  it('commits pending intent and its outbox event before invoking a provider', async () => {
    const context = setup();
    context.provider.send.mockImplementation(async input => {
      const stored = await prisma.notification.findUniqueOrThrow({ where: { id: input.idempotencyKey } });
      expect(stored.status).toBe(NotificationStatus.PENDING);
      expect(await prisma.outboxEvent.count({ where: { aggregateId: stored.id, eventType: 'notification.created' } })).toBe(1);
      return { success: true };
    });
    const result = await context.send(context.params);
    const email = result.find(record => record.channel === NotificationChannel.EMAIL)!;
    expect(email.status).toBe(NotificationStatus.SENT);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: email.id, eventType: 'notification.sent' } })).toBe(1);
  });

  it('uses preference and template lifecycle changes on the next send without changing previous deliveries', async () => {
    const context = setup();
    const preferences = new PreferenceService(new NotificationPreferenceRepositoryImpl(prisma));
    const templates = new TemplateService(new NotificationTemplateRepositoryImpl(prisma));
    const access = { userId: context.user.getValue(), workspaceId: context.workspace.getValue(), role: 'ADMIN' };
    const template = await templates.createTemplate({ workspaceId: access.workspaceId, name: 'Cross workflow',
      type: context.params.type, channel: NotificationChannel.EMAIL, subjectTemplate: 'Hello {{name}}', bodyTemplate: 'Welcome {{name}}' }, access);
    await preferences.updateGlobalPreferences(access.userId, access.workspaceId, { email: false });
    const first = await context.send({ ...context.params, data: { name: 'Alice' } });
    expect(first.map(row => row.channel)).toEqual([NotificationChannel.IN_APP]);
    expect(context.provider.send).not.toHaveBeenCalled();
    await preferences.updateGlobalPreferences(access.userId, access.workspaceId, { email: true });
    const second = await context.send({ ...context.params, data: { name: 'Alice' } });
    expect(second.find(row => row.channel === NotificationChannel.EMAIL)).toMatchObject({ title: 'Hello Alice', status: NotificationStatus.SENT });
    await templates.deactivateTemplate(template.id, access);
    const third = await context.send({ workspaceId: access.workspaceId, recipientId: access.userId,
      type: context.params.type, data: {} });
    expect(third.find(row => row.channel === NotificationChannel.EMAIL)?.status).toBe(NotificationStatus.FAILED);
    expect(context.provider.send).toHaveBeenCalledTimes(1);
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: second[0].id } })).status).toBe('SENT');
  });

  it('does not invoke a provider when the initial batch outbox transaction fails', async () => {
    const context = setup();
    await prisma.$executeRawUnsafe(`ALTER TABLE notification_dispatch.outbox_event ADD CONSTRAINT workflow_reject_initial CHECK (event_type <> 'notification.created' OR payload->>'workspaceId' <> '${context.workspace.getValue()}')`);
    try {
      await expect(context.send(context.params)).rejects.toThrow();
      expect(context.provider.send).not.toHaveBeenCalled();
      expect(await prisma.notification.count({ where: { workspaceId: context.workspace.getValue() } })).toBe(0);
      expect(await prisma.outboxEvent.count({ where: { payload: { path: ['workspaceId'], equals: context.workspace.getValue() } } })).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE notification_dispatch.outbox_event DROP CONSTRAINT workflow_reject_initial');
    }
  });

  it('serializes single and bulk read races without losing timestamps or duplicating events', async () => {
    const context = setup();
    const results = await context.send(context.params);
    await prisma.notification.updateMany({ where: { workspaceId: context.workspace.getValue() }, data: { updatedAt: new Date('2000-01-01') } });
    await Promise.all([context.service.markAllAsRead(context.user.getValue(), context.workspace.getValue()),
      ...results.map(row => context.service.markAsRead(row.id, context.user.getValue(), context.workspace.getValue()))]);
    for (const row of results) {
      const stored = await prisma.notification.findUniqueOrThrow({ where: { id: row.id } });
      expect(stored.status).toBe('READ'); expect(stored.sentAt).not.toBeNull();
      expect(stored.updatedAt.getTime()).toBeGreaterThan(new Date('2000-01-01').getTime());
      expect(await prisma.outboxEvent.count({ where: { aggregateId: row.id, eventType: 'notification.read' } })).toBe(1);
    }
  });

  it('serializes repeated single-read requests into one event', async () => {
    const context = setup();
    const notification = Notification.create({ workspaceId: context.workspace, recipientId: context.user,
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.IN_APP, title: 'Title', content: 'Content' });
    await repository.save(notification);
    const result = await Promise.all(Array.from({ length: 5 }, () => context.service.markAsRead(
      notification.id.getValue(), context.user.getValue(), context.workspace.getValue())));
    expect(result.every(value => value.status === NotificationStatus.READ)).toBe(true);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: notification.id.getValue(), eventType: 'notification.read' } })).toBe(1);
  });

  it('keeps both single and bulk reads scoped to recipient and workspace', async () => {
    const context = setup(); const foreign = setup();
    const notification = Notification.create({ workspaceId: context.workspace, recipientId: context.user,
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.IN_APP, title: 'Title', content: 'Content' });
    await repository.save(notification);
    await expect(context.service.markAsRead(notification.id.getValue(), context.user.getValue(), foreign.workspace.getValue())).rejects.toBeInstanceOf(NotificationNotFoundError);
    await expect(context.service.markAsRead(notification.id.getValue(), foreign.user.getValue(), context.workspace.getValue())).rejects.toBeInstanceOf(UnauthorizedNotificationAccessError);
    await context.service.markAllAsRead(foreign.user.getValue(), context.workspace.getValue());
    expect((await repository.findById(notification.id))!.isRead()).toBe(false);
  });

  it.each([true, false])('records delivery outcome %s without overwriting an intervening read', async success => {
    const context = setup();
    context.provider.send.mockImplementation(async input => {
      await context.service.markAsRead(input.idempotencyKey, context.user.getValue(), context.workspace.getValue());
      return { success };
    });
    const email = (await context.send(context.params)).find(record => record.channel === NotificationChannel.EMAIL)!;
    expect(email.status).toBe(NotificationStatus.READ);
    expect(email.sentAt === null).toBe(!success);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: email.id, eventType: success ? 'notification.sent' : 'notification.failed' } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: email.id, eventType: 'notification.read' } })).toBe(1);
  });

  it('rolls back a scoped mutation if its outbox write fails', async () => {
    const context = setup();
    const notification = Notification.create({ workspaceId: context.workspace, recipientId: context.user,
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.IN_APP, title: 'Title', content: 'Content' });
    await repository.save(notification);
    const eventId = randomUUID();
    await prisma.outboxEvent.create({ data: { id: eventId, aggregateId: notification.id.getValue(), aggregateType: 'Notification', eventType: 'test.collision', payload: {}, status: 'PENDING' } });
    await expect(repository.mutate(notification.id, context.user, context.workspace, entity => {
      entity.markAsRead();
      Object.defineProperty(entity.domainEvents[0], 'eventId', { value: eventId });
    })).rejects.toMatchObject({ code: 'P2002' });
    expect((await repository.findById(notification.id))!.isRead()).toBe(false);
  });

  it('rolls back the whole initial batch and avoids provider calls on event collision', async () => {
    const context = setup();
    const first = Notification.create({ workspaceId: context.workspace, recipientId: context.user,
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.EMAIL, title: 'Title', content: 'Content' });
    const second = Notification.create({ workspaceId: context.workspace, recipientId: context.user,
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.IN_APP, title: 'Title', content: 'Content' });
    Object.defineProperty(second.domainEvents[0], 'eventId', { value: first.domainEvents[0].eventId });
    await expect(repository.saveBatch([first, second])).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.notification.count({ where: { workspaceId: context.workspace.getValue() } })).toBe(0);
    expect(first.domainEvents).toHaveLength(1); expect(second.domainEvents).toHaveLength(1);
  });

  it('scopes list, unread list and counts to both recipient and workspace', async () => {
    const context = setup(); const foreign = setup();
    const make = (user: UserId, workspace: WorkspaceId) => Notification.create({ workspaceId: workspace,
      recipientId: user, type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.IN_APP, title: 'Title', content: 'Content' });
    const own = make(context.user, context.workspace);
    await repository.saveBatch([own, make(foreign.user, context.workspace), make(context.user, foreign.workspace)]);
    expect((await context.service.getNotifications(context.user.getValue(), context.workspace.getValue())).items.map(item => item.id)).toEqual([own.id.getValue()]);
    expect((await context.service.getUnreadNotifications(context.user.getValue(), context.workspace.getValue())).items).toHaveLength(1);
    expect(await context.service.getUnreadCount(context.user.getValue(), context.workspace.getValue())).toBe(1);
  });
});
