import Fastify, { FastifyInstance, FastifyRequest, InjectOptions } from 'fastify';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandResult } from '@core/application/command-result';
import { QueryResult } from '@core/application/query-result';
import { ResponseHelper } from '../../../shared/response.helper';
import { NotificationController, PreferenceController, TemplateController } from '../infrastructure/http/controllers';
import { registerNotificationRoutes } from '../infrastructure/http/routes/notification.routes';
import { registerPreferenceRoutes } from '../infrastructure/http/routes/preference.routes';
import { registerTemplateRoutes } from '../infrastructure/http/routes/template.routes';
import type { ListNotificationsQuery, GetUnreadCountQuery, GetUnreadNotificationsQuery,
  GetPreferencesQuery, CheckChannelEnabledQuery, GetTemplateByIdQuery, GetActiveTemplateQuery } from '../application/queries';
import type { MarkAsReadCommand, MarkAllAsReadCommand, UpdatePreferencesCommand, UpdateTypePreferenceCommand,
  CreateTemplateCommand, UpdateTemplateCommand, ActivateTemplateCommand, DeactivateTemplateCommand } from '../application/commands';
import { Notification } from '../domain/entities/notification.entity';
import { NotificationTemplate } from '../domain/entities/notification-template.entity';
import { NotificationPreference } from '../domain/entities/notification-preference.entity';
import { NotificationChannel, NotificationType } from '../domain/enums';
import { UserId, WorkspaceId } from '../domain/value-objects';

const authorization = vi.hoisted(() => ({ missing: false }));
vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async (request: FastifyRequest) => {
    if (!authorization.missing) request.workspaceMembership = {
      workspaceId: (request.params as { workspaceId: string }).workspaceId, role: 'ADMIN',
    };
  },
}));
vi.mock('@shared/middleware/role-authorization.middleware', () => ({ RolePermissions: { ADMIN_LEVEL: async () => {} } }));

function stub<I>() {
  return <O>(output: O) => ({ handle: vi.fn(async (_input: I) => output) });
}

