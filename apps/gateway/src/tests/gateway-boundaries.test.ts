import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { buildGatewayApp, GatewayConfig } from '../app';

const secret = 'gateway-regression-signing-secret-at-least-32';
const internalKey = 'gateway-regression-internal-key-at-least-32';
const userId = randomUUID(),
  workspaceId = randomUUID(),
  sessionId = randomUUID();
const token = jwt.sign(
  { userId, email: 'user@example.test', sessionId },
  secret,
  { expiresIn: '1h' }
);
const headers = { authorization: `Bearer ${token}` };
const serviceNames = [
  'identity',
  'expense',
  'categorization',
  'approval',
  'bankFeed',
  'receipt',
  'notification',
  'audit',
] as const;

describe('Gateway boundaries through actual HTTP proxies', () => {
  const upstreams: FastifyInstance[] = [];
  const services: NonNullable<GatewayConfig['services']> = {};
  let gateway: FastifyInstance;
  let sessionActive = true,
    identityUnavailable = false,
    identityRateLimited = false,
    unhealthy = false;
  let identityResponseMode: 'valid' | 'malformed' | 'mismatch' = 'valid';
  const config = () => ({
    jwtSecret: secret,
    internalApiKey: internalKey,
    frontendUrl: 'http://localhost:3000',
    services,
    enableRateLimit: false,
    upstreamTimeoutMs: 300,
  });
  beforeAll(async () => {
    for (const service of serviceNames) {
      const app = Fastify({ bodyLimit: 2 * 1024 * 1024 });
      app.get('/health', async (_request, reply) =>
        reply
          .code(unhealthy && service === 'expense' ? 503 : 200)
          .send({ status: 'ok' })
      );
      if (service === 'identity')
        app.get('/api/v1/auth/me', async (request, reply) => {
          if (identityRateLimited)
            return reply.code(429).header('retry-after', '30')
              .send({ message: 'private rate-limit diagnostic' });
          if (identityUnavailable)
            return reply
              .code(503)
              .send({ message: 'private database diagnostic' });
          if (
            !sessionActive ||
            request.headers.authorization !== headers.authorization
          )
            return reply.code(401).send({ message: 'revoked' });
          if (identityResponseMode === 'malformed') return reply.type('text/plain').send('private malformed profile');
          return { success: true, data: { userId: identityResponseMode === 'mismatch' ? randomUUID() : userId } };
        });
      app.route({
        method: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
        url: '/*',
        handler: async (request, reply) => {
          if (request.url.includes('/slow'))
            await new Promise((resolve) => setTimeout(resolve, 1200));
          if (request.url.includes('/binary'))
            return reply
              .type('application/pdf')
              .send(Buffer.from('%PDF-fixture'));
          return {
            service,
            url: request.url,
            method: request.method,
            headers: request.headers,
            body: request.body,
          };
        },
      });
      services[service] = await app.listen({ port: 0, host: '127.0.0.1' });
      upstreams.push(app);
    }
    gateway = await buildGatewayApp(config());
    await gateway.ready();
  });
  afterAll(async () => {
    await gateway?.close();
    await Promise.all(upstreams.map((app) => app.close()));
  });

  it.each([
    ['expense', 'expenses'],
    ['expense', 'stock/transactions'],
    ['expense', 'budgets'],
    ['expense', 'budget-plans'],
    ['categorization', 'rules'],
    ['approval', 'workflows'],
    ['bankFeed', 'bank-feed-sync/connections'],
    ['receipt', 'receipts'],
    ['receipt', `expenses/${randomUUID()}/receipts`],
    ['notification', 'notifications'],
    ['notification', 'notification-preferences'],
    ['audit', 'audit-logs'],
    ['identity', 'members'],
  ])(
    'routes %s requests for %s to the owning service',
    async (service, suffix) => {
      const url = `/api/v1/workspaces/${workspaceId}/${suffix}?limit=2`;
      const response = await gateway.inject({ url, headers });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ service, url });
    }
  );

  it.each([
    ['audit', 'audit-logs'], ['notification', 'notifications'], ['notification', 'notification-preferences'],
  ])('protects account %s/%s using the verified actor without workspace context', async (service, suffix) => {
    const url = `/api/v1/account/${suffix}`;
    const response = await gateway.inject({ url, headers: { ...headers,
      'x-user-id': randomUUID(), 'x-workspace-id': workspaceId, 'x-internal-api-key': 'forged' } });
    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data).toMatchObject({ service, url, headers: { 'x-user-id': userId, 'x-internal-api-key': internalKey } });
    expect(data.headers['x-workspace-id']).toBeUndefined();
    expect((await gateway.inject({ url })).statusCode).toBe(401);
    sessionActive = false;
    try { expect((await gateway.inject({ url, headers })).statusCode).toBe(401); }
    finally { sessionActive = true; }
  });

  it('covers every current workspace route declared by the eight services', async () => {
    const directories = {
      identity: 'identity-access-service',
      expense: 'expense-budgeting-service',
      categorization: 'categorization-service',
      approval: 'approval-policy-service',
      bankFeed: 'bank-feed-service',
      receipt: 'receipt-vault-service',
      notification: 'notification-service',
      audit: 'audit-compliance-service',
    };
    let checked = 0;
    for (const service of serviceNames) {
      const urls = new Set<string>();
      function visit(directory: string) {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const file = path.join(directory, entry.name);
          if (entry.isDirectory()) visit(file);
          else if (
            file.includes(path.join('http', 'routes')) &&
            file.endsWith('.ts')
          ) {
            for (const match of readFileSync(file, 'utf8').matchAll(
              /['"](\/workspaces\/:workspaceId[^'"]*)['"]/g
            )) {
              urls.add(
                '/api/v1' +
                  match[1].replace(/:[A-Za-z][A-Za-z0-9]*/g, workspaceId)
              );
            }
          }
        }
      }
      visit(
        path.resolve(
          __dirname,
          '../../../',
          directories[service],
          'src/modules'
        )
      );
      for (const url of urls) {
        const response = await gateway.inject({ url, headers });
        expect(response.statusCode, url).toBe(200);
        expect(response.json().service, url).toBe(service);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('accepts configured service origins with trailing slashes', async () => {
    const app = await buildGatewayApp({
      ...config(),
      services: {
        ...services,
        identity: services.identity + '/',
        expense: services.expense + '/',
      },
    });
    try {
      expect(
        (
          await app.inject({
            url: `/api/v1/workspaces/${workspaceId}/expenses`,
            headers,
          })
        ).statusCode
      ).toBe(200);
    } finally {
      await app.close();
    }
  });

  it('replaces spoofed headers with verified context', async () => {
    const response = await gateway.inject({
      url: `/api/v1/workspaces/${workspaceId}/expenses`,
      headers: {
        ...headers,
        'x-user-id': randomUUID(),
        'x-user-email': 'attacker@example.test',
        'x-workspace-id': randomUUID(),
        'x-internal-api-key': 'attacker',
        'x-service-principal': 'admin',
        'x-correlation-id': 'trace_123',
      },
    });
    expect(response.json().headers).toMatchObject({
      'x-user-id': userId,
      'x-user-email': 'user@example.test',
      'x-workspace-id': workspaceId,
      'x-internal-api-key': internalKey,
      'x-correlation-id': 'trace_123',
    });
    expect(response.json().headers['x-service-principal']).toBeUndefined();
  });

  it('strips actor context on public auth and invitation routes too', async () => {
    for (const url of ['/api/v1/auth/login', '/api/v1/invitations/token']) {
      const response = await gateway.inject({
        url,
        headers: {
          'x-user-id': userId,
          'x-user-email': 'attacker@example.test',
          'x-workspace-id': workspaceId,
          'x-service-principal': 'admin',
        },
      });
      const received = response.json().headers;
      for (const header of [
        'x-user-id',
        'x-user-email',
        'x-workspace-id',
        'x-service-principal',
      ])
        expect(received[header]).toBeUndefined();
    }
  });

  it('rejects revoked sessions on non-Identity routes', async () => {
    sessionActive = false;
    try {
      expect(
        (
          await gateway.inject({
            url: `/api/v1/workspaces/${workspaceId}/expenses`,
            headers,
          })
        ).statusCode
      ).toBe(401);
    } finally {
      sessionActive = true;
    }
  });

  it('fails closed with a sanitized 503 when session verification is unavailable', async () => {
    identityUnavailable = true;
    try {
      const response = await gateway.inject({
        url: `/api/v1/workspaces/${workspaceId}/notifications`,
        headers,
      });
      expect(response.statusCode).toBe(503);
      expect(response.body).not.toContain('database');
    } finally {
      identityUnavailable = false;
    }
  });

  it.each(['malformed', 'mismatch'] as const)('fails closed for an invalid Identity response: %s', async mode => {
    identityResponseMode = mode;
    try {
      const response = await gateway.inject({ url: `/api/v1/workspaces/${workspaceId}/expenses`, headers });
      expect(response.statusCode).toBe(503);
      expect(response.json().message).toBe('Session verification unavailable');
      expect(response.body).not.toContain('private');
    } finally { identityResponseMode = 'valid'; }
  });

  it.each(['/api/v1/event-outbox/events', '/event-outbox/events', '/api/v1/internal/expenses'])('does not expose service-only routes: %s', async url => {
      const response = await gateway.inject({ method: 'POST', url,
        headers: { ...headers, 'x-internal-api-key': internalKey, 'x-service-principal': 'system' }, payload: {} });
      expect(response.statusCode).toBe(404);
    });

  it('preserves Identity throttling as a sanitized 429 with Retry-After', async () => {
    identityRateLimited = true;
    try {
      const response = await gateway.inject({
        url: `/api/v1/workspaces/${workspaceId}/expenses`, headers,
      });
      expect(response.statusCode).toBe(429);
      expect(response.headers['retry-after']).toBe('30');
      expect(response.body).not.toContain('private');
      expect(response.json().statusCode).toBe(429);
    } finally { identityRateLimited = false; }
  });

  it.each([
    { userId, email: 'user@example.test' },
    { userId: 'invalid', email: 'user@example.test', sessionId },
    { userId, email: 'bad\r\nheader', sessionId },
    { userId, email: 'user@example.test', sessionId: 'invalid' },
  ])(
    'rejects signed tokens with malformed/missing claims: %j',
    async (claims) => {
      const invalid = jwt.sign(claims, secret, { expiresIn: '1h' });
      expect(
        (
          await gateway.inject({
            url: `/api/v1/workspaces/${workspaceId}/expenses`,
            headers: { authorization: `Bearer ${invalid}` },
          })
        ).statusCode
      ).toBe(401);
    }
  );

  it('rejects tokens without expiry and unexpected signing algorithms', async () => {
    const claims = { userId, email: 'user@example.test', sessionId };
    for (const invalid of [
      jwt.sign(claims, secret),
      jwt.sign(claims, secret, { algorithm: 'HS384', expiresIn: '1h' }),
      jwt.sign(claims, secret, { expiresIn: '-1s' }),
      jwt.sign(claims, 'different-signing-secret', { expiresIn: '1h' }),
    ]) {
      expect(
        (
          await gateway.inject({
            url: `/api/v1/workspaces/${workspaceId}/expenses`,
            headers: { authorization: `Bearer ${invalid}` },
          })
        ).statusCode
      ).toBe(401);
    }
  });

  it('allows configured browser preflight origins and does not reflect others', async () => {
    const url = `/api/v1/workspaces/${workspaceId}/expenses`;
    const allowed = await gateway.inject({ method: 'OPTIONS', url, headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'PATCH' } });
    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-methods']).toContain('PATCH');
    const denied = await gateway.inject({ method: 'OPTIONS', url, headers: { origin: 'https://attacker.example', 'access-control-request-method': 'PATCH' } });
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('requires authentication for invitation acceptance', async () => {
    const path = '/api/v1/invitations/token/accept';
    expect(
      (await gateway.inject({ method: 'POST', url: path })).statusCode
    ).toBe(401);
    expect(
      (await gateway.inject({ method: 'POST', url: path, headers })).json()
    ).toMatchObject({ service: 'identity', url: path });
  });

  it('rejects malformed workspace IDs without forwarding their context', async () => {
    expect(
      (
        await gateway.inject({
          url: '/api/v1/workspaces/invalid/expenses',
          headers,
        })
      ).statusCode
    ).toBe(400);
  });

  it('streams large receipt payloads and binary downloads through the proxy', async () => {
    const body = { fileContent: 'a'.repeat(1100000) };
    const response = await gateway.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/receipts/upload`,
      headers,
      payload: body,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().body).toEqual(body);
    const file = await gateway.inject({
      url: `/api/v1/workspaces/${workspaceId}/receipts/binary/download`,
      headers,
    });
    expect(file.headers['content-type']).toBe('application/pdf');
    expect(file.rawPayload).toEqual(Buffer.from('%PDF-fixture'));
  });

  it('returns sanitized timeout and connection-failure responses', async () => {
    const slow = await gateway.inject({
      url: `/api/v1/workspaces/${workspaceId}/expenses/slow`,
      headers,
    });
    expect(slow.statusCode).toBe(504);
    expect(slow.json().message).toBe('Upstream service timed out');
    const broken = await buildGatewayApp({
      ...config(),
      services: { ...services, expense: 'http://127.0.0.1:1' },
    });
    try {
      const response = await broken.inject({
        url: `/api/v1/workspaces/${workspaceId}/expenses`,
        headers,
      });
      expect([502, 503]).toContain(response.statusCode);
      expect(response.body).not.toContain('ECONNREFUSED');
    } finally {
      await broken.close();
    }
  });

  it('returns 503 for degraded readiness while liveness stays healthy', async () => {
    expect((await gateway.inject('/health')).statusCode).toBe(200);
    unhealthy = true;
    try {
      expect((await gateway.inject('/health')).statusCode).toBe(503);
      expect((await gateway.inject('/live')).statusCode).toBe(200);
    } finally {
      unhealthy = false;
    }
  });
});

it('keeps liveness outside the client rate quota and enforces that quota', async () => {
  const app = await buildGatewayApp({
    jwtSecret: secret,
    internalApiKey: internalKey,
    enableProxies: false,
    rateLimitMax: 100,
  });
  app.get('/probe', async () => ({ ok: true }));
  try {
    for (let index = 0; index < 105; index++)
      expect((await app.inject('/live')).statusCode).toBe(200);
    for (let index = 0; index < 100; index++)
      expect((await app.inject('/probe')).statusCode).toBe(200);
    expect((await app.inject('/probe')).statusCode).toBe(429);
    expect((await app.inject('/live')).statusCode).toBe(200);
  } finally {
    await app.close();
  }
});

it.each([' '.repeat(32), 'short'.padEnd(64)])('rejects whitespace-only or padded short production secrets: %j', async value => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await expect(buildGatewayApp({ jwtSecret: value, internalApiKey: internalKey, enableProxies: false }))
      .rejects.toThrow('Weak or default JWT_SECRET');
    await expect(buildGatewayApp({ jwtSecret: secret, internalApiKey: value, enableProxies: false }))
      .rejects.toThrow('Default INTERNAL_API_KEY');
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

it('rejects unsafe production configuration and invalid service origins', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await expect(
      buildGatewayApp({
        jwtSecret: 'short',
        internalApiKey: internalKey,
        enableProxies: false,
      })
    ).rejects.toThrow('Weak or default JWT_SECRET');
    await expect(
      buildGatewayApp({
        jwtSecret: secret,
        internalApiKey: 'short',
        enableProxies: false,
      })
    ).rejects.toThrow('Default INTERNAL_API_KEY');
    await expect(
      buildGatewayApp({
        jwtSecret: secret,
        internalApiKey: internalKey,
        frontendUrl: '*',
        enableProxies: false,
      })
    ).rejects.toThrow('Wildcard CORS');
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
  for (const origin of [
    'file:///tmp/service',
    'http://user:password@localhost',
    'http://localhost/path',
  ]) {
    await expect(
      buildGatewayApp({
        jwtSecret: secret,
        internalApiKey: internalKey,
        enableProxies: false,
        services: { identity: origin },
      })
    ).rejects.toThrow('Service URLs');
  }
});
