import Fastify, { type FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auditLogRoutes } from '../infrastructure/http/routes/audit-log.routes';
import { registerAuditOutboxEventRoutes } from '../infrastructure/http/routes/outbox-event.routes';
import type { AuditLogController } from '../infrastructure/http/controllers/audit-log.controller';
import type { AuditService } from '../application/services/audit.service';

describe('audit write rate-limit boundaries', () => {
  beforeEach(() => { vi.stubEnv('NODE_ENV', 'production'); });
  afterEach(() => { vi.unstubAllEnvs(); });

  async function buildApp() {
    const app = Fastify({ logger: false });
    app.decorate('authenticate', async (request: FastifyRequest) => {
      const userId = request.headers['x-user-id'];
      if (typeof userId !== 'string') throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
      request.user = { userId, email: 'user@example.test' };
    });
    const recordExternalEvent = vi.fn(async () => ({ duplicate: false, auditLogId: randomUUID() }));
    await app.register(async (instance) => {
      await auditLogRoutes(instance, {} as AuditLogController);
      await registerAuditOutboxEventRoutes(instance, { recordExternalEvent } as unknown as AuditService);
    });
    return { app, recordExternalEvent };
  }

  it('keeps event ingestion outside the user mutation limit', async () => {
    const { app, recordExternalEvent } = await buildApp();
    try {
      for (let index = 0; index < 40; index++) {
        const response = await app.inject({ method: 'POST', url: '/event-outbox/events', payload: {
          eventId: randomUUID(), eventType: 'expense.submitted', payload: { workspaceId: randomUUID() },
        } });
        expect(response.statusCode).toBe(201);
      }
      expect(recordExternalEvent).toHaveBeenCalledTimes(40);
    } finally { await app.close(); }
  });

  it.each(['POST', 'DELETE'] as const)('limits %s per authenticated actor and authenticates first', async (method) => {
    const { app } = await buildApp();
    const url = `/workspaces/${randomUUID()}/audit-logs`;
    const firstUser = randomUUID();
    const secondUser = randomUUID();
    try {
      for (let index = 0; index < 31; index++) {
        const response = await app.inject({ method, url });
        expect(response.statusCode).toBe(401);
      }
      // Invalid input stops before authorization/persistence, but still exercises
      // the real authenticated onRequest limiter and its per-user counters.
      for (let index = 0; index < 30; index++) {
        const response = await app.inject({ method, url, headers: { 'x-user-id': firstUser }, query: { olderThanDays: 'invalid' } });
        expect(response.statusCode).toBe(400);
      }
      expect((await app.inject({ method, url, headers: { 'x-user-id': firstUser } })).statusCode).toBe(429);
      expect((await app.inject({ method, url, headers: { 'x-user-id': secondUser }, query: { olderThanDays: 'invalid' } })).statusCode).toBe(400);
    } finally { await app.close(); }
  });
});
