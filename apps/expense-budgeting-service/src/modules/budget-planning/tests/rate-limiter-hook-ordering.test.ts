import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyRequest } from 'fastify';

vi.mock('@shared/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/middleware')>();
  return {
    ...actual,
    workspaceAuthorizationMiddleware: async (req: any) => {
      req.workspaceMembership = {
        role: 'ADMIN',
        workspaceId: req.params?.workspaceId || '123e4567-e89b-12d3-a456-426614174000',
      };
    },
  };
});

vi.mock('@shared/middleware/role-authorization.middleware', () => ({
  RolePermissions: {
    ADMIN_LEVEL: async () => {},
  },
}));

import { userKeyGenerator } from '@expense-tracker/middleware';
import { budgetPlanningRoutes } from '../infrastructure/http/routes/budget-plan.routes';
import { forecastRoutes } from '../infrastructure/http/routes/forecast.routes';
import { scenarioRoutes } from '../infrastructure/http/routes/scenario.routes';

describe('Budget Planning - Rate Limiter Hook Ordering & Tenancy', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // Enable live rate limiter execution by setting NODE_ENV out of 'test'
    process.env.NODE_ENV = 'production';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('correctly keys authenticated users with their userId in userKeyGenerator', () => {
    const mockReqWithUser = {
      user: { userId: 'usr-12345' },
      headers: {},
      ip: '127.0.0.1',
    } as unknown as FastifyRequest;

    const key = userKeyGenerator(mockReqWithUser);
    expect(key).toBe('rate_limit:user:usr-12345');
    expect(key).not.toContain('anonymous');
  });

  it('falls back to anonymous only when user is missing from request', () => {
    const mockReqWithoutUser = {
      headers: {},
      ip: '127.0.0.1',
    } as unknown as FastifyRequest;

    const key = userKeyGenerator(mockReqWithoutUser);
    expect(key).toBe('rate_limit:user:anonymous');
  });

  it('exercises live rate limiting: decrements exactly once per write, isolates users, and enforces 429', async () => {
    const fastify = Fastify();

    let currentUserId = `usr-alice-${Date.now()}`;
    const executionOrder: string[] = [];

    // Authenticate decorator sets user context
    fastify.decorate('authenticate', async (request: FastifyRequest) => {
      executionOrder.push('authenticate');
      (request as any).user = { userId: currentUserId };
    });

    fastify.decorate('prisma', {} as any);

    // Mock controllers with schema-conforming payloads
    const mockPlanController = {
      create: vi.fn(async (_req, reply) => {
        executionOrder.push('handler');
        return reply.status(201).send({
          success: true,
          statusCode: 201,
          message: 'Plan created',
          data: {
            id: '123e4567-e89b-12d3-a456-426614174001',
            workspaceId: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Plan',
            description: null,
            periodType: 'MONTHLY',
            period: {
              startDate: '2026-01-01',
              endDate: '2026-01-31',
            },
            status: 'DRAFT',
            createdBy: '123e4567-e89b-12d3-a456-426614174002',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        });
      }),
      list: vi.fn(async (_req, reply) =>
        reply.status(200).send({
          success: true,
          statusCode: 200,
          message: 'Plans retrieved',
          data: {
            items: [],
            total: 0,
            limit: 20,
            offset: 0,
            hasMore: false,
          },
        })
      ),
      get: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      update: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      delete: vi.fn(async (_req, reply) => reply.status(204).send()),
      activate: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      archive: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
    } as any;

    const mockForecastController = {
      create: vi.fn(async (_req, reply) => reply.status(201).send({ created: true })),
      get: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      list: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      delete: vi.fn(async (_req, reply) => reply.status(204).send()),
      addItem: vi.fn(async (_req, reply) => reply.status(201).send({ ok: true })),
      listItems: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      deleteItem: vi.fn(async (_req, reply) => reply.status(204).send()),
    } as any;

    const mockScenarioController = {
      create: vi.fn(async (_req, reply) => reply.status(201).send({ created: true })),
      get: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      list: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      update: vi.fn(async (_req, reply) => reply.status(200).send({ ok: true })),
      delete: vi.fn(async (_req, reply) => reply.status(204).send()),
    } as any;

    await fastify.register(
      async (instance) => {
        await budgetPlanningRoutes(instance, mockPlanController);
        await forecastRoutes(instance, mockForecastController);
        await scenarioRoutes(instance, mockScenarioController);
      },
      { prefix: '/api/v1' }
    );

    const planPayload = {
      name: 'Test Plan',
      periodType: 'MONTHLY',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    };

    // 1. First write for User A
    const resA1 = await fastify.inject({
      method: 'POST',
      url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
      payload: planPayload,
    });
    expect(resA1.statusCode).toBe(201);
    expect(executionOrder[0]).toBe('authenticate');
    expect(executionOrder[1]).toBe('handler');
    // Verify rate limit headers
    expect(resA1.headers['x-ratelimit-limit']).toBe('30');
    // CRITICAL: Must be exactly 29 on request 1. If double-counting occurred, it would be 28 or less.
    expect(resA1.headers['x-ratelimit-remaining']).toBe('29');

    // 2. Second write for User A - decrements by exactly 1
    const resA2 = await fastify.inject({
      method: 'POST',
      url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
      payload: planPayload,
    });
    expect(resA2.statusCode).toBe(201);
    expect(resA2.headers['x-ratelimit-remaining']).toBe('28');

    // 3. First write for User B - isolated per user, has fresh quota
    const userB = `usr-bob-${Date.now()}`;
    currentUserId = userB;

    const resB1 = await fastify.inject({
      method: 'POST',
      url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
      payload: planPayload,
    });
    expect(resB1.statusCode).toBe(201);
    // CRITICAL: User B starts with 29 remaining. If there were a shared anonymous key regression,
    // User B would see remaining 27 (accumulated with User A).
    expect(resB1.headers['x-ratelimit-remaining']).toBe('29');

    // 4. Read request for User A - does NOT decrement write quota
    currentUserId = resA1 ? `usr-alice-${Date.now()}` : '';
    // Use fresh user C to verify reads don't touch write rate limiter
    const userC = `usr-carol-${Date.now()}`;
    currentUserId = userC;

    const resCRead = await fastify.inject({
      method: 'GET',
      url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
    });
    expect(resCRead.statusCode).toBe(200);
    expect(resCRead.headers['x-ratelimit-remaining']).toBeUndefined();

    // Now user C makes first write - must still have full 29 remaining
    const resCWrite = await fastify.inject({
      method: 'POST',
      url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
      payload: planPayload,
    });
    expect(resCWrite.statusCode).toBe(201);
    expect(resCWrite.headers['x-ratelimit-remaining']).toBe('29');

    // 5. Enforce HTTP 429 when quota is exhausted
    const userSpammer = `usr-spammer-${Date.now()}`;
    currentUserId = userSpammer;

    // Send 30 requests to exhaust the 30-request window
    for (let i = 0; i < 30; i++) {
      await fastify.inject({
        method: 'POST',
        url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
        payload: planPayload,
      });
    }

    // 31st request must be rejected with 429 Too Many Requests
    const res429 = await fastify.inject({
      method: 'POST',
      url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
      payload: planPayload,
    });
    expect(res429.statusCode).toBe(429);
    const body429 = JSON.parse(res429.body);
    expect(body429.error).toBe('Too Many Requests');
    expect(res429.headers['retry-after']).toBeDefined();

    // Other users are NOT affected by spammer's 429
    const userFresh = `usr-fresh-${Date.now()}`;
    currentUserId = userFresh;

    const resFresh = await fastify.inject({
      method: 'POST',
      url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
      payload: planPayload,
    });
    expect(resFresh.statusCode).toBe(201);
    expect(resFresh.headers['x-ratelimit-remaining']).toBe('29');
  });

  it('rejects unauthenticated write requests at authenticate hook before reaching rate limiter', async () => {
    const fastify = Fastify();

    // Authenticate rejects unauthenticated request by throwing 401 error
    fastify.decorate('authenticate', async () => {
      const err = new Error('Unauthorized') as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    });

    fastify.decorate('prisma', {} as any);

    const mockPlanController = {
      create: vi.fn(async (_req, reply) => reply.status(201).send({ created: true })),
    } as any;

    await fastify.register(
      async (instance) => {
        await budgetPlanningRoutes(instance, mockPlanController);
      },
      { prefix: '/api/v1' }
    );

    const res = await fastify.inject({
      method: 'POST',
      url: '/api/v1/workspaces/123e4567-e89b-12d3-a456-426614174000/budget-plans',
      payload: {
        name: 'Test Plan',
        periodType: 'MONTHLY',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(mockPlanController.create).not.toHaveBeenCalled();
    // Verify rate limit headers were NOT attached because authenticate failed first
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });
});