describe('All notification controller actions through HTTP routes', () => {
  const user = UserId.create(), workspace = WorkspaceId.create();
  const userId = user.getValue(), workspaceId = workspace.getValue();
  const notification = Notification.toDTO(Notification.create({ workspaceId: workspace, recipientId: user,
    type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.IN_APP, title: 'Notice', content: 'Content' }));
  const template = NotificationTemplate.toDTO(NotificationTemplate.create({ workspaceId: workspace, name: 'Template',
    type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.EMAIL, subjectTemplate: 'Subject', bodyTemplate: 'Body' }));
  const preference = NotificationPreference.toDTO(NotificationPreference.create({ userId: user, workspaceId: workspace }));
  const page = { items: [notification], total: 1, limit: 1, offset: 0, hasMore: false };
  const createBody = { workspaceId, name: template.name, type: NotificationType.SYSTEM_ALERT,
    channel: NotificationChannel.EMAIL, subjectTemplate: template.subjectTemplate, bodyTemplate: template.bodyTemplate };
  const access = { userId, workspaceId, role: 'ADMIN' };
  const handlers = {
    list: stub<ListNotificationsQuery>()(page), count: stub<GetUnreadCountQuery>()(3),
    unread: stub<GetUnreadNotificationsQuery>()(page),
    read: stub<MarkAsReadCommand>()(CommandResult.success(notification)),
    readAll: stub<MarkAllAsReadCommand>()(CommandResult.success<void>()),
    preferences: stub<GetPreferencesQuery>()<typeof preference | null>(preference),
    updatePreferences: stub<UpdatePreferencesCommand>()(CommandResult.success(preference)),
    updateType: stub<UpdateTypePreferenceCommand>()(CommandResult.success(preference)),
    channel: stub<CheckChannelEnabledQuery>()(false),
    create: stub<CreateTemplateCommand>()(CommandResult.success(template)),
    byId: stub<GetTemplateByIdQuery>()(template), active: stub<GetActiveTemplateQuery>()<typeof template | null>(template),
    update: stub<UpdateTemplateCommand>()(CommandResult.success(template)),
    activate: stub<ActivateTemplateCommand>()(CommandResult.success(template)),
    deactivate: stub<DeactivateTemplateCommand>()(CommandResult.success(template)),
  };
  const cases: { key: keyof typeof handlers; method: NonNullable<InjectOptions['method']>; url: string; payload?: object;
    expected: object; data?: unknown; status?: number }[] = [
    { key: 'list', method: 'GET', url: `/workspaces/${workspaceId}/notifications?limit=1`,
      expected: { recipientId: userId, workspaceId, limit: 1, offset: 0 },
      data: { notifications: [notification], unreadCount: 3, pagination: { total: 1, limit: 1, offset: 0, hasMore: false } } },
    { key: 'unread', method: 'GET', url: `/workspaces/${workspaceId}/notifications/unread?limit=1`,
      expected: { recipientId: userId, workspaceId, limit: 1, offset: 0 },
      data: { notifications: [notification], pagination: { total: 1, limit: 1, offset: 0, hasMore: false } } },
    { key: 'read', method: 'PATCH', url: `/workspaces/${workspaceId}/notifications/${notification.id}/read`,
      expected: { notificationId: notification.id, userId, workspaceId }, data: notification },
    { key: 'readAll', method: 'PATCH', url: `/workspaces/${workspaceId}/notifications/read-all`,
      expected: { recipientId: userId, workspaceId } },
    { key: 'preferences', method: 'GET', url: `/workspaces/${workspaceId}/notification-preferences`,
      expected: { userId, workspaceId }, data: preference },
    { key: 'updatePreferences', method: 'PATCH', url: `/workspaces/${workspaceId}/notification-preferences`,
      payload: { email: false }, expected: { userId, workspaceId, settings: { email: false } }, data: preference },
    { key: 'updateType', method: 'PATCH', url: `/workspaces/${workspaceId}/notification-preferences/SYSTEM_ALERT`,
      payload: { inApp: false }, expected: { userId, workspaceId, type: NotificationType.SYSTEM_ALERT, settings: { inApp: false } }, data: preference },
    { key: 'channel', method: 'GET', url: `/workspaces/${workspaceId}/notification-preferences/check?type=SYSTEM_ALERT&channel=email`,
      expected: { userId, workspaceId, type: NotificationType.SYSTEM_ALERT, channel: 'email' },
      data: { type: 'SYSTEM_ALERT', channel: 'email', isEnabled: false } },
    { key: 'create', method: 'POST', url: '/admin/notification-templates', payload: createBody,
      expected: { ...createBody, access }, data: template, status: 201 },
    { key: 'byId', method: 'GET', url: `/admin/notification-templates/${template.id}`,
      expected: { templateId: template.id, access }, data: template },
    { key: 'active', method: 'GET', url: `/admin/notification-templates/active?workspaceId=${workspaceId}&type=SYSTEM_ALERT&channel=EMAIL`,
      expected: { workspaceId, type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.EMAIL, access }, data: template },
    { key: 'update', method: 'PATCH', url: `/admin/notification-templates/${template.id}`, payload: { bodyTemplate: 'Changed' },
      expected: { templateId: template.id, bodyTemplate: 'Changed', subjectTemplate: undefined, access }, data: template },
    { key: 'activate', method: 'PATCH', url: `/admin/notification-templates/${template.id}/activate`,
      expected: { templateId: template.id, access }, data: template },
    { key: 'deactivate', method: 'PATCH', url: `/admin/notification-templates/${template.id}/deactivate`,
      expected: { templateId: template.id, access }, data: template },
  ];
  let app: FastifyInstance;
  let serverLogs: string;
  beforeEach(async () => {
    vi.clearAllMocks(); authorization.missing = false;
    serverLogs = '';
    app = Fastify({ logger: { level: 'error', stream: new Writable({
      write(chunk, _encoding, callback) { serverLogs += chunk.toString(); callback(); },
    }) } });
    app.decorate('authenticate', async (request: FastifyRequest) => { request.user = { userId, email: 'actor@example.com' }; });
    app.decorate('prisma', { notificationTemplate: { findUnique: async () => ({ workspaceId }) } } as unknown as FastifyInstance['prisma']);
    await registerNotificationRoutes(app, new NotificationController(handlers.list, handlers.count, handlers.unread, handlers.read, handlers.readAll));
    await registerPreferenceRoutes(app, new PreferenceController(handlers.preferences, handlers.updatePreferences, handlers.updateType, handlers.channel));
    await registerTemplateRoutes(app, new TemplateController(handlers.create, handlers.byId, handlers.active, handlers.update, handlers.activate, handlers.deactivate));
  });
  afterEach(async () => { await app.close(); vi.unstubAllEnvs(); });

  it.each(cases)('$key forwards authenticated scope and responds with the expected DTO', async test => {
    const response = await app.inject({ method: test.method, url: test.url, payload: test.payload,
      headers: { 'x-user-id': UserId.create().getValue() } });
    expect(response.statusCode).toBe(test.status ?? 200);
    expect(response.json()).toMatchObject({ success: true, statusCode: test.status ?? 200 });
    expect(response.json().data).toEqual(test.data);
    expect(handlers[test.key].handle).toHaveBeenCalledTimes(1);
    expect(handlers[test.key].handle).toHaveBeenCalledWith(test.expected);
    if (test.key === 'list') {
      expect(handlers.count.handle).toHaveBeenCalledTimes(1);
      expect(handlers.count.handle).toHaveBeenCalledWith({ recipientId: userId, workspaceId });
    }
  });

  it.each(cases)('$key sanitizes unexpected errors from its handler', async test => {
    vi.stubEnv('NODE_ENV', 'production');
    handlers[test.key].handle.mockRejectedValueOnce(new Error('private database password'));
    const response = await app.inject({ method: test.method, url: test.url, payload: test.payload });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ success: false, statusCode: 500, message: 'An unexpected error occurred' });
    expect(response.body).not.toContain('private database password');
    expect(serverLogs).toContain('private database password');
  });

  it.each([400, 403, 404, 409])('preserves domain status %i and code', async statusCode => {
    const error = Object.assign(new Error('Safe domain message'), { statusCode, code: 'DOMAIN_RULE' });
    handlers.read.handle.mockRejectedValueOnce(error);
    const response = await app.inject({ method: 'PATCH', url: cases[2].url });
    expect(response.statusCode).toBe(statusCode);
    expect(response.json()).toMatchObject({ code: 'DOMAIN_RULE', message: 'Safe domain message' });
    expect(serverLogs).not.toContain('Safe domain message');
  });

  it('returns 404 for an absent active template', async () => {
    handlers.active.handle.mockResolvedValueOnce(null);
    expect((await app.inject(cases[10].url)).statusCode).toBe(404);
  });

  it('returns default preferences for a missing record without executing a command', async () => {
    handlers.preferences.handle.mockResolvedValueOnce(null);
    const response = await app.inject(cases[4].url);
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual({ id: null, userId, workspaceId,
      emailEnabled: true, inAppEnabled: true, pushEnabled: false, typeSettings: {} });
    expect(handlers.updatePreferences.handle).not.toHaveBeenCalled();
    expect(handlers.updateType.handle).not.toHaveBeenCalled();
  });

  it('fails closed without trusted template membership', async () => {
    authorization.missing = true;
    const response = await app.inject({ method: 'POST', url: cases[8].url, payload: createBody });
    expect(response.statusCode).toBe(403); expect(handlers.create.handle).not.toHaveBeenCalled();
  });

  it('handles a failed unread-count query without returning a partial success', async () => {
    handlers.count.handle.mockRejectedValueOnce(new Error('Connection failed'));
    const response = await app.inject(cases[0].url);
    expect(response.statusCode).toBe(500); expect(response.json().data).toBeUndefined();
  });

  it.each(['command', 'query'] as const)('sanitizes returned %s failures and rejects invalid status codes', async kind => {
    vi.stubEnv('NODE_ENV', 'production');
    app.get('/failure/:status', async (request, reply) => {
      const status = Number((request.params as { status: string }).status);
      return kind === 'command'
        ? ResponseHelper.fromCommand(reply, CommandResult.failure('private database password', undefined, status), 'Done')
        : ResponseHelper.fromQuery(reply, QueryResult.failure('private database password', status), 'Done');
    });
    for (const status of [500, 503, 200, 999, 400.5]) {
      const response = await app.inject(`/failure/${status}`);
      expect(response.statusCode).toBe(status === 503 ? 503 : 500);
      expect(response.json().message).toBe('An unexpected error occurred');
    }
    expect((await app.inject('/failure/409')).json().message).toBe('private database password');
    expect(serverLogs).toContain('private database password');
  });
});
