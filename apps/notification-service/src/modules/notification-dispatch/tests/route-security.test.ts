import { randomUUID } from 'node:crypto';
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest, InjectOptions } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { internalAuthPlugin } from '@expense-tracker/correlation';
import { PrismaClient } from '../../../prisma-client';
import authPlugin from '../../../plugins/auth';
import errorPlugin from '../../../plugins/error';
import { buildNotificationApp } from '../../../app';
import { registerNotificationDispatchRoutes } from '../infrastructure/http/routes';

describe('Notification route guards — real authentication, authorization and rate limits', () => {
  let app: FastifyInstance;
  let userId: string, workspaceId: string, templateId: string, internalKey: string;
  let role: string, returnedWorkspace: string | undefined;
  const prisma = new PrismaClient();
  const reached = vi.fn(async (_request: FastifyRequest, reply: FastifyReply) => reply.code(204).send());
  const lookup = vi.spyOn(prisma.notificationTemplate, 'findUnique');
  const fetchIdentity = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
    const headers = options?.headers as Record<string, string>;
    const requestedWorkspace = String(url).split('/workspaces/')[1].split('/')[0];
    return new Response(JSON.stringify({ data: { userId: headers['x-user-id'],
      workspaceId: returnedWorkspace ?? requestedWorkspace, role } }));
  });
  function headers() { return { 'x-internal-api-key': internalKey, 'x-user-id': userId }; }
  function paths(): { method: NonNullable<InjectOptions['method']>; url: string; payload?: object; admin?: boolean }[] {
    return [
      { method: 'GET', url: `/api/v1/workspaces/${workspaceId}/notifications` },
      { method: 'GET', url: `/api/v1/workspaces/${workspaceId}/notifications/unread` },
      { method: 'PATCH', url: `/api/v1/workspaces/${workspaceId}/notifications/${templateId}/read` },
      { method: 'PATCH', url: `/api/v1/workspaces/${workspaceId}/notifications/read-all` },
      { method: 'GET', url: `/api/v1/workspaces/${workspaceId}/notification-preferences` },
      { method: 'PATCH', url: `/api/v1/workspaces/${workspaceId}/notification-preferences`, payload: { email: false } },
      { method: 'PATCH', url: `/api/v1/workspaces/${workspaceId}/notification-preferences/SYSTEM_ALERT`, payload: { inApp: true } },
      { method: 'GET', url: `/api/v1/workspaces/${workspaceId}/notification-preferences/check?type=SYSTEM_ALERT&channel=email` },
      { method: 'POST', url: '/api/v1/admin/notification-templates', admin: true,
        payload: { workspaceId, name: 'Template', type: 'SYSTEM_ALERT', channel: 'EMAIL', subjectTemplate: 'Subject', bodyTemplate: 'Body' } },
      { method: 'GET', url: `/api/v1/admin/notification-templates/${templateId}`, admin: true },
      { method: 'GET', url: `/api/v1/admin/notification-templates/active?workspaceId=${workspaceId}&type=SYSTEM_ALERT&channel=EMAIL`, admin: true },
      { method: 'PATCH', url: `/api/v1/admin/notification-templates/${templateId}`, payload: { subjectTemplate: 'Changed' }, admin: true },
      { method: 'PATCH', url: `/api/v1/admin/notification-templates/${templateId}/activate`, admin: true },
      { method: 'PATCH', url: `/api/v1/admin/notification-templates/${templateId}/deactivate`, admin: true },
    ];
  }
  beforeEach(async () => {
    vi.clearAllMocks(); userId = randomUUID(); workspaceId = randomUUID(); templateId = randomUUID(); internalKey = randomUUID();
    role = 'ADMIN'; returnedWorkspace = undefined;
    vi.stubEnv('NODE_ENV', 'test'); vi.stubGlobal('fetch', fetchIdentity);
    lookup.mockResolvedValue({ id: templateId, workspaceId, name: 'Template', type: 'SYSTEM_ALERT', channel: 'EMAIL',
      subjectTemplate: 'Subject', bodyTemplate: 'Body', isActive: true, createdAt: new Date(), updatedAt: new Date(), revision: 0 });
    app = Fastify(); app.decorate('prisma', prisma);
    await app.register(internalAuthPlugin, { apiKey: internalKey });
    await app.register(authPlugin); await app.register(errorPlugin);
    await registerNotificationDispatchRoutes(app, {
      notificationController: { getNotifications: reached, getUnreadNotifications: reached, markAsRead: reached, markAllAsRead: reached },
      preferenceController: { getPreferences: reached, updateGlobalPreferences: reached, updateTypePreference: reached, checkChannelEnabled: reached },
      templateController: { createTemplate: reached, getTemplateById: reached, getActiveTemplate: reached, updateTemplate: reached,
        activateTemplate: reached, deactivateTemplate: reached },
    }, prisma);
  });
  afterEach(async () => { await app.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('mounts all 14 user actions at /api/v1 and authenticates before lookup or authorization', async () => {
    for (const route of paths()) {
      expect((await app.inject({ ...route, headers: { 'x-internal-api-key': internalKey } })).statusCode).toBe(401);
    }
    expect(reached).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled(); expect(fetchIdentity).not.toHaveBeenCalled();
    for (const route of paths()) expect((await app.inject({ ...route, headers: headers() })).statusCode).toBe(204);
    expect(reached).toHaveBeenCalledTimes(14);
    expect(fetchIdentity).toHaveBeenCalledTimes(14); // Exactly one identity call per valid user request.
    expect((await app.inject({ url: paths()[0].url.replace('/api/v1', ''), headers: headers() })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: paths()[0].url, headers: headers() })).statusCode).toBe(404);
  });

  it('rejects malformed gateway actors and mismatched membership on every user action', async () => {
    for (const route of paths()) {
      expect((await app.inject({ ...route, headers: { ...headers(), 'x-user-id': 'not-a-uuid' } })).statusCode).toBe(401);
    }
    expect(fetchIdentity).not.toHaveBeenCalled(); expect(lookup).not.toHaveBeenCalled();
    returnedWorkspace = randomUUID();
    for (const route of paths()) expect((await app.inject({ ...route, headers: headers() })).statusCode).toBe(403);
    expect(reached).not.toHaveBeenCalled();
  });

  it('normalizes uppercase UUIDs before the identity membership comparison', async () => {
    workspaceId = 'abcdefab-cdef-4abc-8def-abcdefabcdef';
    returnedWorkspace = workspaceId;
    const response = await app.inject({ url: `/api/v1/workspaces/${workspaceId.toUpperCase()}/notifications`,
      headers: { ...headers(), 'x-user-id': userId.toUpperCase() } });
    expect(response.statusCode).toBe(204);
    expect(String(fetchIdentity.mock.calls[0][0])).toContain(`/workspaces/${workspaceId}/`);
    expect(reached.mock.calls[0][0].user?.userId).toBe(userId);
    expect(reached.mock.calls[0][0].params).toEqual({ workspaceId });
  });

  it('restricts all six template actions to ADMIN/OWNER while allowing member notification access', async () => {
    role = 'MEMBER';
    for (const route of paths()) expect((await app.inject({ ...route, headers: headers() })).statusCode).toBe(route.admin ? 403 : 204);
    expect(reached).toHaveBeenCalledTimes(8);
    role = 'OWNER';
    for (const route of paths().filter(route => route.admin)) expect((await app.inject({ ...route, headers: headers() })).statusCode).toBe(204);
  });

  it('uses stored template ownership even when a caller claims another workspace', async () => {
    const otherWorkspace = randomUUID();
    const route = paths()[9];
    const response = await app.inject({ ...route, url: `${route.url}?workspaceId=${otherWorkspace}`, headers: headers() });
    expect(response.statusCode).toBe(204);
    expect(String(fetchIdentity.mock.calls[0][0])).toContain(`/workspaces/${workspaceId}/`);
    expect(reached.mock.calls[0][0].workspaceMembership?.workspaceId).toBe(workspaceId);
    expect(reached.mock.calls[0][0].params).toEqual({ templateId });
  });

  it('fails closed on missing records and global template management', async () => {
    lookup.mockResolvedValueOnce(null);
    expect((await app.inject({ ...paths()[9], headers: headers() })).statusCode).toBe(404);
    expect(fetchIdentity).not.toHaveBeenCalled();
    const row = await lookup.getMockImplementation()?.({ where: { id: templateId } });
    if (!row) throw new Error('Expected fixture');
    lookup.mockResolvedValueOnce({ ...row, workspaceId: null });
    expect((await app.inject({ ...paths()[9], headers: headers() })).statusCode).toBe(403);
    const create = paths()[8];
    expect((await app.inject({ ...create, payload: { name: 'Global', type: 'SYSTEM_ALERT', channel: 'EMAIL',
      subjectTemplate: 'Subject', bodyTemplate: 'Body' }, headers: headers() })).statusCode).toBe(403);
    expect(reached).not.toHaveBeenCalled();
  });

  it('requires internal authentication for webhook traffic without requiring a gateway user', async () => {
    const webhook = { method: 'POST' as const, url: '/api/v1/event-outbox/events',
      payload: { eventId: randomUUID(), eventType: 'NoRecipientEvent' } };
    for (const value of [undefined, 'wrong-key']) {
      expect((await app.inject({ ...webhook, headers: value ? { 'x-internal-api-key': value } : {} })).statusCode).toBe(403);
    }
    expect((await app.inject({ ...webhook, headers: { 'x-internal-api-key': internalKey } })).statusCode).toBe(200);
    expect(fetchIdentity).not.toHaveBeenCalled(); expect(reached).not.toHaveBeenCalled();
  });

  it('limits 30 writes per actor before remote authorization, with independent read/actor buckets', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const route = paths()[3];
    for (let i = 0; i < 30; i++) expect((await app.inject({ ...route, headers: headers() })).statusCode).toBe(204);
    const blocked = await app.inject({ ...route, headers: { ...headers(), 'x-forwarded-for': randomUUID() } });
    expect(blocked.statusCode).toBe(429); expect(blocked.headers['retry-after']).toBeDefined();
    expect(fetchIdentity).toHaveBeenCalledTimes(30);
    expect((await app.inject({ ...paths()[0], headers: headers() })).statusCode).toBe(204);
    expect((await app.inject({ ...route, headers: { ...headers(), 'x-user-id': randomUUID() } })).statusCode).toBe(204);
    for (let i = 1; i < 300; i++) expect((await app.inject({ ...paths()[0], headers: headers() })).statusCode).toBe(204);
    expect((await app.inject({ ...paths()[0], headers: headers() })).statusCode).toBe(429);
  });

  it('limits webhook requests by peer IP, unaffected by forwarded-header spoofing', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const webhook = { method: 'POST' as const, url: '/api/v1/event-outbox/events', remoteAddress: '192.0.2.91',
      payload: { eventId: randomUUID(), eventType: 'NoRecipientEvent' }, headers: { 'x-internal-api-key': internalKey } };
    for (let i = 0; i < 100; i++) expect((await app.inject(webhook)).statusCode).toBe(200);
    expect((await app.inject({ ...webhook, headers: { ...webhook.headers, 'x-forwarded-for': '192.0.2.92' } })).statusCode).toBe(429);
    expect((await app.inject({ ...webhook, remoteAddress: '192.0.2.92' })).statusCode).toBe(200);
  });

  it('rejects the production app authentication bypass before construction', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(buildNotificationApp({ enableInternalAuth: false })).rejects.toThrow('cannot be disabled in production');
  });
});
