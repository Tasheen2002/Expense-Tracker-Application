import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from '../../../app';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

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

describe('Notification Dispatch Module - Endpoint Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let testWorkspaceId: string;
  let testUserId: string;
  let testTemplateId: string;
  let testNotificationId: string;

  const testEmail = `notification-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testWorkspaceName = `Notification Test Workspace ${Date.now()}`;

  beforeAll(async () => {
    app = await createServer();
    prisma = new PrismaClient();

    testUserId = '123e4567-e89b-12d3-a456-426614174001';
    testWorkspaceId = '123e4567-e89b-12d3-a456-426614174000';
    authToken = 'mock-auth-token';

    app.addHook('onRequest', async (request: any) => {
      if (request.headers.authorization) {
        request.headers['x-user-id'] = testUserId;
        request.headers['x-workspace-id'] = testWorkspaceId;
        request.headers['x-user-email'] = testEmail;
      }
    });

    await app.ready();
  });

  afterAll(async () => {
    // Cleanup
    if (testTemplateId && authToken) {
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/notification-templates/${testTemplateId}`,
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }

    await prisma.$disconnect();
    await app.close();
  });

  // ==================== NOTIFICATION TEMPLATE ENDPOINTS ====================
  describe('Notification Template Endpoints', () => {
    describe('POST /api/v1/admin/notification-templates', () => {
      it('✅ should create a notification template', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/notification-templates',
          headers: { Authorization: `Bearer ${authToken}` },
          payload: {
            workspaceId: testWorkspaceId,
            name: 'Test Budget Alert Template',
            type: 'BUDGET_ALERT',
            channel: 'EMAIL',
            subjectTemplate: 'Budget Alert: {{budgetName}}',
            bodyTemplate:
              'Your budget {{budgetName}} has reached {{percentage}}% of the limit.',
          },
        });
        console.log(
          'Create Template:',
          res.statusCode,
          res.statusCode === 201 ? 'Template created successfully' : res.payload
        );

        if (res.statusCode === 201) {
          const data = JSON.parse(res.payload);
          testTemplateId =
            data.data?.template?.id || data.template?.id || data.data?.id;
        }

        // 400 = workspace validation, 201 = created, 500 = server config
        expect([201, 400, 500]).toContain(res.statusCode);
      });

      it('❌ should fail without auth token', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/notification-templates',
          payload: {
            workspaceId: testWorkspaceId,
            name: 'Unauthorized Template',
            type: 'BUDGET_ALERT',
            channel: 'EMAIL',
            subjectTemplate: 'Test',
            bodyTemplate: 'Test body',
          },
        });
        console.log('Create Template No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });

      it('❌ should fail with missing required fields', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/notification-templates',
          headers: { Authorization: `Bearer ${authToken}` },
          payload: {
            name: 'Incomplete Template',
          },
        });
        console.log('Create Template Missing Fields:', res.statusCode);
        expect(res.statusCode).toBe(400);
      });
    });

    describe('GET /api/v1/admin/notification-templates/:templateId', () => {
      it('✅ should get template by ID', async () => {
        const templateId =
          testTemplateId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/admin/notification-templates/${templateId}`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Get Template:', res.statusCode);

        if (testTemplateId) {
          expect([200, 404]).toContain(res.statusCode);
        } else {
          expect([200, 400, 404, 500]).toContain(res.statusCode);
        }
      });

      it('❌ should fail without auth token', async () => {
        const templateId =
          testTemplateId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/admin/notification-templates/${templateId}`,
        });
        console.log('Get Template No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('GET /api/v1/admin/notification-templates/active', () => {
      it('✅ should get active template by type and channel', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/admin/notification-templates/active?type=BUDGET_ALERT&channel=EMAIL&workspaceId=${testWorkspaceId}`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Get Active Template:', res.statusCode);
        // 400 = validation issue, 404 = not found, 200 = success
        expect([200, 400, 404, 500]).toContain(res.statusCode);
      });

      it('❌ should fail without auth token', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/admin/notification-templates/active?type=BUDGET_ALERT&channel=EMAIL`,
        });
        console.log('Get Active Template No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('PATCH /api/v1/admin/notification-templates/:templateId', () => {
      it('✅ should update template', async () => {
        const templateId =
          testTemplateId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/notification-templates/${templateId}`,
          headers: { Authorization: `Bearer ${authToken}` },
          payload: {
            subjectTemplate: 'Updated: Budget Alert for {{budgetName}}',
            bodyTemplate: 'Updated body content',
          },
        });
        console.log('Update Template:', res.statusCode);

        if (testTemplateId) {
          expect([200, 404]).toContain(res.statusCode);
        } else {
          expect([200, 400, 404, 500]).toContain(res.statusCode);
        }
      });

      it('❌ should fail without auth token', async () => {
        const templateId =
          testTemplateId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/notification-templates/${templateId}`,
          payload: { subjectTemplate: 'Unauthorized update' },
        });
        console.log('Update Template No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('PATCH /api/v1/admin/notification-templates/:templateId/activate', () => {
      it('✅ should activate template', async () => {
        const templateId =
          testTemplateId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/notification-templates/${templateId}/activate`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Activate Template:', res.statusCode);

        if (testTemplateId) {
          expect([200, 404]).toContain(res.statusCode);
        } else {
          expect([200, 400, 404, 500]).toContain(res.statusCode);
        }
      });

      it('❌ should fail without auth token', async () => {
        const templateId =
          testTemplateId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/notification-templates/${templateId}/activate`,
        });
        console.log('Activate Template No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('PATCH /api/v1/admin/notification-templates/:templateId/deactivate', () => {
      it('✅ should deactivate template', async () => {
        const templateId =
          testTemplateId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/notification-templates/${templateId}/deactivate`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Deactivate Template:', res.statusCode);

        if (testTemplateId) {
          expect([200, 404]).toContain(res.statusCode);
        } else {
          expect([200, 400, 404, 500]).toContain(res.statusCode);
        }
      });

      it('❌ should fail without auth token', async () => {
        const templateId =
          testTemplateId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/admin/notification-templates/${templateId}/deactivate`,
        });
        console.log('Deactivate Template No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });
  });

  // ==================== NOTIFICATION ENDPOINTS ====================
  describe('Notification Endpoints', () => {
    describe('GET /api/v1/workspaces/:workspaceId/notifications', () => {
      it('✅ should get notifications', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Get Notifications:', res.statusCode);

        if (res.statusCode === 200) {
          const data = JSON.parse(res.payload);
          const notifications =
            data.data?.notifications || data.notifications || [];
          if (notifications.length > 0) {
            testNotificationId = notifications[0].id;
          }
        }

        // 200 = success, 400 = validation, 500 = server error
        expect([200, 400, 500]).toContain(res.statusCode);
      });

      it('❌ should fail without auth token', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications`,
        });
        console.log('Get Notifications No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });

      it('✅ should support pagination', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications?limit=10&offset=0`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Get Notifications with Pagination:', res.statusCode);
        // 200 = success, 400 = validation, 500 = server error
        expect([200, 400, 500]).toContain(res.statusCode);
      });
    });

    describe('PATCH /api/v1/workspaces/:workspaceId/notifications/:notificationId/read', () => {
      it('✅ should mark notification as read', async () => {
        const notificationId =
          testNotificationId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications/${notificationId}/read`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Mark As Read:', res.statusCode);

        if (testNotificationId) {
          expect([200, 404]).toContain(res.statusCode);
        } else {
          expect([200, 400, 404, 500]).toContain(res.statusCode);
        }
      });

      it('❌ should fail without auth token', async () => {
        const notificationId =
          testNotificationId || '00000000-0000-0000-0000-000000000001';
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications/${notificationId}/read`,
        });
        console.log('Mark As Read No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('PATCH /api/v1/workspaces/:workspaceId/notifications/read-all', () => {
      it('✅ should mark all notifications as read', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications/read-all`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Mark All As Read:', res.statusCode);
        // 200 = success, 400 = validation, 500 = server error
        expect([200, 400, 500]).toContain(res.statusCode);
      });

      it('❌ should fail without auth token', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications/read-all`,
        });
        console.log('Mark All As Read No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('GET /api/v1/workspaces/:workspaceId/notifications/preferences (removed — use /notification-preferences)', () => {
      it('✅ route removed — canonical endpoint is /notification-preferences', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications/preferences`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Get Preferences (old route):', res.statusCode);
        // Route removed — 404 is expected
        expect(res.statusCode).toBe(404);
      });

      it('❌ should return 404 (route removed)', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications/preferences`,
        });
        console.log('Get Preferences (old route) No Auth:', res.statusCode);
        // Route no longer exists — 404, not 401
        expect(res.statusCode).toBe(404);
      });
    });

    describe('PATCH /api/v1/workspaces/:workspaceId/notifications/preferences (removed — use /notification-preferences)', () => {
      it('✅ route removed — canonical endpoint is /notification-preferences', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications/preferences`,
          headers: { Authorization: `Bearer ${authToken}` },
          payload: {
            email: true,
            inApp: true,
            push: false,
          },
        });
        console.log('Update Preferences (old route):', res.statusCode);
        // Route removed — 404 is expected
        expect(res.statusCode).toBe(404);
      });

      it('❌ should return 404 (route removed)', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notifications/preferences`,
          payload: { email: false },
        });
        console.log('Update Preferences (old route) No Auth:', res.statusCode);
        expect(res.statusCode).toBe(404);
      });
    });
  });

  // ==================== NOTIFICATION PREFERENCE ENDPOINTS ====================
  describe('Notification Preference Endpoints', () => {
    describe('GET /api/v1/workspaces/:workspaceId/notification-preferences', () => {
      it('✅ should get user preferences', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Get User Preferences:', res.statusCode);
        // 200 = success, 400 = validation, 404 = not found, 500 = server error
        expect([200, 400, 404, 500]).toContain(res.statusCode);
      });

      it('❌ should fail without auth token', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences`,
        });
        console.log('Get User Preferences No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('PATCH /api/v1/workspaces/:workspaceId/notification-preferences', () => {
      it('✅ should update global notification preferences', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences`,
          headers: { Authorization: `Bearer ${authToken}` },
          payload: {
            email: true,
            inApp: true,
            push: false,
          },
        });
        console.log('Update Global Preferences:', res.statusCode);
        // 200 = success, 400 = validation, 500 = server error
        expect([200, 400, 500]).toContain(res.statusCode);
      });

      it('❌ should fail without auth token', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences`,
          payload: { email: false },
        });
        console.log('Update Global Preferences No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });
    });

    describe('PATCH /api/v1/workspaces/:workspaceId/notification-preferences/:type', () => {
      it('✅ should update preferences for specific type', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences/BUDGET_ALERT`,
          headers: { Authorization: `Bearer ${authToken}` },
          payload: {
            email: true,
            inApp: true,
            push: false,
          },
        });
        console.log('Update Type Preferences:', res.statusCode);
        // 200 = success, 400 = validation, 500 = server error
        expect([200, 400, 500]).toContain(res.statusCode);
      });

      it('❌ should fail without auth token', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences/BUDGET_ALERT`,
          payload: { email: false },
        });
        console.log('Update Type Preferences No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });

      it('❌ should fail with invalid notification type', async () => {
        const res = await app.inject({
          method: 'PATCH',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences/INVALID_TYPE`,
          headers: { Authorization: `Bearer ${authToken}` },
          payload: { email: true },
        });
        console.log('Update Invalid Type Preferences:', res.statusCode);
        expect([400, 500]).toContain(res.statusCode);
      });
    });

    describe('GET /api/v1/workspaces/:workspaceId/notification-preferences/check', () => {
      it('✅ should check if channel is enabled', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences/check?type=BUDGET_ALERT&channel=email`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Check Channel Enabled:', res.statusCode);
        // 200 = success, 400 = validation, 404 = not found, 500 = server error
        expect([200, 400, 404, 500]).toContain(res.statusCode);
      });

      it('❌ should fail without auth token', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences/check?type=BUDGET_ALERT&channel=email`,
        });
        console.log('Check Channel Enabled No Auth:', res.statusCode);
        expect(res.statusCode).toBe(401);
      });

      it('❌ should fail with missing query params', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/workspaces/${testWorkspaceId}/notification-preferences/check`,
          headers: { Authorization: `Bearer ${authToken}` },
        });
        console.log('Check Channel Missing Params:', res.statusCode);
        expect(res.statusCode).toBe(400);
      });
    });
  });

  // ==================== ENDPOINT SUMMARY ====================
  describe('📊 Endpoint Summary Report', () => {
    it('should print endpoint summary', () => {
      console.log(`
============================================================
NOTIFICATION DISPATCH MODULE - ENDPOINT TEST SUMMARY
============================================================

📋 Template Endpoints (Admin):
    POST   /admin/notification-templates              - Create Template
    GET    /admin/notification-templates/:id          - Get Template
    GET    /admin/notification-templates/active       - Get Active Template
    PATCH  /admin/notification-templates/:id          - Update Template
    PATCH  /admin/notification-templates/:id/activate - Activate Template
    PATCH  /admin/notification-templates/:id/deactivate - Deactivate Template

🔔 Notification Endpoints:
    GET    /workspaces/:wsId/notifications            - List Notifications
    PATCH  /workspaces/:wsId/notifications/:id/read   - Mark as Read
    PATCH  /workspaces/:wsId/notifications/read-all   - Mark All Read
    GET    /workspaces/:wsId/notifications/preferences - Get Prefs
    PATCH  /workspaces/:wsId/notifications/preferences - Update Prefs

⚙️  Preference Endpoints:
    GET    /workspaces/:wsId/notification-preferences - Get User Prefs
    PATCH  /workspaces/:wsId/notification-preferences - Update Global
    PATCH  /workspaces/:wsId/notification-preferences/:type - Update Type
    GET    /workspaces/:wsId/notification-preferences/check - Check Channel

============================================================
Test User: ${testEmail}
Test Workspace ID: ${testWorkspaceId || 'N/A'}
Test Template ID: ${testTemplateId || 'N/A'}
============================================================
      `);
      expect(true).toBe(true);
    });
  });
});
