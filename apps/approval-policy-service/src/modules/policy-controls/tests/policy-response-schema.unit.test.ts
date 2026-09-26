import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { policyRoutes } from '../infrastructure/http/routes/policy.routes';
import { PolicyController } from '../infrastructure/http/controllers/policy.controller';
import { CommandResult } from '@core/application/cqrs';

describe('EvaluateExpense HTTP Response Schema & Serialization', () => {
  let app: FastifyInstance;
  const mockEvaluateExpenseHandler = {
    handle: vi.fn(),
  };

  const mockPolicyController = new PolicyController(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    mockEvaluateExpenseHandler as any
  );

  beforeAll(async () => {
    app = Fastify();

    // Context auth mock decorator
    app.decorate('authenticate', async (request: any) => {
      request.user = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'test@example.com',
      };
    });

    await policyRoutes(app, mockPolicyController);
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should preserve requiresApproval and approvalRequiredPolicyIds through Fastify response serialization', async () => {
    mockEvaluateExpenseHandler.handle.mockResolvedValueOnce(
      CommandResult.success({
        passed: false,
        requiresApproval: true,
        approvalRequiredPolicyIds: ['123e4567-e89b-12d3-a456-426614174003'],
        violationIds: ['123e4567-e89b-12d3-a456-426614174004'],
        blockedByPolicyId: undefined,
      })
    );

    const response = await app.inject({
      method: 'POST',
      url: '/workspaces/123e4567-e89b-12d3-a456-426614174000/policies/evaluate',
      payload: {
        expenseId: '123e4567-e89b-12d3-a456-426614174010',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 600,
        currency: 'USD',
        hasReceipt: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    // Verify Fastify schema does NOT strip these fields!
    expect(body.data.requiresApproval).toBe(true);
    expect(body.data.approvalRequiredPolicyIds).toEqual([
      '123e4567-e89b-12d3-a456-426614174003',
    ]);
    expect(body.data.passed).toBe(false);
    expect(body.data.violationIds).toEqual([
      '123e4567-e89b-12d3-a456-426614174004',
    ]);
  });

  it('should accept valid IANA timezone in evaluate request body', async () => {
    mockEvaluateExpenseHandler.handle.mockResolvedValueOnce(
      CommandResult.success({
        passed: true,
        requiresApproval: false,
        approvalRequiredPolicyIds: [],
        violationIds: [],
      })
    );

    const response = await app.inject({
      method: 'POST',
      url: '/workspaces/123e4567-e89b-12d3-a456-426614174000/policies/evaluate',
      payload: {
        expenseId: '123e4567-e89b-12d3-a456-426614174010',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 100,
        currency: 'USD',
        timezone: 'America/New_York',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockEvaluateExpenseHandler.handle).toHaveBeenCalledWith(
      expect.objectContaining({
        timezone: 'America/New_York',
      })
    );
  });

  it('should reject invalid IANA timezone with 400 Bad Request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/workspaces/123e4567-e89b-12d3-a456-426614174000/policies/evaluate',
      payload: {
        expenseId: '123e4567-e89b-12d3-a456-426614174010',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 100,
        currency: 'USD',
        timezone: 'Invalid/Timezone_123',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message || body.error).toBeDefined();
  });

  it('should parse policyQuerySchema with undefined activeOnly when omitted', async () => {
    const { policyQuerySchema } = await import(
      '../infrastructure/http/validation/policy.schema'
    );
    const parsed = policyQuerySchema.parse({
      limit: 10,
    });
    expect(parsed.activeOnly).toBeUndefined();

    const parsedTrue = policyQuerySchema.parse({
      activeOnly: 'true',
    });
    expect(parsedTrue.activeOnly).toBe(true);

    const parsedFalse = policyQuerySchema.parse({
      activeOnly: 'false',
    });
    expect(parsedFalse.activeOnly).toBe(false);
  });
});

describe('Violation HTTP Response Serialization', () => {
  let app: FastifyInstance;
  const mockExemptViolationHandler = {
    handle: vi.fn(),
  };

  beforeAll(async () => {
    app = Fastify();
    app.decorate('authenticate', async (request: any) => {
      request.user = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        email: 'test@example.com',
      };
    });

    const { violationRoutes } = await import(
      '../infrastructure/http/routes/violation.routes'
    );
    const { ViolationController } = await import(
      '../infrastructure/http/controllers/violation.controller'
    );
    const controller = new ViolationController(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      mockExemptViolationHandler as any,
      {} as any
    );

    await violationRoutes(app, controller);
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('should preserve exemptionId through Fastify response serialization', async () => {
    mockExemptViolationHandler.handle.mockResolvedValueOnce(
      CommandResult.success({
        id: '123e4567-e89b-12d3-a456-426614174010',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        policyId: '123e4567-e89b-12d3-a456-426614174003',
        expenseId: '123e4567-e89b-12d3-a456-426614174020',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        status: 'EXEMPTED',
        severity: 'HIGH',
        violationDetails: 'Policy violation exempted for approved business travel',
        exemptionId: '123e4567-e89b-12d3-a456-426614174099',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    );

    const response = await app.inject({
      method: 'POST',
      url: '/workspaces/123e4567-e89b-12d3-a456-426614174000/violations/123e4567-e89b-12d3-a456-426614174010/exempt',
      payload: {
        exemptionId: '123e4567-e89b-12d3-a456-426614174099',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    // Verify exemptionId is NOT stripped by Fastify schema!
    expect(body.data.exemptionId).toBe('123e4567-e89b-12d3-a456-426614174099');
    expect(body.data.status).toBe('EXEMPTED');
  });
});

describe('Controller Authentication and Header Extraction Helpers', () => {
  it('should extract actorId from the authenticated userId and reject missing userId', async () => {
    const { getAuthenticatedActorId } = await import(
      '../infrastructure/http/controllers/controller.helper'
    );

    expect(
      getAuthenticatedActorId({ user: { userId: 'user-1' } } as any)
    ).toBe('user-1');
    expect(() =>
      getAuthenticatedActorId({ user: { id: 'user-2' } } as any)
    ).toThrowError(/Authentication required/);

    expect(() =>
      getAuthenticatedActorId({} as any)
    ).toThrowError(/Authentication required/);
  });

  it('should extract authToken from authorization or x-internal-api-key', async () => {
    const { extractAuthToken } = await import(
      '../infrastructure/http/controllers/controller.helper'
    );

    expect(
      extractAuthToken({ headers: { authorization: 'Bearer abc' } } as any)
    ).toBe('Bearer abc');
    expect(
      extractAuthToken({
        headers: { 'x-internal-api-key': 'internal-secret' },
      } as any)
    ).toBe('internal-secret');
    expect(extractAuthToken({ headers: {} } as any)).toBeUndefined();
  });
});
