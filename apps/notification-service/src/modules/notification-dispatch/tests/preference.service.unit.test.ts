import Fastify from 'fastify';
import type { AuthenticatedRequest } from '@expense-tracker/middleware';
import { describe, expect, it, vi } from 'vitest';
import { PreferenceService } from '../application/services/preference.service';
import { INotificationPreferenceRepository } from '../domain/repositories/notification-preference.repository';
import { NotificationPreference } from '../domain/entities/notification-preference.entity';
import { UserId, WorkspaceId } from '../domain/value-objects';
import { NotificationType } from '../domain/enums';
import { GetPreferencesHandler } from '../application/queries/get-preferences.query';
import { CheckChannelEnabledHandler } from '../application/queries/check-channel-enabled.query';
import { UpdatePreferencesHandler } from '../application/commands/update-preferences.command';
import { UpdateTypePreferenceHandler } from '../application/commands/update-type-preference.command';
import { PreferenceController } from '../infrastructure/http/controllers/preference.controller';
import { notificationPreferenceEnvelopeJsonSchema } from '../infrastructure/http/validation/template.schema';

const user = UserId.create(), workspace = WorkspaceId.create();
function setup() {
  const repository: INotificationPreferenceRepository = {
    save: vi.fn(), findById: vi.fn(), findByUserAndWorkspace: vi.fn().mockResolvedValue(null),
    mutate: vi.fn(async (userId, workspaceId, mutation) => {
      const entity = NotificationPreference.create({ userId, workspaceId });
      mutation(entity); return entity;
    }),
  };
  return { repository, service: new PreferenceService(repository) };
}

describe('Preference service application boundaries', () => {
  it('rejects invalid IDs before repository access', async () => {
    const { service, repository } = setup();
    await expect(service.updateGlobalPreferences('invalid', workspace.getValue(), { email: false })).rejects.toThrow();
    expect(repository.mutate).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates repository failures instead of returning false success', async () => {
    const { service, repository } = setup();
    vi.mocked(repository.mutate).mockRejectedValue(new Error('write failed'));
    await expect(service.updateGlobalPreferences(user.getValue(), workspace.getValue(), { email: false })).rejects.toThrow('write failed');
  });

  it('performs global and type mutations through the atomic contract', async () => {
    const { service, repository } = setup();
    expect(await service.updateGlobalPreferences(user.getValue(), workspace.getValue(), { email: false })).toMatchObject({ emailEnabled: false });
    expect(await service.updateTypePreference(user.getValue(), workspace.getValue(), NotificationType.SYSTEM_ALERT,
      { inApp: false })).toMatchObject({ typeSettings: { SYSTEM_ALERT: { inApp: false } } });
    expect(repository.mutate).toHaveBeenCalledTimes(2);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('serializes default GET preferences without creating a row', async () => {
    const { service, repository } = setup();
    const controller = new PreferenceController(new GetPreferencesHandler(service), new UpdatePreferencesHandler(service),
      new UpdateTypePreferenceHandler(service), new CheckChannelEnabledHandler(service));
    const app = Fastify();
    app.get<{ Params: { workspaceId: string } }>('/workspaces/:workspaceId', {
      schema: { response: { 200: notificationPreferenceEnvelopeJsonSchema } },
    }, (request, reply) => {
      request.user = { userId: user.getValue(), email: 'review@example.com' };
      return controller.getPreferences(request as AuthenticatedRequest<{ Params: { workspaceId: string } }>, reply);
    });
    try {
      const response = await app.inject(`/workspaces/${workspace.getValue()}`);
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toEqual({ id: null, userId: user.getValue(), workspaceId: workspace.getValue(),
        emailEnabled: true, inAppEnabled: true, pushEnabled: false, typeSettings: {} });
      expect(repository.mutate).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });

  it('HTTP response serialization retains type-specific overrides', async () => {
    const { service, repository } = setup();
    const preference = NotificationPreference.create({ userId: user, workspaceId: workspace });
    preference.updateTypeSetting(NotificationType.SYSTEM_ALERT, { email: false });
    vi.mocked(repository.findByUserAndWorkspace).mockResolvedValue(preference);
    const app = Fastify();
    app.get('/', { schema: { response: { 200: notificationPreferenceEnvelopeJsonSchema } } }, async () => ({
      success: true, statusCode: 200, message: 'Preferences',
      data: await service.getPreferences(user.getValue(), workspace.getValue()),
    }));
    try {
      const response = await app.inject('/');
      expect(response.statusCode).toBe(200);
      expect(response.json().data.typeSettings).toEqual({ SYSTEM_ALERT: { email: false } });
    } finally { await app.close(); }
  });
});
