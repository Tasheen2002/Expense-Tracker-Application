import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { describe, it, expect, vi } from 'vitest';
import { ListAccountAuditLogsHandler } from '../application/queries/list-account-audit-logs.query';
import { IAccountAuditLogRepository } from '../domain/repositories/account-audit-log.repository';
import { AccountAuditController } from '../infrastructure/http/controllers/account-audit.controller';
import { accountAuditRoutes } from '../infrastructure/http/routes/account-audit.routes';
import { InvalidAuditIdentityError } from '../domain/errors/audit.errors';

describe('account audit application boundary', () => {
  it('rejects invalid actors and unbounded pagination before repository access', async () => {
    const repository: IAccountAuditLogRepository = {
      saveIfAbsent: vi.fn(),
      list: vi.fn(),
    };
    const handler = new ListAccountAuditLogsHandler(repository);
    await expect(handler.handle({ actorId: 'invalid' })).rejects.toThrow(
      InvalidAuditIdentityError
    );
    await expect(
      handler.handle({ actorId: randomUUID(), offset: 2147483648 })
    ).rejects.toThrow();
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('returns the established controller error envelope without exposing server failures', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const app = Fastify();
    app.decorate('authenticate', async () => {});
    const controller = new AccountAuditController({
      handle: async () => {
        throw new Error('private repository details');
      },
    });
    // The authenticated actor is supplied by the authentication plugin in production.
    app.addHook('onRequest', async (request) => {
      request.user = { userId: randomUUID(), email: 'actor@example.test' };
    });
    try {
      await accountAuditRoutes(app, controller);
      const response = await app.inject('/account/audit-logs');
      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({
        success: false,
        statusCode: 500,
      });
      expect(response.body).not.toContain('private repository details');
    } finally {
      await app.close();
      vi.unstubAllEnvs();
    }
  });
});
