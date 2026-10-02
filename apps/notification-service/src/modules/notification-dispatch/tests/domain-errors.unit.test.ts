import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@core/domain/domain-error';
import * as errors from '../domain/errors/notification.errors';
import errorPlugin from '../../../plugins/error';
import { ResponseHelper } from '../../../shared/response.helper';
import { PreferenceService } from '../application/services/preference.service';
import type { INotificationPreferenceRepository } from '../domain/repositories/notification-preference.repository';

afterEach(() => { vi.unstubAllEnvs(); });

const cases = [
  [new errors.NotificationConcurrencyError(), 'NOTIFICATION_CONCURRENT_UPDATE', 409],
  [new errors.NotificationPreferenceAlreadyExistsError(), 'NOTIFICATION_PREFERENCE_ALREADY_EXISTS', 409],
  [new errors.NotificationRequestConflictError(), 'NOTIFICATION_REQUEST_CONFLICT', 409],
  [new errors.NotificationNotFoundError('n'), 'NOTIFICATION_NOT_FOUND', 404],
  [new errors.NotificationTemplateNotFoundError('EXPENSE', 'EMAIL'), 'NOTIFICATION_TEMPLATE_NOT_FOUND', 404],
  [new errors.TemplateNotFoundByIdError('t'), 'TEMPLATE_NOT_FOUND', 404],
  [new errors.TemplateAccessDeniedError(), 'TEMPLATE_ACCESS_DENIED', 403],
  [new errors.TemplateAlreadyExistsError(), 'TEMPLATE_ALREADY_EXISTS', 409],
  [new errors.NotificationPreferenceNotFoundError('u', 'w'), 'NOTIFICATION_PREFERENCE_NOT_FOUND', 404],
  [new errors.PreferenceNotFoundByIdError('p'), 'PREFERENCE_NOT_FOUND', 404],
  [new errors.NotificationSendFailedError('EMAIL', 'provider-secret'), 'NOTIFICATION_SEND_FAILED', 500],
  [new errors.InvalidNotificationDataError('title', 'empty'), 'INVALID_NOTIFICATION_DATA', 400],
  [new errors.InvalidNotificationStateError('READ', 'send'), 'INVALID_NOTIFICATION_STATE', 409],
  [new errors.InvalidIdFormatError('notification', 'bad'), 'INVALID_ID_FORMAT', 400],
  [new errors.UnauthorizedNotificationAccessError('n', 'u'), 'UNAUTHORIZED_NOTIFICATION_ACCESS', 403],
] as const;

describe('notification domain errors', () => {
  it.each(cases)('preserves the identity of %s', (error, code, statusCode) => {
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(errors.NotificationDomainError);
    expect(error.name).toBe(error.constructor.name);
    expect(error.toJSON()).toEqual({ name: error.name, code, statusCode, message: error.message });
    expect(error.stack).toContain(error.message);
  });

  it('uses distinct codes for distinct failures', () => {
    expect(new Set(cases.map(([, code]) => code)).size).toBe(cases.length);
  });

  it('reports a missing preference by its actual lookup key', async () => {
    const repository: INotificationPreferenceRepository = {
      save: vi.fn(), findById: vi.fn().mockResolvedValue(null),
      findByUserAndWorkspace: vi.fn(), mutate: vi.fn(),
    };
    const service = new PreferenceService(repository);
    const id = '123e4567-e89b-42d3-a456-426614174000';
    await expect(service.getPreferencesById(id, id, id)).rejects.toMatchObject({
      code: 'PREFERENCE_NOT_FOUND', statusCode: 404,
      message: `Notification preferences with ID '${id}' not found`,
    });
    expect(repository.save).not.toHaveBeenCalled();
  });

  describe.each(['helper', 'global'] as const)('%s HTTP error path', (path) => {
    async function request(error: unknown) {
      const app = Fastify();
      await app.register(errorPlugin);
      app.get('/', async (_request, reply) => {
        if (path === 'helper') return ResponseHelper.error(reply, error);
        throw error;
      });
      try { return await app.inject('/'); }
      finally { await app.close(); }
    }

    it('retains a client error status, message and stable code', async () => {
      const error = new errors.NotificationNotFoundError('missing');
      const response = await request(error);
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ success: false, statusCode: 404,
        message: error.message, code: error.code });
    });

    it('hides delivery-provider details in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const response = await request(new errors.NotificationSendFailedError('EMAIL', 'provider-secret'));
      expect(response.statusCode).toBe(500);
      expect(response.json().message).toBe('An unexpected error occurred');
      expect(response.body).not.toContain('provider-secret');
      expect(response.json()).not.toHaveProperty('stack');
    });

    it('keeps diagnostics available in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const response = await request(new errors.NotificationSendFailedError('EMAIL', 'provider-secret'));
      expect(response.statusCode).toBe(500);
      expect(response.json().message).toContain('provider-secret');
    });

    it.each([200, 399, 600, 400.5, '404', NaN])('rejects invalid error status %s', async (statusCode) => {
      vi.stubEnv('NODE_ENV', 'production');
      const response = await request(Object.assign(new Error('internal-detail'), { statusCode }));
      expect(response.statusCode).toBe(500);
      expect(response.json().message).toBe('An unexpected error occurred');
    });
  });
});
