import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock(
  '../../../apps/api/src/shared/middleware/rate-limiter.middleware',
  () => ({
    createRateLimiter: () => async () => {},
    RateLimitPresets: {
      auth: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
      api: { windowMs: 60 * 1000, maxRequests: 100 },
      readOperations: { windowMs: 60 * 1000, maxRequests: 300 },
      writeOperations: { windowMs: 60 * 1000, maxRequests: 300 },
      exports: { windowMs: 60 * 60 * 1000, maxRequests: 10 },
    },
    defaultKeyGenerator: () => 'test-user',
    endpointKeyGenerator: () => 'test-endpoint',
    userKeyGenerator: () => 'test-user',
  })
);

import { createServer } from '../../../app';
import { FastifyInstance } from 'fastify';

describe('Identity-Workspace Module - Authentication', () => {
  let server: FastifyInstance;
  let authToken: string;
  let userId: string;
  const testEmail = `testuser-${Date.now()}@example.com`;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    // Clean up test data
    await (server as any).prisma.$executeRawUnsafe(
      `DELETE FROM identity_workspace.user_account WHERE email = '${testEmail}'`
    );
    await server.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: testEmail,
          password: 'password123',
          fullName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('userId');
      expect(body.message).toBe('User registered successfully');

      userId = body.data.userId;
    });

    it('should fail to register user with duplicate email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: testEmail,
          password: 'password123',
          fullName: 'Test User Duplicate',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Conflict');
      expect(body.message).toContain('already exists');
    });

    it('should fail to register user without email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          password: 'password123',
          fullName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should fail to register user with short password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'shortpass@example.com',
          password: 'short',
          fullName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      // Validation error returned for short password (min 8 chars)
    });

    it('should fail to register user with invalid email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
          fullName: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testEmail,
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('user');
      expect(body.data).toHaveProperty('token');
      expect(body.data.user).toHaveProperty('userId', userId);
      expect(body.data.user).toHaveProperty('email', testEmail);
      expect(body.message).toBe('Login successful');

      authToken = body.data.token;
    });

    it('should fail to login with incorrect password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: testEmail,
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Unauthorized');
    });

    it('should fail to login with non-existent email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should fail to login without email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should fail to login without password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'testuser@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /auth/me', () => {
    it('should get current user with valid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('userId', userId);
      expect(body.data).toHaveProperty('email', testEmail);
    });

    it('should fail to get current user without token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should fail to get current user with invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should fail to get current user with malformed authorization header', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: authToken, // Missing 'Bearer ' prefix
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('uptime');
      expect(typeof body.uptime).toBe('number');
    });
  });
});
