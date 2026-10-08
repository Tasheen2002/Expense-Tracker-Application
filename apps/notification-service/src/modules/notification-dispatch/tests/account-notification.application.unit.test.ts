import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { IAccountNotificationRepository } from '../domain/repositories/account-notification.repository';
import { ListAccountNotificationsHandler } from '../application/queries/list-account-notifications.query';
import { GetAccountNotificationPreferencesHandler } from '../application/queries/get-account-notification-preferences.query';
import { MarkAccountNotificationReadHandler } from '../application/commands/mark-account-notification-read.command';
import { UpdateAccountNotificationPreferencesHandler } from '../application/commands/update-account-notification-preferences.command';
import { AccountNotificationController } from '../infrastructure/http/controllers/account-notification.controller';
import { accountNotificationRoutes } from '../infrastructure/http/routes/account-notification.routes';
import { NotificationNotFoundError } from '../domain/errors/notification.errors';

function repository(): IAccountNotificationRepository {
  return {
    accept: vi.fn(),
    list: vi.fn(),
    markRead: vi.fn(),
    getPreferences: vi.fn(),
    setPreferences: vi.fn(),
  };
}

describe('account notification use-case boundaries', () => {
  it('rejects invalid IDs and pagination before reading or writing', async () => {
    const repo = repository();
    const actorId = randomUUID();
    await expect(
      new ListAccountNotificationsHandler(repo).handle({ actorId, limit: 101 })
    ).rejects.toThrow();
    await expect(
      new ListAccountNotificationsHandler(repo).handle({ actorId: 'invalid' })
    ).rejects.toThrow();
    await expect(
      new GetAccountNotificationPreferencesHandler(repo).handle({
        actorId: 'invalid',
      })
    ).rejects.toThrow();
    await expect(
      new MarkAccountNotificationReadHandler(repo).handle({
        actorId,
        notificationId: 'invalid',
      })
    ).rejects.toThrow();
    await expect(
      new UpdateAccountNotificationPreferencesHandler(repo).handle({
        actorId,
        settings: { inAppEnabled: true, typeSettings: { arbitrary: true } },
      })
    ).rejects.toThrow();
    expect(repo.list).not.toHaveBeenCalled();
    expect(repo.getPreferences).not.toHaveBeenCalled();
    expect(repo.markRead).not.toHaveBeenCalled();
    expect(repo.setPreferences).not.toHaveBeenCalled();
  });

  it('preserves repository failure and ownership checks instead of returning successful commands', async () => {
    const repo = repository();
    const actorId = randomUUID(),
      notificationId = randomUUID();
    vi.mocked(repo.markRead).mockRejectedValue(
      new NotificationNotFoundError(notificationId)
    );
    await expect(
      new MarkAccountNotificationReadHandler(repo).handle({
        actorId,
        notificationId,
      })
    ).rejects.toThrow(NotificationNotFoundError);
    expect(repo.markRead).toHaveBeenCalledWith(actorId, notificationId);
    vi.mocked(repo.setPreferences).mockRejectedValue(new Error('write failed'));
    await expect(
      new UpdateAccountNotificationPreferencesHandler(repo).handle({
        actorId,
        settings: { inAppEnabled: false, typeSettings: {} },
      })
    ).rejects.toThrow('write failed');
  });

  it('uses the standard controller error envelope for foreign records', async () => {
    const app = Fastify();
    const repo = repository(),
      notificationId = randomUUID();
    vi.mocked(repo.markRead).mockRejectedValue(
      new NotificationNotFoundError(notificationId)
    );
    const controller = new AccountNotificationController(
      new ListAccountNotificationsHandler(repo),
      new MarkAccountNotificationReadHandler(repo),
      new GetAccountNotificationPreferencesHandler(repo),
      new UpdateAccountNotificationPreferencesHandler(repo)
    );
    app.decorate('authenticate', async () => {});
    app.addHook('onRequest', async (request) => {
      request.user = { userId: randomUUID(), email: 'actor@example.test' };
    });
    try {
      await accountNotificationRoutes(app, controller);
      const response = await app.inject({
        method: 'PATCH',
        url: '/account/notifications/' + notificationId + '/read',
      });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        success: false,
        statusCode: 404,
        error: 'Not Found',
      });
    } finally {
      await app.close();
    }
  });
});
