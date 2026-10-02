import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from '../../../app';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

// Mock authorization middleware to simulate different users and roles
let mockActorRole = 'ADMIN';
let mockActorId = '123e4567-e89b-12d3-a456-426614174001';

vi.mock('@shared/middleware', () => ({
  workspaceAuthorizationMiddleware: async (request: any) => {
    request.workspaceMembership = {
      role: mockActorRole,
      workspaceId: request.params.workspaceId || request.headers['x-workspace-id'] || '123e4567-e89b-12d3-a456-426614174099',
    };
  },
  authenticate: async (request: any) => {
    request.user = {
      userId: mockActorId,
      id: mockActorId,
      email: 'tester@example.com',
      role: mockActorRole,
    };
  },
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

describe('Infrastructure Hardening & Production-Readiness Integration Tests', () => {
  let app: FastifyInstance & { prisma: PrismaClient };
  const testWorkspaceId = '123e4567-e89b-12d3-a456-426614174099';
  const ownerUserId = '123e4567-e89b-12d3-a456-426614174001';
  const strangerUserId = '123e4567-e89b-12d3-a456-426614174002';
  const adminUserId = '123e4567-e89b-12d3-a456-426614174003';
  const authToken = 'mock-bearer-token';

  beforeAll(async () => {
    app = (await createServer()) as FastifyInstance & { prisma: PrismaClient };

    app.addHook('onRequest', async (request: any) => {
      if (request.headers.authorization) {
        request.headers['x-user-id'] = request.headers['x-user-id'] || mockActorId;
        request.headers['x-workspace-id'] = request.headers['x-workspace-id'] || testWorkspaceId;
      }
    });

    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Finding 2: Outbox Persistence in Domain Transactions', () => {
    it('persists domain events to outbox_event table when creating an expense', async () => {
      mockActorId = ownerUserId;
      mockActorRole = 'ADMIN';

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Outbox Test Expense',
          amount: 150.0,
          currency: 'USD',
          expenseDate: new Date().toISOString(),
          paymentMethod: 'CREDIT_CARD',
          isReimbursable: false,
        },
      });

      expect(response.statusCode).toBe(201);
      const expenseId = JSON.parse(response.body).data.expenseId;

      // Verify outbox record was inserted with status PENDING
      const outboxRecords = await app.prisma.outboxEvent.findMany({
        where: {
          aggregateId: expenseId,
        },
      });

      expect(outboxRecords.length).toBeGreaterThan(0);
      const event = outboxRecords[0];
      expect(event.aggregateType).toBe('Expense');
      expect(event.status).toBe('PENDING');
      expect(event.payload).toHaveProperty('expenseId', expenseId);
    });

    it('persists outbox events when updating an expense', async () => {
      mockActorId = ownerUserId;
      mockActorRole = 'ADMIN';

      // Create expense
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Initial Expense For Update',
          amount: 50.0,
          currency: 'USD',
          expenseDate: new Date().toISOString(),
          paymentMethod: 'CASH',
          isReimbursable: false,
        },
      });
      const expenseId = JSON.parse(createRes.body).data.expenseId;

      // Clear existing outbox events for this expense to isolate update event
      await app.prisma.outboxEvent.deleteMany({
        where: { aggregateId: expenseId },
      });

      // Update expense
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${expenseId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Updated Title For Outbox Test',
        },
      });
      expect(updateRes.statusCode).toBe(200);

      // Verify new outbox record was created
      const outboxRecords = await app.prisma.outboxEvent.findMany({
        where: { aggregateId: expenseId },
      });
      expect(outboxRecords.length).toBeGreaterThan(0);
      expect(outboxRecords[0].eventType.toLowerCase()).toContain('updated');
    });
  });

  describe('Finding 3: Statistics Mixed Currency Prevention', () => {
    it('enforces required currency parameter and does not mix different currencies', async () => {
      mockActorId = ownerUserId;
      mockActorRole = 'ADMIN';

      // Create a USD expense
      await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'USD Currency Expense',
          amount: 200.0,
          currency: 'USD',
          expenseDate: new Date().toISOString(),
          paymentMethod: 'CASH',
          isReimbursable: false,
        },
      });

      // Create a EUR expense
      await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'EUR Currency Expense',
          amount: 300.0,
          currency: 'EUR',
          expenseDate: new Date().toISOString(),
          paymentMethod: 'CASH',
          isReimbursable: false,
        },
      });

      // Calling statistics without currency must be rejected
      const missingCurrencyRes = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/statistics`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(missingCurrencyRes.statusCode).toBe(400);

      // Requesting USD statistics returns currency: 'USD'
      const usdRes = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/statistics?currency=USD`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(usdRes.statusCode).toBe(200);
      const usdData = JSON.parse(usdRes.body).data;
      expect(usdData.currency).toBe('USD');

      // Requesting EUR statistics returns currency: 'EUR'
      const eurRes = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/statistics?currency=EUR`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      expect(eurRes.statusCode).toBe(200);
      const eurData = JSON.parse(eurRes.body).data;
      expect(eurData.currency).toBe('EUR');
    });
  });

  describe('Finding 4: Attachment Visibility Authorization', () => {
    let parentExpenseId: string;
    let attachmentId: string;

    beforeAll(async () => {
      mockActorId = ownerUserId;
      mockActorRole = 'MEMBER';

      // Create parent expense as ownerUserId
      const expenseRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Private Owner Expense',
          amount: 80.0,
          currency: 'USD',
          expenseDate: new Date().toISOString(),
          paymentMethod: 'CREDIT_CARD',
          isReimbursable: true,
        },
      });
      parentExpenseId = JSON.parse(expenseRes.body).data?.expenseId;

      // Create attachment as owner
      const attachRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${parentExpenseId}/attachments`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          fileName: 'confidential-receipt.pdf',
          filePath: '/secure/receipts/confidential-receipt.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
      });
      expect(attachRes.statusCode).toBe(201);
      attachmentId = JSON.parse(attachRes.body).data.attachmentId;
    });

    it('allows owner to read their expense attachment metadata', async () => {
      mockActorId = ownerUserId;
      mockActorRole = 'MEMBER';

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${parentExpenseId}/attachments/${attachmentId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.attachmentId).toBe(attachmentId);
      expect(body.data.fileName).toBe('confidential-receipt.pdf');
    });

    it('rejects ordinary member attempting to read another member expense attachment', async () => {
      mockActorId = strangerUserId;
      mockActorRole = 'MEMBER';

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${parentExpenseId}/attachments/${attachmentId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      // Must be forbidden / unauthorized for stranger
      expect([401, 403]).toContain(response.statusCode);
    });

    it('allows privileged role (ADMIN) to read another member expense attachment', async () => {
      mockActorId = adminUserId;
      mockActorRole = 'ADMIN';

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${parentExpenseId}/attachments/${attachmentId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.attachmentId).toBe(attachmentId);
    });
  });

  describe('Finding 5: Nullable Fields Clearing on Update', () => {
    it('clears category description, color, and icon when null is sent', async () => {
      mockActorId = ownerUserId;
      mockActorRole = 'ADMIN';

      // Create category with full details
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/categories`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: `Category-${Date.now()}`,
          description: 'Initial category description',
          color: '#112233',
          icon: 'tag-icon',
        },
      });
      expect(createRes.statusCode).toBe(201);
      const categoryId = JSON.parse(createRes.body).data.categoryId;

      // Update with null fields
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/categories/${categoryId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          description: null,
          color: null,
          icon: null,
        },
      });
      expect(updateRes.statusCode).toBe(200);

      // Verify in DB directly that fields are null
      const inDb = await app.prisma.category.findUnique({
        where: { id: categoryId },
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.description).toBeNull();
      expect(inDb!.color).toBeNull();
      expect(inDb!.icon).toBeNull();
    });

    it('clears tag color when null is sent', async () => {
      mockActorId = ownerUserId;
      mockActorRole = 'ADMIN';

      // Create tag with color
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/tags`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          name: `Tag-${Date.now()}`,
          color: '#AABBCC',
        },
      });
      expect(createRes.statusCode).toBe(201);
      const tagId = JSON.parse(createRes.body).data.tagId;

      // Update with null color
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/tags/${tagId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          color: null,
        },
      });
      expect(updateRes.statusCode).toBe(200);

      // Verify in DB that color is null
      const inDb = await app.prisma.tag.findUnique({
        where: { id: tagId },
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.color).toBeNull();
    });

    it('clears expense description and merchant when null is sent', async () => {
      mockActorId = ownerUserId;
      mockActorRole = 'ADMIN';

      // Create expense with description and merchant
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Expense to Clear Fields',
          description: 'Description to be cleared',
          merchant: 'Merchant to be cleared',
          amount: 75.0,
          currency: 'USD',
          expenseDate: new Date().toISOString(),
          paymentMethod: 'CASH',
          isReimbursable: false,
        },
      });
      expect(createRes.statusCode).toBe(201);
      const expenseId = JSON.parse(createRes.body).data.expenseId;

      // Update with null description and merchant
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/workspaces/${testWorkspaceId}/expenses/${expenseId}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          description: null,
          merchant: null,
        },
      });
      expect(updateRes.statusCode).toBe(200);

      // Verify in DB that fields are null
      const inDb = await app.prisma.expense.findUnique({
        where: { id: expenseId },
      });
      expect(inDb).not.toBeNull();
      expect(inDb!.description).toBeNull();
      expect(inDb!.merchant).toBeNull();
    });
  });
});
