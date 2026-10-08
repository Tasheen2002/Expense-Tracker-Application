import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import authPlugin from '../../../plugins/auth';
import rateLimitPlugin from '../../../plugins/rate-limit';
import { registerAuthRoutes } from '../infrastructure/http/routes/auth.routes';
import type { AuthController } from '../infrastructure/http/controllers/auth.controller';
import { identityTrustedProxyIPs } from '../../../environment';

afterEach(() => { vi.unstubAllEnvs(); });

async function fixture(trustedProxyIPs: string[] = []) {
  vi.stubEnv('JWT_SECRET', 'rate-limit-regression-signing-secret');
  vi.stubEnv('INTERNAL_API_KEY', 'rate-limit-regression-internal-key');
  vi.stubEnv('IDENTITY_USER_RATE_LIMIT', '2');
  vi.stubEnv('IDENTITY_SERVICE_RATE_LIMIT', '3');
  const app = Fastify({ trustProxy: trustedProxyIPs.length ? trustedProxyIPs : false });
  await app.register(rateLimitPlugin);
  await app.register(authPlugin, { sessionService: {
    createSession: vi.fn(), revokeSession: vi.fn(),
    isSessionValid: vi.fn(async (id: string) => id !== 'revoked'),
  } });
  app.get('/read', { onRequest: [app.authenticateServiceOrUser] }, async () => ({ ok: true }));
  app.patch('/write', { onRequest: [app.authenticate], config: { rateLimit: { max: 1 } } }, async () => ({ ok: true }));
  app.get('/health', { config: { rateLimit: false } }, async () => ({ ok: true }));
  const token = (userId: string, sessionId = 'active') => app.signToken({ userId, sessionId, email: 'test@example.test' });
  return { app, token };
}

describe('Identity quota ownership after authentication', () => {
  it('isolates users sharing one IP, while multiple sessions share their user quota', async () => {
    const { app, token } = await fixture();
    try {
      const headers = { authorization: `Bearer ${token('user-a')}` };
      expect((await app.inject({ url: '/read', headers })).statusCode).toBe(200);
      expect((await app.inject({ url: '/read', headers })).statusCode).toBe(200);
      const limited = await app.inject({ url: '/read', headers: { authorization: `Bearer ${token('user-a', 'other')}`, 'x-user-id': 'user-b' } });
      expect(limited.statusCode).toBe(429);
      expect(limited.headers['retry-after']).toBeDefined();
      expect((await app.inject({ url: '/read', headers: { authorization: `Bearer ${token('user-b')}` } })).statusCode).toBe(200);
      expect((await app.inject({ url: '/read', headers: { authorization: `Bearer ${token('user-b', 'revoked')}` } })).statusCode).toBe(401);
    } finally { await app.close(); }
  });

  it('bounds internal RPCs independently and ignores actor-header rotation for their quota', async () => {
    const { app, token } = await fixture();
    try {
      for (let i = 0; i < 3; i++) expect((await app.inject({ url: '/read', headers: { 'x-internal-api-key': 'rate-limit-regression-internal-key', 'x-user-id': `actor-${i}` } })).statusCode).toBe(200);
      expect((await app.inject({ url: '/read', headers: { 'x-internal-api-key': 'rate-limit-regression-internal-key', 'x-user-id': 'new-actor' } })).statusCode).toBe(429);
      expect((await app.inject({ url: '/read', headers: { authorization: `Bearer ${token('user-a')}` } })).statusCode).toBe(200);
      expect((await app.inject({ url: '/read', headers: { 'x-internal-api-key': 'forged' } })).statusCode).toBe(401);
      for (let i = 0; i < 4; i++) expect((await app.inject('/health')).statusCode).toBe(200);
    } finally { await app.close(); }
  });

  it('retains per-user write limits and public IP limits before authentication', async () => {
    const { app, token } = await fixture();
    try {
      const login = vi.fn(async (_request, reply) => reply.code(401).send({ success: false }));
      await registerAuthRoutes(app, { login } as unknown as AuthController);
      for (let i = 0; i < 10; i++) expect((await app.inject({ method: 'POST', url: '/auth/login', headers: { authorization: `Bearer rotated-${i}` }, payload: { email: 'test@example.test', password: 'ValidPassword123!' } })).statusCode).toBe(401);
      expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email: 'test@example.test', password: 'ValidPassword123!' } })).statusCode).toBe(429);
      expect(login).toHaveBeenCalledTimes(10);
      const write = (user: string) => app.inject({ method: 'PATCH', url: '/write', headers: { authorization: `Bearer ${token(user)}` } });
      expect((await write('user-a')).statusCode).toBe(200);
      expect((await write('user-a')).statusCode).toBe(429);
      expect((await write('user-b')).statusCode).toBe(200);
    } finally { await app.close(); }
  });

  it('rejects invalid quota configuration at startup', async () => {
    vi.stubEnv('IDENTITY_USER_RATE_LIMIT', '0');
    const app = Fastify();
    await expect(app.register(rateLimitPlugin)).rejects.toThrow('positive safe integer');
    await app.close();
  });

  it('keeps public login quotas separate only for clients behind an explicit trusted peer', async () => {
    const { app } = await fixture(['127.0.0.1']);
    try {
      const login = vi.fn(async (_request, reply) => reply.code(401).send({ success: false }));
      await registerAuthRoutes(app, { login } as unknown as AuthController);
      const attempt = (ip: string, peer = '127.0.0.1') => app.inject({ method: 'POST', url: '/auth/login', remoteAddress: peer,
        headers: { 'x-forwarded-for': ip }, payload: { email: 'test@example.test', password: 'ValidPassword123!' } });
      for (let i = 0; i < 10; i++) expect((await attempt('203.0.113.1')).statusCode).toBe(401);
      expect((await attempt('203.0.113.1')).statusCode).toBe(429);
      expect((await attempt('203.0.113.2')).statusCode).toBe(401);
      for (let i = 0; i < 10; i++) expect((await attempt(`203.0.113.${i + 10}`, '198.51.100.1')).statusCode).toBe(401);
      expect((await attempt('203.0.113.99', '198.51.100.1')).statusCode).toBe(429);
    } finally { await app.close(); }
  });

  it('accepts only explicit Identity proxy IPs', () => {
    vi.stubEnv('IDENTITY_TRUSTED_PROXY_IPS', '127.0.0.1, ::1');
    expect(identityTrustedProxyIPs()).toEqual(['127.0.0.1', '::1']);
    vi.stubEnv('IDENTITY_TRUSTED_PROXY_IPS', 'true');
    expect(() => identityTrustedProxyIPs()).toThrow('explicit proxy IP addresses');
  });
});
