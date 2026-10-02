import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { NotificationService } from '../application/services/notification.service';
import { INotificationRepository } from '../domain/repositories/notification.repository';
import { INotificationTemplateRepository } from '../domain/repositories/notification-template.repository';
import { INotificationPreferenceRepository } from '../domain/repositories/notification-preference.repository';
import { NotificationPreference } from '../domain/entities/notification-preference.entity';
import { NotificationTemplate } from '../domain/entities/notification-template.entity';
import { NotificationType, NotificationChannel, NotificationStatus } from '../domain/enums';
import { UserId, WorkspaceId } from '../domain/value-objects';
import { InvalidNotificationDataError } from '../domain/errors/notification.errors';

const user = UserId.create(), workspace = WorkspaceId.create();
const params = { requestId: randomUUID(), recipientId: user.getValue(), workspaceId: workspace.getValue(),
  type: NotificationType.SYSTEM_ALERT, data: { name: 'Alice' }, title: 'Title', content: 'Content' };
function setup() {
  const preferences = NotificationPreference.create({ userId: user, workspaceId: workspace });
  const repository: INotificationRepository = {
    findRequest: vi.fn().mockResolvedValue(null), saveRequest: vi.fn(async (_request, values) => [...values]),
    save: vi.fn(), saveBatch: vi.fn(), mutate: vi.fn(), findById: vi.fn(), markAllAsRead: vi.fn(),
    countUnread: vi.fn(), findByRecipient: vi.fn(), findUnreadByRecipient: vi.fn(),
  };
  const templates: INotificationTemplateRepository = { save: vi.fn(), mutate: vi.fn(), findById: vi.fn(),
    findActiveTemplate: vi.fn().mockResolvedValue(null) };
  const preferenceRepository: INotificationPreferenceRepository = { save: vi.fn(), mutate: vi.fn(), findById: vi.fn(),
    findByUserAndWorkspace: vi.fn().mockResolvedValue(preferences) };
  return { service: new NotificationService(repository, templates, preferenceRepository),
    repository, templates, preferenceRepository, preferences };
}

