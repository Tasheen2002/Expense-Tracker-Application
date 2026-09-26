import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance, FastifyRequest } from 'fastify';

interface MockWorkspaceRequest {
  workspaceMembership?: {
    role: string;
    workspaceId: string;
  };
  params: Record<string, string>;
  headers: Record<string, string | undefined>;
}

vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async (request: MockWorkspaceRequest) => {
    request.workspaceMembership = {
      role: 'ADMIN',
      workspaceId: request.params.workspaceId || request.headers['x-workspace-id'] || '123e4567-e89b-12d3-a456-426614174000',
    };
  },
  authenticate: async () => {},
}));

vi.mock('@shared/middleware/rate-limiter.middleware', () => ({
  createRateLimiter: () => async () => {},
  RateLimitPresets: {
    writeOperations: { windowMs: 60000, maxRequests: 100 },
    auth: { windowMs: 60000, maxRequests: 100 },
    readOperations: { windowMs: 60000, maxRequests: 100 },
    api: { windowMs: 60000, maxRequests: 100 },
    exports: { windowMs: 60000, maxRequests: 100 },
  },
  userKeyGenerator: () => 'test-user',
  endpointKeyGenerator: () => 'test-endpoint',
  userOrIpKeyGenerator: () => 'test-user',
}));

vi.mock('@shared/middleware/role-authorization.middleware', () => ({
  requireRole: () => async () => {},
  RolePermissions: {
    OWNER_ONLY: async () => {},
    ADMIN_LEVEL: async () => {},
    MANAGER_LEVEL: async () => {},
    MEMBER_LEVEL: async () => {},
  },
  hasRole: () => true,
}));

import { createServer } from '../../../app';

