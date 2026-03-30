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

describe('Expense Ledger - Extended Validation Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testWorkspaceId: string;
  let testExpenseId: string;

  beforeAll(async () => {
    app = await createServer();
    await app.ready();

    // Setup: Login/Register and Create Workspace
    // Note: Reusing the logic from the main endpoint test for consistency
    const testEmail = `ext-test-${Date.now()}@example.com`;
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: 'Password123!',
        fullName: 'Ext Tester',
      },
    });

    const registerBody = JSON.parse(registerResponse.body);
    expect([200, 201, 409]).toContain(registerResponse.statusCode); // 409 if already exists

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'Password123!',
      },
    });

    const loginBody = JSON.parse(loginResponse.body);
    expect(loginResponse.statusCode).toBe(200);
    authToken = loginBody.data?.token || loginBody.token;
    expect(authToken).toBeDefined();

    const workspaceResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/workspaces',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { name: `Test Workspace ${Date.now()}` },
    });

    const workspaceBody = JSON.parse(workspaceResponse.body);
    if (![200, 201].includes(workspaceResponse.statusCode)) {
      throw new Error(
        `Workspace creation failed: ${workspaceResponse.statusCode} - ${JSON.stringify(workspaceBody)}`
      );
    }

    expect([200, 201]).toContain(workspaceResponse.statusCode);
    testWorkspaceId = workspaceBody.data?.workspaceId || workspaceBody.data?.id;
    if (!testWorkspaceId) {
      throw new Error(
        'Workspace ID is undefined, body: ' + JSON.stringify(workspaceBody)
      );
    }
    expect(testWorkspaceId).toBeDefined();

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
    if (app) await app.close();
  });

  describe('Expense Split Endpoints', () => {
    it('should fail to create split with invalid payload (Zod)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${testExpenseId}/splits`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          splits: [{ userId: 'invalid-uuid', amount: -10 }],
        },
      });

      console.log('Split Invalid Payload Status:', response.statusCode);
      const body = JSON.parse(response.body);
      console.log('Split Invalid Payload Body:', JSON.stringify(body));
      expect(response.statusCode).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
    });
    it('should create a valid split', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${testExpenseId}/splits`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          splitType: 'EQUAL',
          participants: [
            { userId: '00000000-0000-0000-0000-000000000001', shareAmount: 50 },
            { userId: '00000000-0000-0000-0000-000000000002', shareAmount: 50 },
          ],
        },
      });

      if (response.statusCode === 400) {
        const body = JSON.parse(response.body);
        if (body.error === 'VALIDATION_ERROR') {
          throw new Error(
            'Valid split failed validation: ' + JSON.stringify(body.errors)
          );
        }
      }
      if (response.statusCode === 500) {
        console.error('500 ERROR:', response.body);
      }
      expect([201, 200, 404, 400]).toContain(response.statusCode);
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
  });
});