describe('Notification service durable planning', () => {
  it('queues email intent and delivers in-app in one repository request', async () => {
    const c = setup(); const result = await c.service.send(params);
    expect(result.map(row => row.status)).toEqual([NotificationStatus.PENDING, NotificationStatus.SENT]);
    expect(c.repository.saveRequest).toHaveBeenCalledTimes(1);
    expect(c.repository.saveBatch).not.toHaveBeenCalled();
  });
  it('requires request identity even for direct service callers', async () => {
    const c = setup();
    // @ts-expect-error Simulate an untyped direct caller.
    await expect(c.service.send({ ...params, requestId: undefined })).rejects.toThrow();
    expect(c.repository.findRequest).not.toHaveBeenCalled(); expect(c.repository.saveRequest).not.toHaveBeenCalled();
  });
  it('returns an existing suppressed receipt without reevaluating preferences or templates', async () => {
    const c = setup(); vi.mocked(c.repository.findRequest).mockResolvedValue([]);
    expect(await c.service.send(params)).toEqual([]);
    expect(c.preferenceRepository.findByUserAndWorkspace).not.toHaveBeenCalled();
    expect(c.templates.findActiveTemplate).not.toHaveBeenCalled(); expect(c.repository.saveRequest).not.toHaveBeenCalled();
  });
  it('snapshots validated inputs before a caller can mutate them during an await', async () => {
    const c = setup(); const input = { ...params, data: { name: 'Alice' } };
    vi.mocked(c.preferenceRepository.findByUserAndWorkspace).mockImplementation(async () => {
      input.recipientId = UserId.create().getValue(); input.type = NotificationType.INVITATION;
      input.title = 'Changed'; input.content = 'Changed'; input.data.name = 'Changed'; return c.preferences;
    });
    const result = await c.service.send(input);
    expect(result.every(row => row.type === params.type && row.title === params.title
      && row.content === params.content && row.data?.name === 'Alice')).toBe(true);
    expect(c.repository.saveRequest).toHaveBeenCalledWith(expect.objectContaining({ recipientId: user.getValue() }), expect.any(Array));
  });
  it('propagates durable transaction failures without reporting accepted delivery', async () => {
    const c = setup(); vi.mocked(c.repository.saveRequest).mockRejectedValue(new Error('commit failed'));
    await expect(c.service.send(params)).rejects.toThrow('commit failed');
  });
  it('records opt-out decisions and leaves default preferences unpersisted', async () => {
    const c = setup(); c.preferences.updateGlobalSettings({ email: false, inApp: false });
    expect(await c.service.send(params)).toEqual([]);
    expect(c.repository.saveRequest).toHaveBeenCalledWith(expect.any(Object), []);
    vi.mocked(c.preferenceRepository.findByUserAndWorkspace).mockResolvedValue(null);
    expect(await c.service.send({ ...params, requestId: randomUUID() })).toHaveLength(2);
    expect(c.preferenceRepository.save).not.toHaveBeenCalled(); expect(c.preferenceRepository.mutate).not.toHaveBeenCalled();
  });
  it('records a missing-template email failure without creating deliverable intent for it', async () => {
    const c = setup(); const { title, content, ...input } = params;
    const result = await c.service.send(input);
    expect(result.map(row => row.status)).toEqual([NotificationStatus.FAILED, NotificationStatus.SENT]);
  });
  it('validates every rendered channel before persisting a request', async () => {
    const c = setup();
    vi.mocked(c.templates.findActiveTemplate).mockImplementation(async (_workspace, _type, channel) =>
      NotificationTemplate.create({ type: params.type, channel, name: 'Template', subjectTemplate: 'Hello {{name}}',
        bodyTemplate: channel === NotificationChannel.EMAIL ? 'Good body' : '{{missing}}' }));
    await expect(c.service.send(params)).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(c.repository.saveRequest).not.toHaveBeenCalled();
  });
  it('escapes interpolated HTML and strips dangerous rendered URL schemes', async () => {
    const c = setup();
    vi.mocked(c.templates.findActiveTemplate).mockImplementation(async (_workspace, _type, channel) =>
      NotificationTemplate.create({ type: params.type, channel, name: 'Template', subjectTemplate: 'Hello {{name}}',
        bodyTemplate: '<a href="{{link}}">{{name}}</a>' }));
    const result = await c.service.send({ ...params, data: { name: '<script>bad()</script>', link: 'javascript:bad()' } });
    expect(result[0].content).not.toContain('javascript:'); expect(result[0].content).not.toContain('<script>');
    expect(result[0].content).toContain('&lt;script&gt;');
  });
  it('does not use inherited Object properties as template variables', async () => {
    const c = setup();
    vi.mocked(c.templates.findActiveTemplate).mockImplementation(async (_workspace, _type, channel) =>
      NotificationTemplate.create({ type: params.type, channel, name: 'Template', subjectTemplate: 'Subject', bodyTemplate: '{{toString}}' }));
    await expect(c.service.send(params)).rejects.toBeInstanceOf(InvalidNotificationDataError);
    expect(c.repository.saveRequest).not.toHaveBeenCalled();
  });
  it('rejects unsupported types and unserializable data before repository access', async () => {
    const c = setup();
    // @ts-expect-error Simulate untyped use-case input.
    await expect(c.service.send({ ...params, type: 'UNKNOWN' })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    for (const data of [{ invalid: Infinity }, { invalid: () => {} }, { invalid: undefined }]) {
      await expect(c.service.send({ ...params, data })).rejects.toBeInstanceOf(InvalidNotificationDataError);
    }
    expect(c.repository.findRequest).not.toHaveBeenCalled(); expect(c.preferenceRepository.findByUserAndWorkspace).not.toHaveBeenCalled();
  });
  it('rejects invalid pagination on both list methods before repository access', async () => {
    const c = setup();
    for (const options of [{ limit: 0 }, { limit: 101 }, { offset: -1 }, { offset: 2147483648 }, { offset: 0.5 }]) {
      await expect(c.service.getNotifications(user.getValue(), workspace.getValue(), options)).rejects.toBeInstanceOf(InvalidNotificationDataError);
      await expect(c.service.getUnreadNotifications(user.getValue(), workspace.getValue(), options)).rejects.toBeInstanceOf(InvalidNotificationDataError);
    }
    expect(c.repository.findByRecipient).not.toHaveBeenCalled(); expect(c.repository.findUnreadByRecipient).not.toHaveBeenCalled();
  });
});