import Fastify from 'fastify';
import { createServer } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticate } from '../middleware/src/authenticate.middleware';
import { optionalAuth } from '../middleware/src/optional-auth.middleware';
import { createRateLimiter, userOrIpKeyGenerator } from '../middleware/src/rate-limiter.middleware';
import { workspaceAuthorizationMiddleware } from '../middleware/src/workspace-authorization.middleware';
import { AuthenticatedRequest } from '../middleware/src/interfaces/authenticated-request.interface';
import { correlationPlugin, internalAuthPlugin } from '../correlation/src';
import { CircuitBreaker, CircuitOpenError } from '../resilience/src/circuit-breaker';
import { withRetry } from '../resilience/src/retry';
import { withTimeout } from '../resilience/src/timeout';
import { AggregateRoot } from '../core/src/domain/aggregate-root';
import { DomainEvent } from '../core/src/domain/events/domain-event';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('shared internal-service authentication', () => {
  async function app(apiKey?: string) {
    const server = Fastify();
    await server.register(internalAuthPlugin, { apiKey });
    server.get('/private', async () => ({ reached: true }));
    server.get('/health', async () => ({ status: 'ok' }));
    server.get('/healthz', async () => ({ reached: true }));
    return server;
  }

  it('fails closed in production even when the development bypass flag is set', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('INTERNAL_API_KEY', '');
    vi.stubEnv('ALLOW_INSECURE_INTERNAL_AUTH', 'true');
    const server = await app();
    try {
      const response = await server.inject('/private');
      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe('ConfigurationError');
      expect(response.json().reached).toBeUndefined();
    } finally { await server.close(); }
  });

  it.each([
    { bypass: '', status: 403 },
    { bypass: 'false', status: 403 },
    { bypass: 'true', status: 200 },
  ])('requires explicit development bypass: $bypass', async ({ bypass, status }) => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('INTERNAL_API_KEY', '');
    vi.stubEnv('ALLOW_INSECURE_INTERNAL_AUTH', bypass);
    const server = await app();
    try { expect((await server.inject('/private')).statusCode).toBe(status); }
    finally { await server.close(); }
  });

  it('accepts only the configured key and keeps similarly named routes protected', async () => {
    vi.stubEnv('INTERNAL_API_KEY', 'environment-key');
    const server = await app('explicit-test-key');
    try {
      expect((await server.inject('/private')).statusCode).toBe(403);
      expect((await server.inject({ url: '/private', headers: { 'x-internal-api-key': 'environment-key' } })).statusCode).toBe(403);
      expect((await server.inject({ url: '/private', headers: { 'x-internal-api-key': 'explicit-test-key' } })).json()).toEqual({ reached: true });
      expect((await server.inject('/health?verbose=true')).statusCode).toBe(200);
      expect((await server.inject('/healthz')).statusCode).toBe(403);
    } finally { await server.close(); }
  });
});

describe('shared authentication', () => {
  it.each([authenticate, optionalAuth])('propagates backend failure through the server error boundary', async middleware => {
    const app = Fastify();
    app.decorate('authenticate', async () => { throw Object.assign(new Error('database unavailable'), { statusCode: 503 }); });
    app.get('/', { preHandler: middleware }, async () => ({ reached: true }));
    try { expect((await app.inject('/')).statusCode).toBe(503); } finally { await app.close(); }
  });
  it('rejects invalid credentials while optional authentication permits guests', async () => {
    const app = Fastify();
    app.decorate('authenticate', async () => { throw Object.assign(new Error('invalid'), { statusCode: 401 }); });
    app.get('/required', { preHandler: authenticate }, async () => 'ok');
    app.get('/optional', { preHandler: optionalAuth }, async () => 'ok');
    try {
      expect((await app.inject('/required')).statusCode).toBe(401);
      expect((await app.inject('/optional')).statusCode).toBe(200);
    } finally { await app.close(); }
  });
});

describe('rate limit isolation and trusted IP', () => {
  it('honors skipFailedRequests without giving successful requests free quota', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const app = Fastify();
    const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 1, skipFailedRequests: true });
    app.get('/failed', { preHandler: limiter }, async (_request, reply) => reply.code(400).send());
    app.get('/success', { preHandler: limiter }, async () => 'ok');
    try {
      expect((await app.inject('/failed')).statusCode).toBe(400);
      expect((await app.inject('/success')).statusCode).toBe(200);
      expect((await app.inject('/success')).statusCode).toBe(429);
    } finally { await app.close(); }
  });
  it.each([undefined, userOrIpKeyGenerator])('does not accept spoofed forwarding headers (%s)', async keyGenerator => {
    vi.stubEnv('NODE_ENV', 'development');
    const app = Fastify();
    app.get('/', { preHandler: createRateLimiter({ windowMs: 10000, maxRequests: 1, keyGenerator }) }, async () => 'ok');
    try {
      expect((await app.inject({ url: '/', headers: { 'x-forwarded-for': '1.1.1.1' } })).statusCode).toBe(200);
      expect((await app.inject({ url: '/', headers: { 'x-forwarded-for': '2.2.2.2' } })).statusCode).toBe(429);
    } finally { await app.close(); }
  });
  it('keeps independent policies and application instances from consuming each other’s quotas', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const app = Fastify();
    app.get('/read', { preHandler: createRateLimiter({ windowMs: 10000, maxRequests: 1 }) }, async () => 'ok');
    app.get('/write', { preHandler: createRateLimiter({ windowMs: 20000, maxRequests: 1 }) }, async () => 'ok');
    try {
      expect((await app.inject('/read')).statusCode).toBe(200);
      expect((await app.inject('/write')).statusCode).toBe(200);
      expect((await app.inject('/write')).statusCode).toBe(429);
    } finally { await app.close(); }
  });
});

