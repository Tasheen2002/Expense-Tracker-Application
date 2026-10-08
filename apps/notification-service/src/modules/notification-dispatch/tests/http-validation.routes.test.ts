import Fastify, { FastifyInstance, FastifyReply, FastifyRequest, InjectOptions } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerNotificationRoutes } from '../infrastructure/http/routes/notification.routes';
import { registerPreferenceRoutes } from '../infrastructure/http/routes/preference.routes';
import { registerTemplateRoutes } from '../infrastructure/http/routes/template.routes';
import { listNotificationsSchema, sendNotificationSchema } from '../infrastructure/http/validation/notification.schema';
import { createTemplateSchema, updateTemplateSchema } from '../infrastructure/http/validation/template.schema';
import { NotificationType, NotificationChannel } from '../domain/enums';

const middleware = vi.hoisted(() => ({ authorize: vi.fn(), admin: vi.fn() }));
vi.mock('@shared/middleware', () => ({ workspaceAuthorizationMiddleware: middleware.authorize }));
vi.mock('@shared/middleware/role-authorization.middleware', () => ({ RolePermissions: { ADMIN_LEVEL: middleware.admin } }));

describe('Notification HTTP validation through registered routes', () => {
  const workspace = '11111111-1111-4111-8111-111111111111';
  const id = '22222222-2222-4222-8222-222222222222';
  const unsupported = '11111111-1111-7111-8111-111111111111';
  const template = { workspaceId: workspace, name: 'Template', type: NotificationType.SYSTEM_ALERT,
    channel: NotificationChannel.EMAIL, subjectTemplate: 'Hello {{name}}', bodyTemplate: '<p>Hello</p>' };
  let app: FastifyInstance;
  const reached = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.code(204).send());
  const lookup = vi.fn(async () => ({ workspaceId: workspace }));
  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    app.decorate('authenticate', async () => {});
    app.decorate('prisma', { notificationTemplate: { findUnique: lookup } } as unknown as FastifyInstance['prisma']);
    await registerNotificationRoutes(app, { getNotifications: reached, getUnreadNotifications: reached,
      markAsRead: reached, markAllAsRead: reached });
    await registerPreferenceRoutes(app, { getPreferences: reached, updateGlobalPreferences: reached,
      updateTypePreference: reached, checkChannelEnabled: reached });
    await registerTemplateRoutes(app, { createTemplate: reached, getTemplateById: reached,
      getActiveTemplate: reached, updateTemplate: reached, activateTemplate: reached, deactivateTemplate: reached });
  });
  afterEach(async () => { await app.close(); });

  const invalid: { method: NonNullable<InjectOptions['method']>; url: string; payload?: object }[] = [
    { method: 'GET', url: `/workspaces/${unsupported}/notifications` },
    { method: 'GET', url: `/workspaces/${unsupported}/notifications/unread` },
    { method: 'PATCH', url: `/workspaces/${unsupported}/notifications/read-all` },
    { method: 'PATCH', url: `/workspaces/${workspace}/notifications/${unsupported}/read` },
    { method: 'GET', url: `/workspaces/${unsupported}/notification-preferences` },
    { method: 'PATCH', url: `/workspaces/${unsupported}/notification-preferences`, payload: { email: true } },
    { method: 'PATCH', url: `/workspaces/${workspace}/notification-preferences/UNKNOWN`, payload: { email: true } },
    { method: 'PATCH', url: `/workspaces/${workspace}/notification-preferences`, payload: { email: 'false' } },
    { method: 'PATCH', url: `/workspaces/${workspace}/notification-preferences`, payload: { push: 0 } },
    { method: 'PATCH', url: `/workspaces/${workspace}/notification-preferences/SYSTEM_ALERT`, payload: { inApp: 'true' } },
    { method: 'PATCH', url: `/workspaces/${workspace}/notification-preferences`, payload: { emali: true } },
    { method: 'GET', url: `/workspaces/${workspace}/notification-preferences/check?type=SYSTEM_ALERT&channel=EMAIL` },
    { method: 'GET', url: `/workspaces/${workspace}/notification-preferences/check?type=UNKNOWN&channel=email` },
    { method: 'GET', url: `/workspaces/${workspace}/notifications?limit=101` },
    { method: 'GET', url: `/workspaces/${workspace}/notifications?offset=2147483648` },
    { method: 'GET', url: `/workspaces/${workspace}/notifications?offset=` },
    { method: 'GET', url: `/workspaces/${workspace}/notifications?offset=1e2` },
    { method: 'GET', url: `/workspaces/${workspace}/notifications?offset=0x10` },
    { method: 'GET', url: `/workspaces/${workspace}/notifications?limit=1&limit=2` },
    { method: 'GET', url: `/workspaces/${workspace}/notifications?limti=10` },
    { method: 'POST', url: '/admin/notification-templates', payload: { ...template, name: '  ' } },
    { method: 'POST', url: '/admin/notification-templates', payload: { ...template, subjectTemplate: '\n\t' } },
    { method: 'POST', url: '/admin/notification-templates', payload: { ...template, bodyTemplate: ' ' } },
    { method: 'POST', url: '/admin/notification-templates', payload: { ...template, workspaceId: unsupported } },
    { method: 'POST', url: '/admin/notification-templates', payload: { ...template, isActive: true } },
    { method: 'GET', url: `/admin/notification-templates/${unsupported}` },
    { method: 'PATCH', url: `/admin/notification-templates/${id}`, payload: { bodyTemplate: false } },
    { method: 'PATCH', url: `/admin/notification-templates/${id}`, payload: { subjectTemplate: ' ' } },
    { method: 'PATCH', url: `/admin/notification-templates/${id}`, payload: { workspaceId: workspace } },
    { method: 'PATCH', url: `/admin/notification-templates/${unsupported}/activate` },
    { method: 'PATCH', url: `/admin/notification-templates/${unsupported}/deactivate` },
    { method: 'GET', url: `/admin/notification-templates/active?workspaceId=${unsupported}&type=SYSTEM_ALERT&channel=EMAIL` },
  ];
  it.each(invalid)('rejects $method $url before authorization, lookup or use cases', async input => {
    const response = await app.inject(input);
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ success: false, statusCode: 400, error: 'VALIDATION_ERROR' });
    expect(reached).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
    expect(middleware.authorize).not.toHaveBeenCalled();
  });

  it('normalizes only pagination numbers, preserves template whitespace and accepts actual booleans', async () => {
    expect((await app.inject(`/workspaces/${workspace}/notifications?limit=100&offset=2147483647`)).statusCode).toBe(204);
    expect(reached.mock.calls[0][0].query).toEqual({ limit: 100, offset: 2147483647 });
    expect((await app.inject(`/workspaces/${workspace}/notifications/unread`)).statusCode).toBe(204);
    expect(reached.mock.calls[1][0].query).toEqual({ limit: 50, offset: 0 });
    expect((await app.inject({ method: 'POST', url: '/admin/notification-templates', payload: template })).statusCode).toBe(204);
    expect((await app.inject({ method: 'PATCH', url: `/workspaces/${workspace}/notification-preferences`,
      payload: { email: false, inApp: true } })).statusCode).toBe(204);
    expect(reached.mock.calls[3][0].body).toEqual({ email: false, inApp: true });
    const spaced = { ...template, subjectTemplate: ' Hello ', bodyTemplate: ' <p>Hello</p> ' };
    expect(createTemplateSchema.parse(spaced)).toEqual(spaced);
    // Empty updates remain supported, matching the domain's idempotent no-op contract.
    expect(updateTemplateSchema.parse({})).toEqual({});
  });

  it('direct schema parsing rejects non-wire pagination shapes and requires durable send IDs', () => {
    for (const offset of [null, false, [], {}, '', ' ', '-1', '1.5', Number.POSITIVE_INFINITY]) {
      expect(listNotificationsSchema.safeParse({ offset }).success).toBe(false);
    }
    const send = { requestId: id, recipientId: id, workspaceId: workspace, type: NotificationType.SYSTEM_ALERT, data: {} };
    expect(sendNotificationSchema.safeParse(send).success).toBe(true);
    expect(sendNotificationSchema.safeParse({ ...send, requestId: undefined }).success).toBe(false);
    expect(sendNotificationSchema.safeParse({ ...send, channel: NotificationChannel.EMAIL }).success).toBe(false);
    expect(sendNotificationSchema.safeParse({ ...send, title: ' ' }).success).toBe(false);
  });
});
