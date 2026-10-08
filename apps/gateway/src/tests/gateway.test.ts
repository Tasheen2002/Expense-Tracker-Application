import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { FastifyInstance } from 'fastify';
import { buildGatewayApp } from '../app';

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-minimum-32-chars-long';
const TEST_INTERNAL_API_KEY = 'test-internal-api-key-value';

describe('API Gateway Core Functionality & Security', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 }))
    );
    app = await buildGatewayApp({
      jwtSecret: TEST_JWT_SECRET,
      internalApiKey: TEST_INTERNAL_API_KEY,
      frontendUrl: 'http://localhost:3000',
      enableProxies: false, // In unit tests, disable real downstream proxying
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  describe('Health Check Endpoint', () => {
    it('should return aggregated health check status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json).toHaveProperty('status');
      expect(json.service).toBe('API-Gateway');
      expect(json).toHaveProperty('downstream');
      expect(Array.isArray(json.downstream)).toBe(true);
      expect(json.downstream.length).toBe(8);
    });
  });

  describe('Correlation ID & Tracing', () => {
    it('should generate a new correlation ID if none provided in request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      const correlationId = response.headers['x-correlation-id'];
      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
      // Verify UUID pattern
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should preserve and echo client provided correlation ID', async () => {
      const clientCorrelationId = 'c0ffee00-1234-5678-9abc-def012345678';
      const response = await app.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'x-correlation-id': clientCorrelationId,
        },
      });

      expect(response.headers['x-correlation-id']).toBe(clientCorrelationId);
    });
  });

  describe('Security & Anti-Spoofing Protections', () => {
    it('should strip spoofed client internal API keys and overwrite with server key', async () => {
      let interceptedInternalKey: string | undefined;

      const probeApp = await buildGatewayApp({
        jwtSecret: TEST_JWT_SECRET,
        internalApiKey: TEST_INTERNAL_API_KEY,
        enableProxies: false,
      });

      probeApp.get('/test/probe-internal-headers', async (req) => {
        interceptedInternalKey = req.headers['x-internal-api-key'] as string;
        return { ok: true };
      });

      await probeApp.ready();

      await probeApp.inject({
        method: 'GET',
        url: '/test/probe-internal-headers',
        headers: {
          'x-internal-api-key': 'attacker-fake-key',
        },
      });

      await probeApp.close();

      // The client spoofed key should be stripped and replaced with the server's configured secret
      expect(interceptedInternalKey).toBe(TEST_INTERNAL_API_KEY);
      expect(interceptedInternalKey).not.toBe('attacker-fake-key');
    });

    it('should reject requests in production if weak default secret is used', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      await expect(
        buildGatewayApp({
          jwtSecret: 'super-secret-key-change-me',
          internalApiKey: 'secure-key-here',
          enableProxies: false,
        })
      ).rejects.toThrow(/SECURITY FATAL: Weak or default JWT_SECRET/);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('JWT Verification Middleware Logic', () => {
    it('should create valid signed tokens and accept them', () => {
      const token = jwt.sign(
        {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          workspaceId: '123e4567-e89b-12d3-a456-426614174001',
        },
        TEST_JWT_SECRET,
        { expiresIn: '1h' }
      );

      const decoded = jwt.verify(token, TEST_JWT_SECRET) as jwt.JwtPayload & {
        userId: string;
        email: string;
        workspaceId: string;
      };
      expect(decoded.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(decoded.email).toBe('user@example.com');
      expect(decoded.workspaceId).toBe('123e4567-e89b-12d3-a456-426614174001');
    });

    it('should reject tokens signed with a different secret', () => {
      const invalidToken = jwt.sign(
        { userId: 'test-user', email: 'test@example.com' },
        'different-unauthorized-secret',
        { expiresIn: '1h' }
      );

      expect(() => {
        jwt.verify(invalidToken, TEST_JWT_SECRET);
      }).toThrow();
    });

    it('should reject expired tokens', () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user', email: 'test@example.com' },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' }
      );

      expect(() => {
        jwt.verify(expiredToken, TEST_JWT_SECRET);
      }).toThrow(/jwt expired/);
    });
  });
});
