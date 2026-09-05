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
});
