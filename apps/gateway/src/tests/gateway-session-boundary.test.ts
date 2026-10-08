import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { buildGatewayApp } from '../app';

const TEST_JWT_SECRET = 'test-super-secret-jwt-key-minimum-32-chars-long';
const TEST_INTERNAL_API_KEY = 'test-internal-api-key-value';

interface AuthTokenPayload extends jwt.JwtPayload {
  userId: string;
  email: string;
  sessionId: string;
}

interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

describe('Gateway & Identity Session Boundary Integration', () => {
  let gatewayApp: FastifyInstance;
  let mockIdentityApp: FastifyInstance;
  let activeSessions: Set<string>;

  beforeAll(async () => {
    activeSessions = new Set<string>();

    // 1. Build Mock Identity-Access downstream service mimicking the hardened auth plugin
    mockIdentityApp = Fastify({ logger: false });

    // Replicate hardened Identity authenticate logic with strict types
    mockIdentityApp.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: 'Missing or invalid authorization header',
        });
      }

      const token = authHeader.substring(7);
      try {
        const payload = jwt.verify(token, TEST_JWT_SECRET) as AuthTokenPayload;
        if (!payload.sessionId || !activeSessions.has(payload.sessionId)) {
          return reply.status(401).send({
            success: false,
            statusCode: 401,
            message: 'Session has been revoked or expired',
          });
        }
        req.user = {
          userId: payload.userId,
          email: payload.email,
          sessionId: payload.sessionId,
        };
      } catch {
        return reply.status(401).send({
          success: false,
          statusCode: 401,
          message: 'Invalid or expired token',
        });
      }
    });

    mockIdentityApp.get(
      '/api/v1/auth/me',
      {
        onRequest: [mockIdentityApp.authenticate],
      },
      async (req: FastifyRequest) => {
        return {
          success: true,
          user: req.user,
          receivedInternalKey: req.headers['x-internal-api-key'],
        };
      }
    );

    mockIdentityApp.post(
      '/api/v1/auth/logout',
      {
        onRequest: [mockIdentityApp.authenticate],
      },
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (req.user?.sessionId) {
          activeSessions.delete(req.user.sessionId);
        }
        return reply.status(204).send();
      }
    );

    const address = await mockIdentityApp.listen({ port: 0, host: '127.0.0.1' });

    // 2. Build Gateway App with proxying enabled to mockIdentityApp
    gatewayApp = await buildGatewayApp({
      jwtSecret: TEST_JWT_SECRET,
      internalApiKey: TEST_INTERNAL_API_KEY,
      frontendUrl: 'http://localhost:3000',
      enableProxies: true,
      enableRateLimit: false,
      services: {
        identity: address,
      },
    });
    await gatewayApp.ready();
  });

  afterAll(async () => {
    await gatewayApp.close();
    await mockIdentityApp.close();
  });

  it('should authenticate valid user session when routed through Gateway', async () => {
    const sessionId = 'session-123';
    activeSessions.add(sessionId);

    const token = jwt.sign(
      { userId: 'user-abc', email: 'user@example.com', sessionId },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await gatewayApp.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      user: AuthenticatedUser;
      receivedInternalKey: string;
    };
    expect(body.user.userId).toBe('user-abc');
    expect(body.user.sessionId).toBe('session-123');
    // Gateway injected the internal api key to downstream
    expect(body.receivedInternalKey).toBe(TEST_INTERNAL_API_KEY);
  });

  it('should reject request when session is revoked, even though Gateway injected x-internal-api-key', async () => {
    const sessionId = 'revoked-session-456';
    // Do NOT add to activeSessions (simulating revoked session)

    const token = jwt.sign(
      { userId: 'user-abc', email: 'user@example.com', sessionId },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await gatewayApp.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    // Must be rejected with 401 because session is revoked, internal API key does not bypass it!
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body) as {
      success: boolean;
      statusCode: number;
      message: string;
    };
    expect(body.message).toBe('Session has been revoked or expired');
  });

  it('should revoke the active session on logout through Gateway', async () => {
    const sessionId = 'logout-session-789';
    activeSessions.add(sessionId);

    const token = jwt.sign(
      { userId: 'user-abc', email: 'user@example.com', sessionId },
      TEST_JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Initial check: valid session
    const meBefore = await gatewayApp.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(meBefore.statusCode).toBe(200);

    // Perform logout
    const logoutRes = await gatewayApp.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(logoutRes.statusCode).toBe(204);
    expect(activeSessions.has(sessionId)).toBe(false);

    // Subsequent check: must be rejected with 401
    const meAfter = await gatewayApp.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(meAfter.statusCode).toBe(401);
  });
});