describe('workspace authorization contract', () => {
  const workspaceId = '00000000-0000-4000-8000-000000000001';
  const userId = '00000000-0000-4000-8000-000000000002';
  async function appForWorkspace() {
    const app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('onRequest', async request => {
      (request as AuthenticatedRequest).user = { id: userId, userId, email: 'user@example.com' };
    });
    app.get('/workspaces/:workspaceId', { preHandler: async (request, reply) => {
      await workspaceAuthorizationMiddleware(request as AuthenticatedRequest, reply);
    } }, async () => 'ok');
    return app;
  }
  it('rejects a membership response that omits its user identity', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { workspaceId, role: 'OWNER' } }))));
    const app = await appForWorkspace();
    try { expect((await app.inject(`/workspaces/${workspaceId}`)).statusCode).toBe(403); } finally { await app.close(); }
  });
  it('accepts a matching membership contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { workspaceId, userId, role: 'MEMBER' } }))));
    const app = await appForWorkspace();
    try { expect((await app.inject(`/workspaces/${workspaceId}`)).statusCode).toBe(200); } finally { await app.close(); }
  });
  it('never forwards internal credentials to a redirect target', async () => {
    let redirected = 0;
    const server = createServer((request, response) => {
      if (request.url === '/target') { redirected++; response.end('{}'); }
      else { response.writeHead(307, { location: '/target' }); response.end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP address');
    vi.stubEnv('IDENTITY_SERVICE_URL', `http://127.0.0.1:${address.port}`);
    vi.stubEnv('INTERNAL_API_KEY', 'test-only-key');
    const app = await appForWorkspace();
    try {
      expect((await app.inject(`/workspaces/${workspaceId}`)).statusCode).toBe(500);
      expect(redirected).toBe(0);
    } finally { await app.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});

describe('correlation IDs', () => {
  it('preserves bounded safe IDs and replaces unsafe or oversized IDs', async () => {
    const app = Fastify(); await app.register(correlationPlugin);
    app.get('/', async request => ({ id: request.correlationId }));
    try {
      for (const candidate of ['valid.id-123', 'bad value', 'a'.repeat(129)]) {
        const response = await app.inject({ url: '/', headers: { 'x-correlation-id': candidate } });
        expect(response.statusCode).toBe(200);
        if (candidate === 'valid.id-123') expect(response.json().id).toBe(candidate);
        else expect(response.json().id).toMatch(/^[0-9a-f-]{36}$/);
      }
    } finally { await app.close(); }
  });
});

describe('resilience under concurrency', () => {
  it('allows only one recovery probe', async () => {
    vi.useFakeTimers();
    const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 10 });
    await expect(breaker.execute(async () => { throw new Error('down'); })).rejects.toThrow('down');
    vi.advanceTimersByTime(11);
    let resolve!: () => void;
    const probe = breaker.execute(() => new Promise<void>(done => { resolve = done; }));
    const second = vi.fn(async () => undefined);
    await expect(breaker.execute(second)).rejects.toBeInstanceOf(CircuitOpenError);
    expect(second).not.toHaveBeenCalled();
    resolve(); await probe; expect(breaker.getState()).toBe('CLOSED');
  });
  it('a late successful request cannot close a circuit opened by a concurrent failure', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    let resolve!: () => void;
    const early = breaker.execute(() => new Promise<void>(done => { resolve = done; }));
    await expect(breaker.execute(async () => { throw new Error('down'); })).rejects.toThrow();
    resolve(); await early; expect(breaker.getState()).toBe('OPEN');
  });
  it('cleans the timeout timer when an operation throws synchronously', async () => {
    vi.useFakeTimers();
    await expect(withTimeout(() => { throw new Error('sync'); }, 100)).rejects.toThrow('sync');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('retries null rejections without replacing the cause with a logging error', async () => {
    const fn = vi.fn().mockRejectedValueOnce(null).mockResolvedValueOnce('ok');
    expect(await withRetry(fn, { maxRetries: 1, baseDelayMs: 0 })).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid settings before running an operation', async () => {
    const fn = vi.fn();
    await expect(withTimeout(fn, NaN)).rejects.toThrow(RangeError);
    await expect(withRetry(fn, { maxRetries: -1 })).rejects.toThrow(RangeError);
    expect(() => new CircuitBreaker({ failureThreshold: 0 })).toThrow(RangeError);
    expect(fn).not.toHaveBeenCalled();
  });
});

it('reading aggregate events cannot remove pending events before persistence', () => {
  class Event extends DomainEvent {
    get eventType() { return 'Example'; }
    getPayload() { return {}; }
  }
  class Aggregate extends AggregateRoot { emit() { this.addDomainEvent(new Event('id', 'Example')); } }
  const aggregate = new Aggregate(); aggregate.emit();
  aggregate.domainEvents.pop(); expect(aggregate.domainEvents).toHaveLength(1);
});
