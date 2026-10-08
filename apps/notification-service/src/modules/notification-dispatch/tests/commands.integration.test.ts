import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaClient } from '../../../prisma-client';
import { NotificationRepositoryImpl } from '../infrastructure/persistence/notification.repository.impl';
import { NotificationTemplateRepositoryImpl } from '../infrastructure/persistence/notification-template.repository.impl';
import { NotificationPreferenceRepositoryImpl } from '../infrastructure/persistence/notification-preference.repository.impl';
import { NotificationService } from '../application/services/notification.service';
import { TemplateService } from '../application/services/template.service';
import { PreferenceService } from '../application/services/preference.service';
import { TemplateAccess } from '../application/services/template-access';
import {
  SendNotificationHandler, MarkAsReadHandler, MarkAllAsReadHandler, CreateTemplateHandler,
  UpdateTemplateHandler, ActivateTemplateHandler, DeactivateTemplateHandler, UpdatePreferencesHandler,
  UpdateTypePreferenceHandler,
} from '../application/commands';
import { NotificationType, NotificationChannel, NotificationPriority, NotificationStatus } from '../domain/enums';
import { TemplateAccessDeniedError, TemplateAlreadyExistsError, TemplateNotFoundByIdError,
  NotificationNotFoundError, UnauthorizedNotificationAccessError, InvalidNotificationDataError } from '../domain/errors/notification.errors';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('All nine notification commands — PostgreSQL workflows', () => {
  const prisma = new PrismaClient();
  const workspaces: string[] = [];
  const templates = new TemplateService(new NotificationTemplateRepositoryImpl(prisma));
  const preferences = new PreferenceService(new NotificationPreferenceRepositoryImpl(prisma));
  const notifications = new NotificationService(new NotificationRepositoryImpl(prisma, new InMemoryEventBus()),
    new NotificationTemplateRepositoryImpl(prisma), new NotificationPreferenceRepositoryImpl(prisma));
  const handlers = {
    send: new SendNotificationHandler(notifications), read: new MarkAsReadHandler(notifications),
    readAll: new MarkAllAsReadHandler(notifications), create: new CreateTemplateHandler(templates),
    update: new UpdateTemplateHandler(templates), activate: new ActivateTemplateHandler(templates),
    deactivate: new DeactivateTemplateHandler(templates), globalPreference: new UpdatePreferencesHandler(preferences),
    typePreference: new UpdateTypePreferenceHandler(preferences),
  };
  function scope(): TemplateAccess {
    const workspaceId = randomUUID(); workspaces.push(workspaceId);
    return { userId: randomUUID(), workspaceId, role: 'ADMIN' };
  }
  const input = { name: 'Template', type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.EMAIL,
    subjectTemplate: 'Subject', bodyTemplate: 'Body' };
  const create = (access: TemplateAccess) => handlers.create.handle({ ...input, workspaceId: access.workspaceId, access });
  const send = (access: TemplateAccess) => handlers.send.handle({ requestId: randomUUID(), workspaceId: access.workspaceId, recipientId: access.userId,
    type: NotificationType.BUDGET_ALERT, data: {}, priority: NotificationPriority.HIGH, title: 'Explicit title', content: 'Explicit body' });
  afterAll(async () => {
    const rows = await prisma.notification.findMany({ where: { workspaceId: { in: workspaces } }, select: { id: true } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: rows.map(row => row.id) } } });
    await prisma.notification.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.notificationTemplate.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.notificationPreference.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.$disconnect();
  });

  it('creates, updates, deactivates and reactivates a template through all four handlers', async () => {
    const access = scope(); const created = await create(access);
    expect(created.success).toBe(true); const id = created.data!.id;
    const updated = await handlers.update.handle({ templateId: id, subjectTemplate: 'Changed', access });
    expect(updated.data).toMatchObject({ id, subjectTemplate: 'Changed', bodyTemplate: 'Body' });
    const deactivated = await handlers.deactivate.handle({ templateId: id, access });
    expect(deactivated.success).toBe(true); expect(deactivated.data!.isActive).toBe(false);
    const activated = await handlers.activate.handle({ templateId: id, access });
    expect(activated.success).toBe(true); expect(activated.data!.isActive).toBe(true);
    expect(await prisma.notificationTemplate.findUniqueOrThrow({ where: { id } })).toMatchObject({
      workspaceId: access.workspaceId, subjectTemplate: 'Changed', bodyTemplate: 'Body', isActive: true,
    });
  });

  it.each(['create', 'update', 'activate', 'deactivate'] as const)('%s rejects a non-admin context and preserves stored state', async action => {
    const access = scope(); const created = await create(access); const id = created.data!.id;
    const before = await prisma.notificationTemplate.findUniqueOrThrow({ where: { id } });
    const member = { ...access, role: 'MEMBER' };
    const operation = action === 'create' ? create(member) : action === 'update'
      ? handlers.update.handle({ templateId: id, subjectTemplate: 'Unauthorized', access: member })
      : handlers[action].handle({ templateId: id, access: member });
    await expect(operation).rejects.toBeInstanceOf(TemplateAccessDeniedError);
    expect(await prisma.notificationTemplate.findUniqueOrThrow({ where: { id } })).toEqual(before);
  });

  it.each(['update', 'activate', 'deactivate'] as const)('%s preserves workspace isolation', async action => {
    const access = scope(); const other = scope(); const created = await create(access); const id = created.data!.id;
    const operation = action === 'update' ? handlers.update.handle({ templateId: id, subjectTemplate: 'Foreign', access: other })
      : handlers[action].handle({ templateId: id, access: other });
    await expect(operation).rejects.toBeInstanceOf(TemplateNotFoundByIdError);
    expect((await templates.getTemplateById(id, access)).subjectTemplate).toBe('Subject');
  });

  it('creation preserves the typed duplicate conflict', async () => {
    const access = scope(); await create(access);
    await expect(create(access)).rejects.toBeInstanceOf(TemplateAlreadyExistsError);
  });

  it('updates global and type preferences without losing either setting', async () => {
    const access = scope();
    const global = await handlers.globalPreference.handle({ userId: access.userId, workspaceId: access.workspaceId, settings: { push: true } });
    expect(global.success).toBe(true); expect(global.data!.pushEnabled).toBe(true);
    const typed = await handlers.typePreference.handle({ userId: access.userId, workspaceId: access.workspaceId,
      type: NotificationType.SYSTEM_ALERT, settings: { email: false } });
    expect(typed.success).toBe(true);
    expect(typed.data).toMatchObject({ userId: access.userId, workspaceId: access.workspaceId, pushEnabled: true,
      typeSettings: { SYSTEM_ALERT: { email: false } } });
    expect(await preferences.isChannelEnabled(access.userId, access.workspaceId, NotificationType.SYSTEM_ALERT, 'email')).toBe(false);
  });

  it('invalid preference commands roll back first-time creation and propagate typed errors', async () => {
    const access = scope();
    // @ts-expect-error Simulate untyped command input.
    await expect(handlers.globalPreference.handle({ userId: access.userId, workspaceId: access.workspaceId, settings: { email: 'false' } })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    // @ts-expect-error Unsupported runtime type.
    await expect(handlers.typePreference.handle({ userId: access.userId, workspaceId: access.workspaceId, type: 'UNKNOWN', settings: { email: false } })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(await preferences.getPreferences(access.userId, access.workspaceId)).toBeNull();
  });

  it('send passes explicit fallback content and priority through the actual delivery workflow', async () => {
    const access = scope(); const result = await send(access);
    expect(result.success).toBe(true); expect(result.data).toHaveLength(2);
    expect(result.data!.every(record => record.title === 'Explicit title' && record.content === 'Explicit body'
      && record.priority === NotificationPriority.HIGH)).toBe(true);
    expect(result.data!.find(record => record.channel === NotificationChannel.EMAIL)?.status).toBe(NotificationStatus.PENDING);
    expect(result.data!.find(record => record.channel === NotificationChannel.IN_APP)?.status).toBe(NotificationStatus.SENT);
    expect(await prisma.notification.count({ where: { workspaceId: access.workspaceId, recipientId: access.userId } })).toBe(2);
  });

  it('read and bulk-read use actor/workspace scope and record each read once', async () => {
    const access = scope(); const other = scope(); const result = await send(access);
    const id = result.data![0].id;
    await expect(handlers.read.handle({ notificationId: id, userId: access.userId, workspaceId: other.workspaceId })).rejects.toBeInstanceOf(NotificationNotFoundError);
    await expect(handlers.read.handle({ notificationId: id, userId: other.userId, workspaceId: access.workspaceId })).rejects.toBeInstanceOf(UnauthorizedNotificationAccessError);
    await handlers.readAll.handle({ recipientId: other.userId, workspaceId: access.workspaceId });
    expect(await notifications.getUnreadCount(access.userId, access.workspaceId)).toBe(2);
    const first = await handlers.read.handle({ notificationId: id, userId: access.userId, workspaceId: access.workspaceId });
    expect(first.success).toBe(true); expect(first.data!.isRead).toBe(true);
    await handlers.read.handle({ notificationId: id, userId: access.userId, workspaceId: access.workspaceId });
    const all = await handlers.readAll.handle({ recipientId: access.userId, workspaceId: access.workspaceId });
    expect(all.success).toBe(true); expect(all.data).toBeUndefined();
    expect(await notifications.getUnreadCount(access.userId, access.workspaceId)).toBe(0);
    expect(await prisma.outboxEvent.count({ where: { aggregateId: id, eventType: 'notification.read' } })).toBe(1);
  });
});
