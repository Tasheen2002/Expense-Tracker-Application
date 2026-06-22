import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async (request: any) => {
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
import { FastifyInstance } from 'fastify';

describe('Expense-Ledger Module - Expense Service', () => {
  let server: FastifyInstance;
  let token: string;
  let workspaceId: string;
  let categoryId: string;
  let tagId: string;

  beforeAll(async () => {
    server = await createServer();

    const uniqueId = Date.now();
    const email = `ledger_${uniqueId}@test.com`;
    const testUserId = '123e4567-e89b-12d3-a456-426614174001';
    workspaceId = '123e4567-e89b-12d3-a456-426614174000';
    token = 'mock-auth-token';

    server.addHook('onRequest', async (request: any) => {
      if (request.headers.authorization) {
        request.headers['x-user-id'] = testUserId;
        request.headers['x-workspace-id'] = workspaceId;
        request.headers['x-user-email'] = email;
      }
    });

    await server.ready();

    // Clear existing data to avoid conflicts
    const prisma = (server as any).prisma;
    await prisma.expenseTag.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.category.deleteMany({});

    // Create Tag
    const tagRes = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/tags`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Test Tag', color: '#000000' },
    });
    tagId = JSON.parse(tagRes.body).data?.tagId;
    if (!tagId) {
      console.error('Failed to create tag:', tagRes.body);
      throw new Error('Failed to create tag');
    }
  });

  afterAll(async () => {
    await server.close();
  });

  it('should handle duplicate tags gracefully (Bug Fix Verification)', async () => {
    // Attempt to create expense with DUPLICATE tag IDs
    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/workspaces/${workspaceId}/expenses`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        title: 'Duplicate Tag Test',
        amount: 100,
        currency: 'USD',
        expenseDate: '2023-01-01T00:00:00.000Z',
        paymentMethod: 'CASH',
        isReimbursable: false,
        tagIds: [tagId, tagId], // DUPLICATE SENT HERE
      },
    });

    if (response.statusCode !== 201) {
      // Debug: console.log("Duplicate Tag Test Failed:", response.body);
    }
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    // Should handle it without erroring "Tags not found" due to count mismatch
  });

  it('should fail with invalid tax', async () => {
    // Negative test case can go here
  });
});
