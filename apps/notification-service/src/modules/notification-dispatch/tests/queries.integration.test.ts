import Fastify from 'fastify';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryEventBus } from '@expense-tracker/core';
import { PrismaClient } from '../../../prisma-client';
import errorPlugin from '../../../plugins/error';
import { NotificationRepositoryImpl } from '../infrastructure/persistence/notification.repository.impl';
import { NotificationTemplateRepositoryImpl } from '../infrastructure/persistence/notification-template.repository.impl';
import { NotificationPreferenceRepositoryImpl } from '../infrastructure/persistence/notification-preference.repository.impl';
import { NotificationService } from '../application/services/notification.service';
import { TemplateService } from '../application/services/template.service';
import { PreferenceService } from '../application/services/preference.service';
import { TemplateAccess } from '../application/services/template-access';
import { ListNotificationsHandler, GetUnreadNotificationsHandler, GetUnreadCountHandler, GetPreferencesHandler,
  CheckChannelEnabledHandler, GetTemplateByIdHandler, GetActiveTemplateHandler } from '../application/queries';
import { MarkAsReadHandler, MarkAllAsReadHandler } from '../application/commands';
import { NotificationController } from '../infrastructure/http/controllers/notification.controller';
import { registerNotificationRoutes } from '../infrastructure/http/routes/notification.routes';
import { Notification } from '../domain/entities/notification.entity';
import { NotificationTemplate } from '../domain/entities/notification-template.entity';
import { NotificationType, NotificationChannel } from '../domain/enums';
import { UserId, WorkspaceId } from '../domain/value-objects';
import { TemplateAccessDeniedError, TemplateNotFoundByIdError, InvalidNotificationDataError } from '../domain/errors/notification.errors';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('All seven query handlers — PostgreSQL', () => {
  const prisma = new PrismaClient(); const workspaces: string[] = []; const globalIds: string[] = [];
  const repository = new NotificationRepositoryImpl(prisma, new InMemoryEventBus());
  const notifications = new NotificationService(repository, new NotificationTemplateRepositoryImpl(prisma),
    new NotificationPreferenceRepositoryImpl(prisma));
  const templateRepository = new NotificationTemplateRepositoryImpl(prisma);
  const templates = new TemplateService(templateRepository);
  const preferences = new PreferenceService(new NotificationPreferenceRepositoryImpl(prisma));
  const handlers = {
    list: new ListNotificationsHandler(notifications), unread: new GetUnreadNotificationsHandler(notifications),
    count: new GetUnreadCountHandler(notifications), preferences: new GetPreferencesHandler(preferences),
    channel: new CheckChannelEnabledHandler(preferences), template: new GetTemplateByIdHandler(templates),
    active: new GetActiveTemplateHandler(templates),
  };
  function scope() {
    const user = UserId.create(), workspace = WorkspaceId.create(); workspaces.push(workspace.getValue());
    const access: TemplateAccess = { userId: user.getValue(), workspaceId: workspace.getValue(), role: 'ADMIN' };
    return { user, workspace, access, input: { recipientId: user.getValue(), workspaceId: workspace.getValue() } };
  }
  function make(context: ReturnType<typeof scope>) {
    const notification = Notification.create({ workspaceId: context.workspace, recipientId: context.user,
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.IN_APP, title: 'Title', content: 'Content' });
    notification.markAsSent(); return notification;
  }
  afterEach(() => { vi.unstubAllGlobals(); });
  afterAll(async () => {
    const rows = await prisma.notification.findMany({ where: { workspaceId: { in: workspaces } }, select: { id: true } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: rows.map(row => row.id) } } });
    await prisma.notification.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.notificationPreference.deleteMany({ where: { workspaceId: { in: workspaces } } });
    await prisma.notificationTemplate.deleteMany({ where: { OR: [{ workspaceId: { in: workspaces } }, { id: { in: globalIds } }] } });
    await prisma.$disconnect();
  });

  it('lists stable pages even when every creation timestamp ties, without leaking foreign rows', async () => {
    const context = scope(), other = scope(); const own = [make(context), make(context), make(context)];
    await repository.saveBatch([...own, make(other)]);
    await prisma.notification.updateMany({ where: { workspaceId: context.workspace.getValue() }, data: { createdAt: new Date('2026-09-30T10:00:00Z') } });
    const expected = own.map(row => row.id.getValue()).sort().reverse();
    for (let offset = 0; offset < expected.length; offset++) {
      const page = await handlers.list.handle({ ...context.input, limit: 1, offset });
      expect(page.items.map(item => item.id)).toEqual([expected[offset]]);
      expect(page).toMatchObject({ total: 3, limit: 1, offset, hasMore: offset < 2 });
      expect(page.items[0].createdAt).toBe('2026-09-30T10:00:00.000Z');
    }
    expect((await handlers.list.handle({ ...context.input, limit: 1, offset: 3 })).items).toEqual([]);
  });

  it('unread queries support later pages and count only unread rows in the same scope', async () => {
    const context = scope(); const rows = [make(context), make(context), make(context)];
    rows[0].markAsRead(); await repository.saveBatch(rows);
    const first = await handlers.unread.handle({ ...context.input, limit: 1, offset: 0 });
    const second = await handlers.unread.handle({ ...context.input, limit: 1, offset: 1 });
    expect(first.total).toBe(2); expect(first.hasMore).toBe(true);
    expect(second.total).toBe(2); expect(second.hasMore).toBe(false);
    expect(new Set([...first.items, ...second.items].map(row => row.id)).size).toBe(2);
    expect([...first.items, ...second.items].every(row => !row.isRead)).toBe(true);
    expect(await handlers.count.handle(context.input)).toBe(2);
  });

  it('reads missing preferences and channel defaults without creating rows or events', async () => {
    const context = scope();
    expect(await handlers.preferences.handle({ userId: context.access.userId, workspaceId: context.access.workspaceId })).toBeNull();
    for (const [channel, enabled] of [['email', true], ['inApp', true], ['push', false]] as const) {
      expect(await handlers.channel.handle({ userId: context.access.userId, workspaceId: context.access.workspaceId,
        type: NotificationType.SYSTEM_ALERT, channel })).toBe(enabled);
    }
    expect(await prisma.notificationPreference.count({ where: { workspaceId: context.access.workspaceId } })).toBe(0);
  });

  it('preference queries return current type overrides and preserve user/workspace isolation', async () => {
    const context = scope(), other = scope();
    await preferences.updateTypePreference(context.access.userId, context.access.workspaceId, NotificationType.SYSTEM_ALERT, { email: false });
    expect(await handlers.preferences.handle({ userId: context.access.userId, workspaceId: context.access.workspaceId })).toMatchObject({ typeSettings: { SYSTEM_ALERT: { email: false } } });
    expect(await handlers.preferences.handle({ userId: other.access.userId, workspaceId: context.access.workspaceId })).toBeNull();
    expect(await handlers.preferences.handle({ userId: context.access.userId, workspaceId: other.access.workspaceId })).toBeNull();
    expect(await handlers.channel.handle({ userId: context.access.userId, workspaceId: context.access.workspaceId, type: NotificationType.SYSTEM_ALERT, channel: 'email' })).toBe(false);
  });

  it('template-by-ID query verifies role and workspace scope and maps its DTO', async () => {
    const context = scope(), other = scope();
    const template = await templates.createTemplate({ workspaceId: context.access.workspaceId, name: 'Template',
      type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.EMAIL, subjectTemplate: 'Subject', bodyTemplate: 'Body' }, context.access);
    expect(await handlers.template.handle({ templateId: template.id, access: context.access })).toEqual(template);
    await expect(handlers.template.handle({ templateId: template.id, access: other.access })).rejects.toBeInstanceOf(TemplateNotFoundByIdError);
    await expect(handlers.template.handle({ templateId: template.id, access: { ...context.access, role: 'MEMBER' } })).rejects.toBeInstanceOf(TemplateAccessDeniedError);
  });

  it('active-template query prefers an active workspace override then a global fallback', async () => {
    const context = scope();
    const input = { name: 'Template', type: NotificationType.EXPENSE_APPROVED, channel: NotificationChannel.PUSH,
      subjectTemplate: 'Subject', bodyTemplate: 'Body' };
    const global = NotificationTemplate.create(input); globalIds.push(global.id.getValue()); await templateRepository.save(global);
    const local = await templates.createTemplate({ ...input, workspaceId: context.access.workspaceId }, context.access);
    const query = { workspaceId: context.access.workspaceId, type: input.type, channel: input.channel, access: context.access };
    expect((await handlers.active.handle(query))!.id).toBe(local.id);
    await templates.deactivateTemplate(local.id, context.access);
    expect((await handlers.active.handle(query))!.id).toBe(global.id.getValue());
    expect(await handlers.active.handle({ ...query, type: NotificationType.INVITATION, channel: NotificationChannel.EMAIL })).toBeNull();
  });

  it('query validation errors propagate without write side effects', async () => {
    const context = scope();
    await expect(handlers.list.handle({ ...context.input, offset: -1 })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    await expect(handlers.unread.handle({ ...context.input, limit: 101 })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    // @ts-expect-error Unsupported runtime channel.
    await expect(handlers.channel.handle({ userId: context.access.userId, workspaceId: context.access.workspaceId, type: NotificationType.SYSTEM_ALERT, channel: 'sms' })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(await prisma.notificationPreference.count({ where: { workspaceId: context.access.workspaceId } })).toBe(0);
  });

  it('page rows and totals share a snapshot when another connection inserts between the reads', async () => {
    const context = scope(); await repository.save(make(context));
    const reader = new PrismaClient(); let inserted = false;
    reader.$use(async (params, next) => {
      const result = await next(params);
      if (params.model === 'Notification' && params.action === 'findMany' && !inserted) {
        inserted = true;
        await prisma.notification.create({ data: { workspaceId: context.access.workspaceId, recipientId: context.access.userId,
          type: 'SYSTEM_ALERT', channel: 'IN_APP', priority: 'MEDIUM', title: 'Concurrent', content: 'Concurrent' } });
      }
      return result;
    });
    try {
      const page = await new NotificationRepositoryImpl(reader, new InMemoryEventBus())
        .findByRecipient(context.user, context.workspace);
      expect(page.items).toHaveLength(1); expect(page.total).toBe(1);
      expect(await prisma.notification.count({ where: { workspaceId: context.access.workspaceId } })).toBe(2);
    } finally { await reader.$disconnect(); }
  });

  it('actual unread route forwards pagination and rejects invalid pages before authorization', async () => {
    const context = scope(); const rows = [make(context), make(context)]; await repository.saveBatch(rows);
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { userId: context.access.userId,
      workspaceId: context.access.workspaceId, role: 'MEMBER' } })));
    vi.stubGlobal('fetch', fetch);
    const app = Fastify(); app.decorate('prisma', prisma);
    app.decorate('authenticate', async request => { request.user = { userId: context.access.userId, email: 'review@example.com' }; });
    await app.register(errorPlugin);
    await registerNotificationRoutes(app, new NotificationController(handlers.list, handlers.count, handlers.unread,
      new MarkAsReadHandler(notifications), new MarkAllAsReadHandler(notifications)));
    try {
      const response = await app.inject(`/workspaces/${context.access.workspaceId}/notifications/unread?limit=1&offset=1`);
      expect(response.statusCode).toBe(200);
      expect(response.json().data.notifications).toHaveLength(1);
      expect(response.json().data.pagination).toMatchObject({ limit: 1, offset: 1, total: 2, hasMore: false });
      expect((await app.inject(`/workspaces/${context.access.workspaceId}/notifications/unread?offset=-1`)).statusCode).toBe(400);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { await app.close(); }
  });
});
