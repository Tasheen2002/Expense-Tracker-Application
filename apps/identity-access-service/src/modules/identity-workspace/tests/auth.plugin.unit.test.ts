import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import authPlugin from '../../../plugins/auth';
import { ISessionService } from '../application/services/session.service';

describe('AuthPlugin — Pure Dependency Injection (Unit)', () => {
  let mockSessionService: ISessionService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-plugin-secret-12345';
    mockSessionService = {
      createSession: vi.fn(),
      revokeSession: vi.fn(),
      isSessionValid: vi.fn(),
    };
  });

  it('fails registration if sessionService is omitted (zero service-locator fallback)', async () => {
    const app = Fastify({ logger: false });
    // Intentionally pass empty options without sessionService
    await expect(
      app.register(authPlugin, {} as unknown as { sessionService: ISessionService })
    ).rejects.toThrow('[Auth-Plugin] FATAL: sessionService must be provided via plugin options.');
  });

  it('registers successfully when sessionService is explicitly injected', async () => {
    const app = Fastify({ logger: false });
    await app.register(authPlugin, { sessionService: mockSessionService });
    await app.ready();

    expect(typeof app.signToken).toBe('function');
    expect(typeof app.verifyToken).toBe('function');
    expect(typeof app.authenticate).toBe('function');
  });

  it('signs and verifies tokens including sessionId', async () => {
    const app = Fastify({ logger: false });
    await app.register(authPlugin, { sessionService: mockSessionService });
    await app.ready();

    const token = app.signToken({
      userId: 'u-1',
      email: 'user@test.com',
      sessionId: 'sess-abc-123',
    });

    const payload = app.verifyToken(token);
    expect(payload.userId).toBe('u-1');
    expect(payload.email).toBe('user@test.com');
    expect(payload.sessionId).toBe('sess-abc-123');
  });

  it('authenticates request when session is valid in sessionService', async () => {
    (mockSessionService.isSessionValid as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const app = Fastify({ logger: false });
    await app.register(authPlugin, { sessionService: mockSessionService });

    app.get('/protected', { preHandler: [app.authenticate] }, async (request) => {
      return { user: request.user };
    });

    const token = app.signToken({
      userId: 'u-valid',
      email: 'valid@test.com',
      sessionId: 'sess-valid-789',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.userId).toBe('u-valid');
    expect(mockSessionService.isSessionValid).toHaveBeenCalledWith('sess-valid-789');
  });

  it('rejects with 401 when session has been revoked or expired', async () => {
    (mockSessionService.isSessionValid as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const app = Fastify({ logger: false });
    await app.register(authPlugin, { sessionService: mockSessionService });

    app.get('/protected', { preHandler: [app.authenticate] }, async (request) => {
      return { user: request.user };
    });

    const token = app.signToken({
      userId: 'u-revoked',
      email: 'revoked@test.com',
      sessionId: 'sess-revoked-999',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('Session has been revoked or expired');
  });

  it('rejects with 401 when token lacks sessionId', async () => {
    const app = Fastify({ logger: false });
    await app.register(authPlugin, { sessionService: mockSessionService });

    app.get('/protected', { preHandler: [app.authenticate] }, async (request) => {
      return { user: request.user };
    });

    const tokenWithoutSession = app.signToken({
      userId: 'u-nosess',
      email: 'nosess@test.com',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${tokenWithoutSession}` },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('Invalid token: missing session identifier');
  });

  describe('Service-to-Service Internal API Key Authentication & Gateway Security', () => {
    const TEST_INTERNAL_KEY = 'test-secret-internal-key-999';

    beforeEach(() => {
      process.env.INTERNAL_API_KEY = TEST_INTERNAL_KEY;
    });

    it('strict authenticate rejects with 401 when bearer token is missing, even if x-internal-api-key is present', async () => {
      const app = Fastify({ logger: false });
      await app.register(authPlugin, { sessionService: mockSessionService });

      app.get('/user-route', { preHandler: [app.authenticate] }, async (request) => {
        return { user: request.user };
      });

      const res = await app.inject({
        method: 'GET',
        url: '/user-route',
        headers: {
          'x-internal-api-key': TEST_INTERNAL_KEY,
          'x-user-id': 'spoofed-user',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('Missing or invalid authorization header');
    });

    it('strict authenticate rejects with 401 when session is revoked, even if gateway forwards x-internal-api-key', async () => {
      (mockSessionService.isSessionValid as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const app = Fastify({ logger: false });
      await app.register(authPlugin, { sessionService: mockSessionService });

      app.get('/user-route', { preHandler: [app.authenticate] }, async (request) => {
        return { user: request.user };
      });

      const token = app.signToken({
        userId: 'u-revoked',
        email: 'revoked@test.com',
        sessionId: 'sess-revoked-123',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/user-route',
        headers: {
          authorization: `Bearer ${token}`,
          'x-internal-api-key': TEST_INTERNAL_KEY,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('Session has been revoked or expired');
      expect(mockSessionService.isSessionValid).toHaveBeenCalledWith('sess-revoked-123');
    });

    it('authenticateServiceOrUser authenticates service principal when matching x-internal-api-key is provided without bearer', async () => {
      const app = Fastify({ logger: false });
      await app.register(authPlugin, { sessionService: mockSessionService });

      app.get('/inter-service-check', { preHandler: [app.authenticateServiceOrUser] }, async (request) => {
        return { user: request.user };
      });

      const res = await app.inject({
        method: 'GET',
        url: '/inter-service-check',
        headers: {
          'x-internal-api-key': TEST_INTERNAL_KEY,
          'x-user-id': 'service-actor-123',
          'x-user-email': 'service-actor@test.internal',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.user.userId).toBe('service-actor-123');
      expect(body.user.email).toBe('service-actor@test.internal');
      expect(body.user.isServicePrincipal).toBe(true);
      expect(body.user.sessionId).toBe('service-principal');
      expect(mockSessionService.isSessionValid).not.toHaveBeenCalled();
    });

    it('authenticateServiceOrUser still validates session when bearer token is present', async () => {
      (mockSessionService.isSessionValid as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const app = Fastify({ logger: false });
      await app.register(authPlugin, { sessionService: mockSessionService });

      app.get('/inter-service-check', { preHandler: [app.authenticateServiceOrUser] }, async (request) => {
        return { user: request.user };
      });

      const token = app.signToken({
        userId: 'u-user',
        email: 'user@test.com',
        sessionId: 'sess-invalid-456',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/inter-service-check',
        headers: {
          authorization: `Bearer ${token}`,
          'x-internal-api-key': TEST_INTERNAL_KEY,
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('Session has been revoked or expired');
    });

    it('authenticateServiceOrUser defaults service principal context when identity headers are omitted', async () => {
      const app = Fastify({ logger: false });
      await app.register(authPlugin, { sessionService: mockSessionService });

      app.get('/inter-service-check', { preHandler: [app.authenticateServiceOrUser] }, async (request) => {
        return { user: request.user };
      });

      const res = await app.inject({
        method: 'GET',
        url: '/inter-service-check',
        headers: {
          'x-internal-api-key': TEST_INTERNAL_KEY,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.user.userId).toBe('internal-service');
      expect(body.user.email).toBe('internal-service@system.local');
      expect(body.user.isServicePrincipal).toBe(true);
    });

    it('authenticateServiceOrUser rejects when x-internal-api-key is incorrect', async () => {
      const app = Fastify({ logger: false });
      await app.register(authPlugin, { sessionService: mockSessionService });

      app.get('/inter-service-check', { preHandler: [app.authenticateServiceOrUser] }, async (request) => {
        return { user: request.user };
      });

      const res = await app.inject({
        method: 'GET',
        url: '/inter-service-check',
        headers: {
          'x-internal-api-key': 'wrong-internal-key',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('Missing or invalid authorization header');
    });
  });
});
