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

vi.mock('../../cost-allocation/infrastructure/adapters/prisma-workspace-access.adapter', () => ({
  PrismaWorkspaceAccessAdapter: class {
    async isAdminOrOwner() {
      return true;
    }
  },
}));

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

describe('Budget Planning - Zod HTTP Validation Suite', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testWorkspaceId: string;
  let testUserId: string;
  let activePlanId: string;
  let activeForecastId: string;

  beforeAll(async () => {
    app = await createServer();

    testUserId = '123e4567-e89b-12d3-a456-426614174001';
    testWorkspaceId = '123e4567-e89b-12d3-a456-426614174000';
    authToken = 'mock-auth-token';

    app.addHook('onRequest', async (request: FastifyRequest) => {
      if (request.headers.authorization) {
        request.headers['x-user-id'] = testUserId;
        request.headers['x-workspace-id'] = testWorkspaceId;
      }
    });

    await app.ready();

    // Create a base plan for downstream tests
    const planRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Validation Base Plan',
        periodType: 'YEARLY',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
    });
    const planBody = JSON.parse(planRes.body);
    activePlanId = planBody.data?.id;

    // Create a base forecast
    const forecastRes = await app.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        name: 'Validation Base Forecast',
        type: 'BASELINE',
      },
    });
    const forecastBody = JSON.parse(forecastRes.body);
    activeForecastId = forecastBody.data?.id;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  // =========================================================================
  // 1. Budget Plan Creation & Update Validation
  // =========================================================================
  describe('Budget Plan Schema Validation', () => {
    it('❌ rejects whitespace-only plan name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: '   ',
          periodType: 'MONTHLY',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects plan name exceeding 100 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'A'.repeat(101),
          periodType: 'MONTHLY',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects plan description exceeding 500 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Valid Name',
          description: 'D'.repeat(501),
          periodType: 'MONTHLY',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects inverted dates where endDate is before startDate', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Inverted Dates Plan',
          periodType: 'MONTHLY',
          startDate: '2026-02-01',
          endDate: '2026-01-01',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(body)).toContain('End date must be after start date');
    });

    it('❌ rejects identical dates where endDate equals startDate', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Same Day Plan',
          periodType: 'MONTHLY',
          startDate: '2026-01-01',
          endDate: '2026-01-01',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects invalid periodType enum value', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Invalid Period Plan',
          periodType: 'BIWEEKLY',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects invalid date format strings', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Garbage Date Plan',
          periodType: 'MONTHLY',
          startDate: 'not-a-valid-date',
          endDate: '2026-01-31',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('✅ accepts valid plan creation and trims whitespace', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: '   Trimmed Plan Name   ',
          description: '   Trimmed Description   ',
          periodType: 'MONTHLY',
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Trimmed Plan Name');
      expect(body.data.description).toBe('Trimmed Description');
    });

    it('❌ rejects plan update with empty body', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects plan update with whitespace-only name', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: { name: '    ' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects plan update with description exceeding 500 characters', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: { description: 'X'.repeat(501) },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('✅ clears plan description when PATCHed with description: null', async () => {
      // First ensure plan has a description
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: { description: 'Initial plan description' },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(JSON.parse(updateRes.body).data.description).toBe('Initial plan description');

      // Now clear description with null
      const clearRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: { description: null },
      });

      expect(clearRes.statusCode).toBe(200);
      const clearBody = JSON.parse(clearRes.body);
      expect(clearBody.success).toBe(true);
      expect(clearBody.data.description).toBeNull();

      // Verify persistence via GET
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.data.description).toBeNull();
    });
  });

  // =========================================================================
  // 2. Query String and Route Params Validation
  // =========================================================================
  describe('Query String & Route Parameter Validation', () => {
    it('❌ rejects invalid status filter in list budget plans query', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans?status=INVALID_STATUS`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects limit exceeding 100 in budget plans query', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans?limit=101`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects negative offset in budget plans query', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans?offset=-1`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects non-UUID workspaceId route parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/not-a-valid-uuid/budget-plans`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(['VALIDATION_ERROR', 'Bad Request']).toContain(body.error || (body.statusCode === 400 ? 'VALIDATION_ERROR' : ''));
    });

    it('❌ rejects non-UUID plan id route parameter', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/not-a-uuid`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(['VALIDATION_ERROR', 'Bad Request']).toContain(body.error || (body.statusCode === 400 ? 'VALIDATION_ERROR' : ''));
    });
  });

  // =========================================================================
  // 3. Forecast Schema Validation
  // =========================================================================
  describe('Forecast Schema Validation', () => {
    it('❌ rejects whitespace-only forecast name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: '   ',
          type: 'BASELINE',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects forecast name exceeding 100 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'F'.repeat(101),
          type: 'BASELINE',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects invalid forecast type enum', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Valid Forecast',
          type: 'NON_EXISTENT_TYPE',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects non-UUID planId in create forecast route', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/not-a-uuid/forecasts`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Valid Forecast',
          type: 'BASELINE',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('❌ returns 409 Conflict when creating forecast with duplicate name', async () => {
      const forecastPayload = {
        name: 'Duplicate Forecast Name Test',
        type: 'BASELINE',
      };

      const firstRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: forecastPayload,
      });
      expect(firstRes.statusCode).toBe(201);

      // Application duplicate check
      const dupRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: forecastPayload,
      });

      expect(dupRes.statusCode).toBe(409);
      const dupBody = JSON.parse(dupRes.body);
      expect(dupBody.success).toBe(false);
      expect(dupBody.statusCode).toBe(409);
      expect(dupBody.error).toBe('DuplicateForecastNameError');
      expect(dupBody.message).toContain('already exists in this plan');
    });

    it('❌ returns 409 Conflict with sanitized message when concurrent forecast insert triggers Prisma P2002', async () => {
      const forecastPayload = {
        name: 'Concurrent Forecast P2002 Test',
        type: 'BASELINE',
      };

      const firstRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: forecastPayload,
      });
      expect(firstRes.statusCode).toBe(201);

      // Simulate concurrent race where findByName returned null in both requests,
      // and database catches the duplicate key via @@unique([planId, name])
      const compositionRoot = (app as any).compositionRoot;
      const forecastController = compositionRoot.budgetPlanning.forecastController;
      const forecastRepo = (forecastController as any).createForecastHandler.forecastService.forecastRepository;
      const origFindByName = forecastRepo.findByName;
      forecastRepo.findByName = vi.fn().mockResolvedValue(null);

      try {
        const dupRes = await app.inject({
          method: 'POST',
          url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: forecastPayload,
        });

        expect(dupRes.statusCode).toBe(409);
        const dupBody = JSON.parse(dupRes.body);
        expect(dupBody.success).toBe(false);
        expect(dupBody.statusCode).toBe(409);
        expect(dupBody.error).toBe('Conflict');
        expect(dupBody.message).toBe('Resource already exists');
        // Critical: verify no raw database details or SQL invocations are leaked
        expect(dupBody.details).toBeUndefined();
        expect(dupBody.message).not.toContain('Invalid `prisma.');
        expect(dupBody.message).not.toContain('Unique constraint failed');
      } finally {
        forecastRepo.findByName = origFindByName;
      }
    });
  });

  // =========================================================================
  // 4. Forecast Item Validation (Amounts, Decimals, Overflow)
  // =========================================================================
  describe('Forecast Item Schema Validation', () => {
    const validCategoryId = '123e4567-e89b-12d3-a456-426614174099';

    it('❌ rejects negative forecast item amount', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          categoryId: validCategoryId,
          amount: -50,
          notes: 'Negative amount',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects amount exceeding PostgreSQL Decimal(12,2) capacity (overflow attack)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          categoryId: validCategoryId,
          amount: 10000000000, // 10 billion exceeds 9,999,999,999.99
          notes: 'Huge overflow amount',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects amount with more than 2 decimal places', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          categoryId: validCategoryId,
          amount: 125.456,
          notes: 'Too many decimals',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(body)).toContain('more than 2 decimal places');
    });

    it('❌ rejects non-UUID categoryId in forecast item', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          categoryId: 'non-uuid-category',
          amount: 100,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects notes exceeding 500 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          categoryId: validCategoryId,
          amount: 100,
          notes: 'N'.repeat(501),
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('✅ accepts valid forecast item with 2 decimal places and trimmed notes', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          categoryId: validCategoryId,
          amount: 4500.5,
          notes: '  Valid allocation  ',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.amount).toBe(4500.5);
      expect(body.data.notes).toBe('Valid allocation');
    });

    it('❌ rejects invalid pagination query parameters for forecast items', async () => {
      // Limit exceeding max of 100
      const resMax = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items?limit=101`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(resMax.statusCode).toBe(400);
      const bodyMax = JSON.parse(resMax.body);
      expect(bodyMax.error).toBe('VALIDATION_ERROR');

      // Limit < 1
      const resMin = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items?limit=0`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(resMin.statusCode).toBe(400);

      // Negative offset
      const resOffset = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items?offset=-1`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(resOffset.statusCode).toBe(400);
    });

    it('✅ accepts valid limit and offset parameters when listing forecast items', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${activeForecastId}/items?limit=10&offset=0`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.limit).toBe(10);
      expect(body.data.offset).toBe(0);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(typeof body.data.total).toBe('number');
      expect(typeof body.data.hasMore).toBe('boolean');
    });

    it('✅ creates more than 50 forecast items and retrieves a later page with pagination metadata', async () => {
      // 1. Create a dedicated forecast for pagination testing
      const forecastRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/forecasts`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Pagination Forecast 50+ Items',
          type: 'BASELINE',
        },
      });
      expect(forecastRes.statusCode).toBe(201);
      const forecastId = JSON.parse(forecastRes.body).data.id;

      // 2. Create 55 forecast items sequentially (distinct categoryId per item to avoid duplicates)
      const totalItems = 55;
      for (let i = 1; i <= totalItems; i++) {
        const categoryId = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
        const itemRes = await app.inject({
          method: 'POST',
          url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${forecastId}/items`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            categoryId,
            amount: 100 + i,
            notes: `Item ${String(i).padStart(2, '0')}`,
          },
        });
        expect(itemRes.statusCode).toBe(201);
      }

      // 3. Retrieve Page 1 (limit=20, offset=0)
      const page1Res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${forecastId}/items?limit=20&offset=0`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(page1Res.statusCode).toBe(200);
      const page1 = JSON.parse(page1Res.body);
      expect(page1.success).toBe(true);
      expect(page1.data.total).toBe(55);
      expect(page1.data.limit).toBe(20);
      expect(page1.data.offset).toBe(0);
      expect(page1.data.items).toHaveLength(20);
      expect(page1.data.hasMore).toBe(true);

      // 4. Retrieve Page 2 (limit=20, offset=20)
      const page2Res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${forecastId}/items?limit=20&offset=20`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(page2Res.statusCode).toBe(200);
      const page2 = JSON.parse(page2Res.body);
      expect(page2.data.total).toBe(55);
      expect(page2.data.limit).toBe(20);
      expect(page2.data.offset).toBe(20);
      expect(page2.data.items).toHaveLength(20);
      expect(page2.data.hasMore).toBe(true);

      // 5. Retrieve Page 3 (later page: limit=20, offset=40)
      const page3Res = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/forecasts/${forecastId}/items?limit=20&offset=40`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(page3Res.statusCode).toBe(200);
      const page3 = JSON.parse(page3Res.body);
      expect(page3.data.total).toBe(55);
      expect(page3.data.limit).toBe(20);
      expect(page3.data.offset).toBe(40);
      expect(page3.data.items).toHaveLength(15);
      expect(page3.data.hasMore).toBe(false);

      // 6. Verify page items are disjoint (no duplicate records returned across pages)
      const page1Ids = new Set(page1.data.items.map((it: any) => it.id));
      const page2Ids = new Set(page2.data.items.map((it: any) => it.id));
      const page3Ids = new Set(page3.data.items.map((it: any) => it.id));

      for (const id of page2Ids) {
        expect(page1Ids.has(id)).toBe(false);
      }
      for (const id of page3Ids) {
        expect(page1Ids.has(id)).toBe(false);
        expect(page2Ids.has(id)).toBe(false);
      }
    }, 30000);
  });

  // =========================================================================
  // 5. Scenario Schema Validation (Alignment, Assumptions)
  // =========================================================================
  describe('Scenario Schema Validation', () => {
    let createdScenarioId: string;

    it('❌ rejects whitespace-only scenario name', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: '   ',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('✅ accepts 1-character valid scenario name (verifying domain alignment)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'A',
          description: 'Single character name scenario',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('A');
      createdScenarioId = body.data.id;
    });

    it('❌ rejects scenario name exceeding 100 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'S'.repeat(101),
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects scenario description exceeding 500 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Valid Scenario',
          description: 'D'.repeat(501),
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects non-object assumptions (array input)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Array Assumptions Scenario',
          assumptions: [1, 2, 3],
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('✅ accepts null assumptions on scenario creation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Null Assumptions Scenario',
          assumptions: null,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.assumptions).toBeNull();
    });

    it('✅ accepts valid JSON assumptions with finite numbers and strings', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: 'Rich Assumptions Scenario',
          assumptions: {
            inflationRate: 0.045,
            headcountTarget: 25,
            region: 'APAC',
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.assumptions).toEqual({
        inflationRate: 0.045,
        headcountTarget: 25,
        region: 'APAC',
      });
    });

    it('❌ returns 409 Conflict when creating scenario with duplicate name', async () => {
      const scenarioPayload = {
        name: 'Duplicate Scenario Name Test',
        description: 'Testing unique constraint handling',
      };

      const firstRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: scenarioPayload,
      });
      expect(firstRes.statusCode).toBe(201);

      // Application duplicate check
      const dupRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: scenarioPayload,
      });

      expect(dupRes.statusCode).toBe(409);
      const dupBody = JSON.parse(dupRes.body);
      expect(dupBody.success).toBe(false);
      expect(dupBody.statusCode).toBe(409);
      expect(dupBody.error).toBe('DuplicateScenarioNameError');
      expect(dupBody.message).toContain('already exists in this plan');
    });

    it('❌ returns 409 Conflict with sanitized message when concurrent scenario insert triggers Prisma P2002', async () => {
      const scenarioPayload = {
        name: 'Concurrent Scenario P2002 Test',
        description: 'Testing unique constraint handling',
      };

      const firstRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: scenarioPayload,
      });
      expect(firstRes.statusCode).toBe(201);

      // Simulate concurrent race where findByName returned null in both requests,
      // and database catches the duplicate key via @@unique([planId, name])
      const compositionRoot = (app as any).compositionRoot;
      const scenarioController = compositionRoot.budgetPlanning.scenarioController;
      const scenarioRepo = (scenarioController as any).createScenarioHandler.scenarioService.scenarioRepository;
      const origFindByName = scenarioRepo.findByName;
      scenarioRepo.findByName = vi.fn().mockResolvedValue(null);

      try {
        const dupRes = await app.inject({
          method: 'POST',
          url: `/api/v1/workspaces/${testWorkspaceId}/budget-plans/${activePlanId}/scenarios`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: scenarioPayload,
        });

        expect(dupRes.statusCode).toBe(409);
        const dupBody = JSON.parse(dupRes.body);
        expect(dupBody.success).toBe(false);
        expect(dupBody.statusCode).toBe(409);
        expect(dupBody.error).toBe('Conflict');
        expect(dupBody.message).toBe('Resource already exists');
        // Critical: verify no raw database details or SQL invocations are leaked
        expect(dupBody.details).toBeUndefined();
        expect(dupBody.message).not.toContain('Invalid `prisma.');
        expect(dupBody.message).not.toContain('Unique constraint failed');
      } finally {
        scenarioRepo.findByName = origFindByName;
      }
    });

    it('❌ rejects scenario update with empty body', async () => {
      if (!createdScenarioId) return;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('❌ rejects scenario update with whitespace-only name', async () => {
      if (!createdScenarioId) return;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: { name: '   ' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('✅ accepts valid scenario update with trimmed name and new assumptions', async () => {
      if (!createdScenarioId) return;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: '  Updated Scenario Name  ',
          assumptions: { revisedGrowth: 0.12 },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Updated Scenario Name');
      expect(body.data.assumptions).toEqual({ revisedGrowth: 0.12 });
    });

    it('✅ clears scenario description when PATCHed with description: null', async () => {
      if (!createdScenarioId) return;

      // Populate description first
      const setRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          description: 'Description before clearing',
        },
      });
      expect(setRes.statusCode).toBe(200);
      expect(JSON.parse(setRes.body).data.description).toBe('Description before clearing');

      // Clear description with null
      const clearRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          description: null,
        },
      });

      expect(clearRes.statusCode).toBe(200);
      const clearBody = JSON.parse(clearRes.body);
      expect(clearBody.success).toBe(true);
      expect(clearBody.data.description).toBeNull();

      // Verify persistence via GET
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.data.description).toBeNull();
    });

    it('✅ clears scenario assumptions when PATCHed with assumptions: null', async () => {
      if (!createdScenarioId) return;

      // Ensure scenario has assumptions first
      const setRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          assumptions: { inflator: 1.05 },
        },
      });
      expect(setRes.statusCode).toBe(200);
      expect(JSON.parse(setRes.body).data.assumptions).toEqual({ inflator: 1.05 });

      // Clear assumptions with null
      const clearRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          assumptions: null,
        },
      });

      expect(clearRes.statusCode).toBe(200);
      const clearBody = JSON.parse(clearRes.body);
      expect(clearBody.success).toBe(true);
      expect(clearBody.data.assumptions).toBeNull();

      // Verify persistence via GET
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.data.assumptions).toBeNull();
    });

    it('✅ clears both scenario description and assumptions simultaneously when PATCHed with null', async () => {
      if (!createdScenarioId) return;

      // Populate both fields first
      const setRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          description: 'Both fields set',
          assumptions: { key: 'value' },
        },
      });
      expect(setRes.statusCode).toBe(200);
      const setBody = JSON.parse(setRes.body);
      expect(setBody.data.description).toBe('Both fields set');
      expect(setBody.data.assumptions).toEqual({ key: 'value' });

      // Clear both fields in a single PATCH
      const clearRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          description: null,
          assumptions: null,
        },
      });

      expect(clearRes.statusCode).toBe(200);
      const clearBody = JSON.parse(clearRes.body);
      expect(clearBody.success).toBe(true);
      expect(clearBody.data.description).toBeNull();
      expect(clearBody.data.assumptions).toBeNull();

      // Verify persistence via GET
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/scenarios/${createdScenarioId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.data.description).toBeNull();
      expect(getBody.data.assumptions).toBeNull();
    });
  });
});