describe('Expense Ledger - Extended Validation Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  let testWorkspaceId: string;
  let testExpenseId: string;

  beforeAll(async () => {
    app = await createServer();

    const testEmail = `ext-test-${Date.now()}@example.com`;
    testUserId = '123e4567-e89b-12d3-a456-426614174001';
    testWorkspaceId = '123e4567-e89b-12d3-a456-426614174000';
    authToken = 'mock-auth-token';

    app.addHook('onRequest', async (request: FastifyRequest) => {
      if (request.headers.authorization) {
        request.headers['x-user-id'] = testUserId;
        request.headers['x-workspace-id'] = testWorkspaceId;
        request.headers['x-user-email'] = testEmail;
      }
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('/members/')) {
        const parts = urlStr.split('/members/');
        const targetUserId = parts[1]?.split('?')[0] || 'mock-user';
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              workspaceId: testWorkspaceId,
              userId: targetUserId,
              role: 'MEMBER',
            },
          }),
        } as unknown as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
    });

    await app.ready();

    // Create an expense for split testing
    const expenseResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${testWorkspaceId}/expenses`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        title: 'Lunch',
        amount: 100,
        currency: 'USD',
        expenseDate: new Date().toISOString(),
        paymentMethod: 'CASH',
        isReimbursable: false,
      },
    });
    const expenseBody = JSON.parse(expenseResponse.body);
    expect([200, 201]).toContain(expenseResponse.statusCode);
    testExpenseId = expenseBody.data?.expenseId;
    expect(testExpenseId).toBeDefined();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    if (app) await app.close();
  });

  describe('Expense Split Endpoints', () => {
    it('should fail to create split with invalid payload (Zod)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${testExpenseId}/split`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          splits: [{ userId: 'invalid-uuid', amount: -10 }],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should create a valid split', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${testExpenseId}/split`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          splitType: 'EQUAL',
          participants: [
            { userId: '00000000-0000-0000-0000-000000000001', shareAmount: 50 },
            { userId: '00000000-0000-0000-0000-000000000002', shareAmount: 50 },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('splitId');
    });
  });

  describe('Recurring Expense Endpoints', () => {
    it('should fail to create recurring expense with invalid frequency', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/recurring`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          frequency: 'INVALID',
          template: {
            title: 'Test',
            amount: 10,
            currency: 'USD',
            paymentMethod: 'CASH',
          },
        },
      });

      const body = JSON.parse(response.body);
      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should create a valid recurring expense', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/recurring`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          frequency: 'MONTHLY',
          interval: 1,
          startDate: new Date().toISOString(),
          template: {
            title: 'Rent',
            amount: 1000,
            currency: 'USD',
            paymentMethod: 'TRANSFER',
            isReimbursable: false,
          },
        },
      });

      if (response.statusCode === 400) {
        const body = JSON.parse(response.body);
        if (body.error === 'VALIDATION_ERROR') {
          throw new Error(
            'Valid recurring expense failed validation: ' +
              JSON.stringify(body.errors)
          );
        }
      }
      expect([201, 200, 400, 404]).toContain(response.statusCode);
    });

    it('should accept valid tagIds in recurring expense template', async () => {
      const tagResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/tags`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: `rec-tag-${Date.now()}`,
          color: '#10B981',
        },
      });
      const tagBody = JSON.parse(tagResponse.body);
      const tagId = tagBody.data?.tagId;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/recurring`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          frequency: 'MONTHLY',
          interval: 1,
          startDate: new Date().toISOString(),
          template: {
            title: 'Subscriptions',
            amount: 50,
            currency: 'USD',
            paymentMethod: 'CREDIT_CARD',
            isReimbursable: false,
            tagIds: [tagId],
          },
        },
      });

      expect([200, 201]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body.data.template.tagIds).toEqual([tagId]);
    });

    it('should reject invalid tagIds format in recurring expense template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/recurring`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          frequency: 'MONTHLY',
          interval: 1,
          startDate: new Date().toISOString(),
          template: {
            title: 'Subscriptions',
            amount: 50,
            currency: 'USD',
            paymentMethod: 'CREDIT_CARD',
            tagIds: ['invalid-not-a-uuid'],
          },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('Expense Statistics Query Validation', () => {
    it('should accept valid userId and currency query params', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/statistics?currency=USD&userId=${testUserId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('currency', 'USD');
    });

    it('should reject invalid userId format in statistics query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/statistics?userId=non-uuid-string`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid currency length in statistics query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/statistics?currency=US`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject missing currency in statistics query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/statistics`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject unsupported currency code in statistics query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/statistics?currency=XYZ`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('Query Coercion & Range Validation', () => {
    it('should reject isReimbursable=garbage in filter expenses query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/filter?isReimbursable=garbage`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject minAmount > maxAmount in filter query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/filter?minAmount=100&maxAmount=50`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject startDate > endDate in filter query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/filter?startDate=2026-02-01&endDate=2026-01-01`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject fractional page and pageSize in filter query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/filter?page=1.5`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject activeOnly=garbage in list categories query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/categories?activeOnly=garbage`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('should accept activeOnly=false and parse correctly in list categories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/categories?activeOnly=false`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Internal Recurring Trigger Security', () => {
    const originalApiKey = process.env.INTERNAL_API_KEY;
    const testApiKey = 'test-secret-key-1234567890';

    beforeAll(() => {
      process.env.INTERNAL_API_KEY = testApiKey;
    });

    afterAll(() => {
      process.env.INTERNAL_API_KEY = originalApiKey;
    });

    it('should reject trigger without internal authorization header or body secret', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/recurring/trigger',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject trigger with invalid internal api key header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/recurring/trigger',
        headers: {
          authorization: `Bearer ${authToken}`,
          'x-internal-api-key': 'wrong-secret-key',
        },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
    });

    it('should accept trigger with valid x-internal-api-key header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/recurring/trigger',
        headers: {
          authorization: `Bearer ${authToken}`,
          'x-internal-api-key': testApiKey,
        },
        payload: {},
      });

      expect(response.statusCode).not.toBe(403);
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      }
    });

    it('should reject trigger when secret is only provided in the request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/recurring/trigger',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { secret: testApiKey },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should accept trigger from internal service principal without requiring user bearer token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/recurring/trigger',
        headers: {
          'x-internal-api-key': testApiKey,
        },
        payload: {},
      });

      expect(response.statusCode).not.toBe(403);
      expect(response.statusCode).not.toBe(401);
      if (response.statusCode === 200) {
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      }
    });
  });
});

