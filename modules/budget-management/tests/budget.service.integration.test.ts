import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  beforeAll,
  vi,
} from 'vitest';

vi.mock(
  '../../../apps/api/src/shared/middleware/rate-limiter.middleware',
  () => ({
    createRateLimiter: () => async () => {},
    RateLimitPresets: {
      writeOperations: { windowMs: 60000, maxRequests: 100 },
      auth: { windowMs: 60000, maxRequests: 100 },
    },
    userKeyGenerator: () => 'test-user',
    endpointKeyGenerator: () => 'test-endpoint',
    defaultKeyGenerator: () => 'test-user',
  })
);
import { createServer } from '../../../apps/api/src/server';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { BudgetService } from '../application/services/budget.service';
import { BudgetPeriodType } from '../domain/enums/budget-period-type';

describe('BudgetService Integration', () => {
  let server: FastifyInstance;
  let prisma: PrismaClient;
  let token: string;
  let workspaceId: string;

  beforeAll(async () => {
    server = await createServer();
    prisma = (server as any).prisma;

    const uniqueId = Date.now();
    const email = `budget_test_${uniqueId}@example.com`;

    const regRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'password123', fullName: 'Budget Tester' },
    });
    const loginRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'password123' },
    });
    token = JSON.parse(loginRes.body).data.token;

    const wsRes = await server.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: `Budget WS ${uniqueId}`, description: 'Testing' },
    });
    workspaceId = JSON.parse(wsRes.body).data.workspaceId;
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create a budget successfully', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Marketing Q1',
        totalAmount: 10000,
        currency: 'USD',
        periodType: 'QUARTERLY',
        startDate: '2024-01-01T00:00:00Z',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.budgetId).toBeDefined();
    expect(JSON.parse(res.body).message).toContain(
      'Budget created successfully'
    );
  });

  it('should prevent duplicate budget names', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Marketing Q1',
        totalAmount: 5000,
        currency: 'USD',
        periodType: 'QUARTERLY',
        startDate: '2024-01-01T00:00:00Z',
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('should validation negative amount', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Negative Budget',
        totalAmount: -100,
        currency: 'USD',
        periodType: 'MONTHLY',
        startDate: '2024-01-01T00:00:00Z',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should update budget amount', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'To Update',
        totalAmount: 1000,
        currency: 'USD',
        periodType: 'MONTHLY',
        startDate: '2024-01-01T00:00:00Z',
      },
    });
    const id = JSON.parse(createRes.body).data.budgetId;

    const updateRes = await server.inject({
      // Assuming PUT is used for full update or PATCH if configured.
      // My route analysis showed `put`.
      method: 'PATCH',
      url: `/api/v1/workspaces/${workspaceId}/budgets/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'To Update', // Provide required fields for PUT if necessary, but schema usually relaxed for update or requires all depending on PUT semantics.
        // Looking at route schema (Step 7083), update body properties are optional.
        // But it's PUT. PUT usually replaces resource.
        // However, schema definition shows properties { name, description, totalAmount }.
        // If I omit name, does it fail? Schema doesn't say "required".
        // I'll provide just totalAmount.
        totalAmount: 2000,
      },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(JSON.parse(updateRes.body).message).toContain(
      'Budget updated successfully'
    );
  });

  it('should prevent update with negative amount', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'To Update Valid',
        totalAmount: 1000,
        currency: 'USD',
        periodType: 'MONTHLY',
        startDate: '2024-01-01T00:00:00Z',
      },
    });
    const id = JSON.parse(createRes.body).data.budgetId;

    const updateRes = await server.inject({
      method: 'PATCH',
      url: `/api/v1/workspaces/${workspaceId}/budgets/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { totalAmount: -50 },
    });
    expect(updateRes.statusCode).toBe(400);
  });

  it('should delete budget', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'To Delete',
        totalAmount: 1000,
        currency: 'USD',
        periodType: 'MONTHLY',
        startDate: '2024-01-01T00:00:00Z',
      },
    });
    const id = JSON.parse(createRes.body).data.budgetId;

    const delRes = await server.inject({
      method: 'DELETE',
      url: `/api/v1/workspaces/${workspaceId}/budgets/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(delRes.statusCode).toBe(204);

    const getRes = await server.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${workspaceId}/budgets/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(404);
  });

  it('should list budgets', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${workspaceId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.items.length).toBeGreaterThan(0);
  });

  it('should get budget by id', async () => {
    const createRes = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Get By ID',
        totalAmount: 1000,
        currency: 'USD',
        periodType: 'MONTHLY',
        startDate: '2024-01-01T00:00:00Z',
      },
    });
    const id = JSON.parse(createRes.body).data.budgetId;

    const getRes = await server.inject({
      method: 'GET',
      url: `/api/v1/workspaces/${workspaceId}/budgets/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).data.budgetId).toBe(id);
  });
});
