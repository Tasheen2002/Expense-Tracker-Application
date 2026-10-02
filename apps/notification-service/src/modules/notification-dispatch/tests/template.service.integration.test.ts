import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../../prisma-client';
import errorPlugin from '../../../plugins/error';
import { TemplateService } from '../application/services/template.service';
import { TemplateAccess } from '../application/services/template-access';
import { NotificationTemplateRepositoryImpl } from '../infrastructure/persistence/notification-template.repository.impl';
import { NotificationTemplate } from '../domain/entities/notification-template.entity';
import { NotificationType, NotificationChannel } from '../domain/enums';
import { TemplateAccessDeniedError, TemplateAlreadyExistsError, TemplateNotFoundByIdError, InvalidNotificationDataError } from '../domain/errors/notification.errors';
import { TemplateController } from '../infrastructure/http/controllers/template.controller';
import { registerTemplateRoutes } from '../infrastructure/http/routes/template.routes';
import { CreateTemplateHandler } from '../application/commands/create-template.command';
import { UpdateTemplateHandler } from '../application/commands/update-template.command';
import { ActivateTemplateHandler } from '../application/commands/activate-template.command';
import { DeactivateTemplateHandler } from '../application/commands/deactivate-template.command';
import { GetTemplateByIdHandler } from '../application/queries/get-template-by-id.query';
import { GetActiveTemplateHandler } from '../application/queries/get-active-template.query';

