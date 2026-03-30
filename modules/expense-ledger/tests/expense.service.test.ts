import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

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

    // Register & Login User
    const regRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email,
        password: 'password123',
        firstName: 'Ledger',
        lastName: 'User',
      },
    });
    const regBody = JSON.parse(regRes.body);

    if (regRes.statusCode === 201 || regRes.statusCode === 200) {
      token =
        regBody.data?.token ||
        regBody.data?.accessToken ||
        regBody.token ||
        regBody.accessToken;
    }

    if (!token) {
      const loginRes = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'password123' },
      });
      const loginBody = JSON.parse(loginRes.body);
      token =
        loginBody.data?.token ||
        loginBody.data?.accessToken ||
        loginBody.token ||
        loginBody.accessToken;
    }

    if (!token) {
      throw new Error('Test setup failed: auth token was not created');
    }

    // Create Workspace
    const wsRes = await server.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: `Ledger WS ${uniqueId}` },
    });
    const wsBody = JSON.parse(wsRes.body);
    if (wsRes.statusCode === 200 || wsRes.statusCode === 201) {
      workspaceId =
        wsBody.data?.workspaceId ||
        wsBody.data?.workspace?.id ||
        wsBody.data?.id ||
        wsBody.workspaceId ||
        wsBody.workspace?.id ||
        wsBody.id;
    }

    if (!workspaceId) {
      throw new Error('Test setup failed: workspace was not created');
    }

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
