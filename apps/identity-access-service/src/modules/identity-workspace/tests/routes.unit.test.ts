import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { registerAuthRoutes } from '../infrastructure/http/routes/auth.routes';
import { registerWorkspaceRoutes } from '../infrastructure/http/routes/workspace.routes';
import { registerInvitationRoutes } from '../infrastructure/http/routes/invitation.routes';
import { registerMemberRoutes } from '../infrastructure/http/routes/member.routes';
import { registerIdentityWorkspaceRoutes } from '../infrastructure/http/routes/index';

describe('Route Registrations (Unit)', () => {
  const createMockControllers = () => ({
    authController: {
      register: vi.fn(),
      login: vi.fn(async (_req, reply) => reply.status(200).send({ success: true })),
      me: vi.fn(),
      logout: vi.fn(),
      getUser: vi.fn(),
      updateProfile: vi.fn(),
    } as any,
    workspaceController: {
      createWorkspace: vi.fn(),
      getUserWorkspaces: vi.fn(),
      getWorkspace: vi.fn(),
      updateWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
      transferOwnership: vi.fn(),
    } as any,
    invitationController: {
      getInvitationByToken: vi.fn(),
      acceptInvitation: vi.fn(),
      createInvitation: vi.fn(),
      listWorkspaceInvitations: vi.fn(),
      cancelInvitation: vi.fn(),
    } as any,
    memberController: {
      listMembers: vi.fn(),
      getMember: vi.fn(),
      removeMember: vi.fn(),
      changeRole: vi.fn(),
    } as any,
  });

  const setupTestApp = async () => {
    const app = Fastify({ logger: false });
    // Mock authenticate decorator
    app.decorate('authenticate', async () => {});
    return app;
  };

  describe('registerAuthRoutes', () => {
    it('should register all 6 auth and user endpoints without error', async () => {
      const app = await setupTestApp();
      const controllers = createMockControllers();

      await registerAuthRoutes(app, controllers.authController);
      await app.ready();

      // Verify routes exist
      expect(app.hasRoute({ method: 'POST', url: '/auth/register' })).toBe(true);
      expect(app.hasRoute({ method: 'POST', url: '/auth/login' })).toBe(true);
      expect(app.hasRoute({ method: 'GET', url: '/auth/me' })).toBe(true);
      expect(app.hasRoute({ method: 'POST', url: '/auth/logout' })).toBe(true);
      expect(app.hasRoute({ method: 'GET', url: '/users/:userId' })).toBe(true);
      expect(app.hasRoute({ method: 'PATCH', url: '/users/:userId' })).toBe(true);
    });
  });

  describe('registerWorkspaceRoutes', () => {
    it('should register all 6 workspace endpoints', async () => {
      const app = await setupTestApp();
      const controllers = createMockControllers();

      await registerWorkspaceRoutes(app, controllers.workspaceController);
      await app.ready();

      expect(app.hasRoute({ method: 'POST', url: '/workspaces' })).toBe(true);
      expect(app.hasRoute({ method: 'GET', url: '/workspaces' })).toBe(true);
      expect(app.hasRoute({ method: 'GET', url: '/workspaces/:workspaceId' })).toBe(true);
      expect(app.hasRoute({ method: 'PATCH', url: '/workspaces/:workspaceId' })).toBe(true);
      expect(app.hasRoute({ method: 'DELETE', url: '/workspaces/:workspaceId' })).toBe(true);
      expect(
        app.hasRoute({
          method: 'POST',
          url: '/workspaces/:workspaceId/ownership/transfer',
        })
      ).toBe(true);
    });
  });

  describe('registerInvitationRoutes', () => {
    it('should register all 5 invitation endpoints', async () => {
      const app = await setupTestApp();
      const controllers = createMockControllers();

      await registerInvitationRoutes(app, controllers.invitationController);
      await app.ready();

      expect(app.hasRoute({ method: 'GET', url: '/invitations/:token' })).toBe(true);
      expect(app.hasRoute({ method: 'POST', url: '/invitations/:token/accept' })).toBe(true);
      expect(app.hasRoute({ method: 'POST', url: '/workspaces/:workspaceId/invitations' })).toBe(true);
      expect(app.hasRoute({ method: 'GET', url: '/workspaces/:workspaceId/invitations' })).toBe(true);
      expect(
        app.hasRoute({
          method: 'DELETE',
          url: '/workspaces/:workspaceId/invitations/:invitationId',
        })
      ).toBe(true);
    });
  });

  describe('registerMemberRoutes', () => {
    it('should register all 4 member endpoints', async () => {
      const app = await setupTestApp();
      const controllers = createMockControllers();

      await registerMemberRoutes(app, controllers.memberController);
      await app.ready();

      expect(app.hasRoute({ method: 'GET', url: '/workspaces/:workspaceId/members' })).toBe(true);
      expect(
        app.hasRoute({
          method: 'GET',
          url: '/workspaces/:workspaceId/members/:userId',
        })
      ).toBe(true);
      expect(
        app.hasRoute({
          method: 'DELETE',
          url: '/workspaces/:workspaceId/members/:userId',
        })
      ).toBe(true);
      expect(
        app.hasRoute({
          method: 'PATCH',
          url: '/workspaces/:workspaceId/members/:userId/role',
        })
      ).toBe(true);
    });
  });

  describe('registerIdentityWorkspaceRoutes (Module Index)', () => {
    it('should register all module routes prefixed with /api/v1', async () => {
      const app = await setupTestApp();
      const controllers = createMockControllers();

      await registerIdentityWorkspaceRoutes(app, controllers);
      await app.ready();

      // Check prefixed routes
      expect(app.hasRoute({ method: 'POST', url: '/api/v1/auth/register' })).toBe(true);
      expect(app.hasRoute({ method: 'POST', url: '/api/v1/auth/login' })).toBe(true);
      expect(app.hasRoute({ method: 'GET', url: '/api/v1/auth/me' })).toBe(true);
      expect(app.hasRoute({ method: 'POST', url: '/api/v1/workspaces' })).toBe(true);
      expect(app.hasRoute({ method: 'GET', url: '/api/v1/invitations/:token' })).toBe(true);
      expect(app.hasRoute({ method: 'GET', url: '/api/v1/workspaces/:workspaceId/members' })).toBe(true);
    });

    it('should enforce rate limits and return 429 when threshold exceeded', async () => {
      const app = await setupTestApp();
      const rateLimitPlugin = (await import('@fastify/rate-limit')).default;
      await app.register(rateLimitPlugin, { max: 100, timeWindow: '1 minute' });
      const controllers = createMockControllers();
      const mockUser = {
        userId: '11111111-1111-1111-1111-111111111111',
        email: 'test@example.com',
        fullName: 'Test User',
        isActive: true,
        emailVerified: false,
      };
      controllers.authController.login = vi.fn(async (_req, reply) =>
        reply.status(200).send({
          success: true,
          statusCode: 200,
          message: 'Login successful',
          data: { user: mockUser, token: 'fake-token' },
        })
      );

      await registerAuthRoutes(app, controllers.authController);
      await app.ready();

      // authRateLimit on /auth/login has max: 10
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: { email: 'test@example.com', password: 'Password123!' },
        });
        expect(res.statusCode).toBe(200);
      }

      // 11th request exceeds max: 10
      const res11 = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'Password123!' },
      });

      await app.close();

      expect(res11.statusCode).toBe(429);
      const body = JSON.parse(res11.body);
      expect(body.statusCode).toBe(429);
      expect(body.error).toBe('Too Many Requests');
    });
  });
});