const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!database || database !== process.env.DATABASE_URL)('Template service — PostgreSQL and authorization', () => {
  const prisma = new PrismaClient();
  const repository = new NotificationTemplateRepositoryImpl(prisma);
  const service = new TemplateService(repository);
  const workspaces: string[] = [];
  const globals: string[] = [];
  function scope(role = 'ADMIN'): TemplateAccess {
    const workspaceId = randomUUID(); workspaces.push(workspaceId);
    return { userId: randomUUID(), workspaceId, role };
  }
  const input = { name: 'Template', type: NotificationType.SYSTEM_ALERT, channel: NotificationChannel.EMAIL,
    subjectTemplate: 'Subject', bodyTemplate: 'Body' };
  const create = (access: TemplateAccess) => service.createTemplate({ ...input, workspaceId: access.workspaceId }, access);
  afterEach(() => { vi.unstubAllGlobals(); });
  afterAll(async () => {
    await prisma.notificationTemplate.deleteMany({ where: { OR: [
      { workspaceId: { in: workspaces } }, { id: { in: globals } },
    ] } });
    await prisma.$disconnect();
  });

  it('sanitizes creation and partial updates while preserving template variables', async () => {
    const access = scope();
    const template = await service.createTemplate({ ...input, workspaceId: access.workspaceId,
      subjectTemplate: '<b>Hello {{name}}</b>', bodyTemplate: '<p onclick="bad()">Hello {{name}}</p><script>bad()</script>' }, access);
    expect(template.subjectTemplate).toBe('Hello {{name}}');
    expect(template.bodyTemplate).toBe('<p>Hello {{name}}</p>');
    const updated = await service.updateTemplate(template.id, { bodyTemplate: '<img src="https://example.com/image" onerror="bad()">' }, access);
    expect(updated.subjectTemplate).toBe(template.subjectTemplate);
    expect(updated.bodyTemplate).not.toContain('onerror');
  });

  it('does not commit either field if sanitization leaves another field invalid', async () => {
    const access = scope(); const template = await create(access);
    await expect(service.updateTemplate(template.id, { subjectTemplate: 'Changed', bodyTemplate: '<script>bad()</script>' }, access))
      .rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(await service.getTemplateById(template.id, access)).toEqual(template);
  });

  it('preserves independent fields during concurrent updates and activation changes', async () => {
    const access = scope(); const template = await create(access);
    await Promise.all([
      service.updateTemplate(template.id, { subjectTemplate: 'New subject' }, access),
      service.updateTemplate(template.id, { bodyTemplate: 'New body' }, access),
      service.deactivateTemplate(template.id, access),
    ]);
    expect(await service.getTemplateById(template.id, access)).toMatchObject({ subjectTemplate: 'New subject', bodyTemplate: 'New body', isActive: false });
  });

  it('returns one success and a typed conflict for concurrent duplicate creation', async () => {
    const access = scope();
    const results = await Promise.allSettled([create(access), create(access)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find(result => result.status === 'rejected');
    expect(failure && failure.status === 'rejected' && failure.reason).toBeInstanceOf(TemplateAlreadyExistsError);
    expect(await prisma.notificationTemplate.count({ where: { workspaceId: access.workspaceId } })).toBe(1);
  });

  it('denies member access and mismatched workspace creation', async () => {
    const access = scope('MEMBER');
    await expect(create(access)).rejects.toBeInstanceOf(TemplateAccessDeniedError);
    await expect(service.createTemplate({ ...input, workspaceId: randomUUID() }, scope())).rejects.toBeInstanceOf(TemplateAccessDeniedError);
    expect(await prisma.notificationTemplate.count({ where: { workspaceId: access.workspaceId } })).toBe(0);
  });

  it('rejects foreign ID reads and every foreign ID mutation', async () => {
    const access = scope(); const other = scope(); const template = await create(access);
    for (const operation of [
      () => service.getTemplateById(template.id, other),
      () => service.updateTemplate(template.id, { subjectTemplate: 'Foreign' }, other),
      () => service.activateTemplate(template.id, other),
      () => service.deactivateTemplate(template.id, other),
    ]) await expect(operation()).rejects.toBeInstanceOf(TemplateNotFoundByIdError);
    expect(await service.getTemplateById(template.id, access)).toEqual(template);
  });

  it('keeps global fallback readable through an authorized workspace but denies global management', async () => {
    const access = scope();
    const global = NotificationTemplate.create({ ...input, type: NotificationType.APPROVAL_REQUIRED, channel: NotificationChannel.PUSH });
    globals.push(global.id.getValue()); await repository.save(global);
    expect(await service.getActiveTemplate(access.workspaceId, global.type, global.channel, access)).toMatchObject({ id: global.id.getValue(), workspaceId: null });
    await expect(service.createTemplate(input, access)).rejects.toBeInstanceOf(TemplateAccessDeniedError);
    await expect(service.getActiveTemplate(undefined, global.type, global.channel, access)).rejects.toBeInstanceOf(TemplateAccessDeniedError);
    await expect(service.updateTemplate(global.id.getValue(), { subjectTemplate: 'Changed' }, access)).rejects.toBeInstanceOf(TemplateNotFoundByIdError);
    const duplicate = NotificationTemplate.create({ ...input, type: global.type, channel: global.channel });
    await expect(repository.save(duplicate)).rejects.toBeInstanceOf(TemplateAlreadyExistsError);
  });

  it('selects workspace overrides and falls back when they are inactive', async () => {
    const access = scope(); const template = await create(access);
    expect(await service.getActiveTemplate(access.workspaceId, input.type, input.channel, access)).toMatchObject({ id: template.id });
    await service.deactivateTemplate(template.id, access);
    const result = await service.getActiveTemplate(access.workspaceId, input.type, input.channel, access);
    expect(result === null || result.workspaceId === null).toBe(true);
  });

  it('rejects unsupported read enums rather than passing them to Prisma', async () => {
    const access = scope();
    // @ts-expect-error Simulate unsupported runtime input.
    await expect(service.getActiveTemplate(access.workspaceId, 'UNKNOWN', input.channel, access)).rejects.toBeInstanceOf(InvalidNotificationDataError);
  });

  async function appFor(access: TemplateAccess, role: string) {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const workspaceId = String(url).split('/workspaces/')[1].split('/')[0];
      return new Response(JSON.stringify({ data: { workspaceId, userId: access.userId, role } }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const app = Fastify(); app.decorate('prisma', prisma);
    app.decorate('authenticate', async request => {
      request.user = { userId: access.userId, email: 'review@example.com' };
    });
    await app.register(errorPlugin);
    const controller = new TemplateController(new CreateTemplateHandler(service), new GetTemplateByIdHandler(service),
      new GetActiveTemplateHandler(service), new UpdateTemplateHandler(service), new ActivateTemplateHandler(service), new DeactivateTemplateHandler(service));
    await registerTemplateRoutes(app, controller);
    return { app, fetchMock };
  }

  it('actual ID routes authorize the stored workspace despite a forged query workspace', async () => {
    const access = scope(); const template = await create(access);
    const { app, fetchMock } = await appFor(access, 'MEMBER');
    try {
      for (const [method, suffix, payload] of [
        ['GET', '', undefined], ['PATCH', '', { subjectTemplate: 'Changed' }],
        ['PATCH', '/activate', undefined], ['PATCH', '/deactivate', undefined],
      ] as const) {
        const response = await app.inject({ method, url: `/admin/notification-templates/${template.id}${suffix}?workspaceId=${randomUUID()}`, payload });
        expect(response.statusCode).toBe(403);
      }
      expect(fetchMock).toHaveBeenCalledTimes(4);
      for (const [url] of fetchMock.mock.calls) expect(String(url)).toContain(`/workspaces/${access.workspaceId}/`);
      expect(await service.getTemplateById(template.id, access)).toEqual(template);
    } finally { await app.close(); }
  });

  it('actual routes deny workspace omissions and return 409 for duplicate creation', async () => {
    const access = scope(); const { app, fetchMock } = await appFor(access, 'ADMIN');
    try {
      expect((await app.inject({ method: 'POST', url: '/admin/notification-templates', payload: input })).statusCode).toBe(403);
      expect((await app.inject('/admin/notification-templates/active?type=SYSTEM_ALERT&channel=EMAIL')).statusCode).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
      const first = await app.inject({ method: 'POST', url: '/admin/notification-templates', payload: { ...input, workspaceId: access.workspaceId } });
      expect(first.statusCode).toBe(201);
      const duplicate = await app.inject({ method: 'POST', url: '/admin/notification-templates', payload: { ...input, workspaceId: access.workspaceId } });
      expect(duplicate.statusCode).toBe(409);
      expect(duplicate.json().code).toBe('TEMPLATE_ALREADY_EXISTS');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally { await app.close(); }
  });
});
