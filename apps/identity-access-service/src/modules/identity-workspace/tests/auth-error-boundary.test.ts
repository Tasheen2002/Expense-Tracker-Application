import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authPlugin from '../../../plugins/auth';
import errorPlugin from '../../../plugins/error';
import type { ISessionService } from '../application/services/session.service';

describe('authentication error boundary', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('JWT_SECRET', 'auth-boundary-regression-secret');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it.each([500, 503])('preserves backend status %i and hides private details', async (statusCode) => {
    const failure = Object.assign(new Error('private database connection details'), { statusCode });
    const sessionService: ISessionService = {
      createSession: vi.fn(), revokeSession: vi.fn(),
      isSessionValid: vi.fn().mockRejectedValue(failure),
    };
    const app = Fastify({ logger: false });
    try {
      await app.register(errorPlugin);
      await app.register(authPlugin, { sessionService });
      app.get('/protected', { onRequest: [app.authenticate] }, async () => ({ ok: true }));
      const token = app.signToken({ userId: 'user', email: 'user@example.test', sessionId: 'session' });
      const response = await app.inject({ url: '/protected', headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(statusCode);
      expect(response.json().message).toBe('An unexpected error occurred');
      expect(response.body).not.toContain('private database');
    } finally { await app.close(); }
  });

  it('rejects an invalid JWT without accessing the session backend', async () => {
    const sessionService: ISessionService = {
      createSession: vi.fn(), revokeSession: vi.fn(), isSessionValid: vi.fn(),
    };
    const app = Fastify({ logger: false });
    try {
      await app.register(errorPlugin);
      await app.register(authPlugin, { sessionService });
      app.get('/protected', { onRequest: [app.authenticate] }, async () => ({ ok: true }));
      const response = await app.inject({ url: '/protected', headers: { authorization: 'Bearer invalid' } });
      expect(response.statusCode).toBe(401);
      expect(response.json().message).toBe('Invalid or expired token');
      expect(sessionService.isSessionValid).not.toHaveBeenCalled();
    } finally { await app.close(); }
  });
});
