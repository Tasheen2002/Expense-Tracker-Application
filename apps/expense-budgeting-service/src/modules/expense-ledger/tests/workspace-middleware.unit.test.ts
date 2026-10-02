import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@expense-tracker/middleware';
import { workspaceAuthorizationMiddleware } from '@shared/middleware/workspace-authorization.middleware';
import { OperationService } from '../application/services/operation.service';
import { UnauthorizedExpenseAccessError } from '../domain/errors/expense.errors';

describe('Workspace Authorization Middleware & OperationService Boundary Hardening', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const createMockReply = () => {
    const reply = {
      status: vi.fn(),
      send: vi.fn(),
    };
    reply.status.mockReturnValue(reply);
    reply.send.mockReturnValue(reply);
    return reply as unknown as FastifyReply & typeof reply;
  };

  const createMockRequest = (overrides?: Record<string, unknown>) => {
    return {
      user: { userId: '11111111-1111-4111-8111-111111111111' },
      params: { workspaceId: '22222222-2222-4222-8222-222222222222' },
      headers: {},
      log: {
        error: vi.fn(),
        warn: vi.fn(),
      },
      ...overrides,
    } as unknown as AuthenticatedRequest;
  };

  describe('workspaceAuthorizationMiddleware', () => {
    it('returns 503 instead of 403 when Identity Access Service returns 500 internal server error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
      } as Response);

      const request = createMockRequest();
      const reply = createMockReply();

      await workspaceAuthorizationMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(503);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          message: 'Identity Access Service is temporarily unavailable',
        })
      );
    });

    it('returns 504 when downstream identity service request times out', async () => {
      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';
      globalThis.fetch = vi.fn().mockRejectedValue(timeoutError);

      const request = createMockRequest();
      const reply = createMockReply();

      await workspaceAuthorizationMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(504);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 504,
          message: 'Gateway timeout during authorization check',
        })
      );
    });

    it('returns 403 when user is not a member of the workspace (404 / 403 from identity service)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 404,
        ok: false,
      } as Response);

      const request = createMockRequest();
      const reply = createMockReply();

      await workspaceAuthorizationMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied: You are not a member of this workspace',
        })
      );
    });

    it('fails closed and returns 403 if downstream response contains mismatched workspace ID', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            workspaceId: '33333333-3333-4333-8333-333333333333', // Mismatch!
            userId: '11111111-1111-4111-8111-111111111111',
            role: 'MEMBER',
          },
        }),
      } as unknown as Response);

      const request = createMockRequest();
      const reply = createMockReply();

      await workspaceAuthorizationMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied: Workspace ID mismatch',
        })
      );
    });

    it('fails closed and returns 403 if downstream response contains mismatched user ID', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            workspaceId: '22222222-2222-4222-8222-222222222222',
            userId: '44444444-4444-4444-8444-444444444444', // Mismatch!
            role: 'MEMBER',
          },
        }),
      } as unknown as Response);

      const request = createMockRequest();
      const reply = createMockReply();

      await workspaceAuthorizationMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied: User ID mismatch',
        })
      );
    });

    it('fails closed and returns 403 if downstream response has an unrecognized role or typo', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            workspaceId: '22222222-2222-4222-8222-222222222222',
            userId: '11111111-1111-4111-8111-111111111111',
            role: 'ADMN', // Typo!
          },
        }),
      } as unknown as Response);

      const request = createMockRequest();
      const reply = createMockReply();

      await workspaceAuthorizationMiddleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Access denied: Unrecognized workspace role',
        })
      );
    });

    it('successfully attaches validated workspaceMembership on valid response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            workspaceId: '22222222-2222-4222-8222-222222222222',
            userId: '11111111-1111-4111-8111-111111111111',
            role: 'admin',
          },
        }),
      } as unknown as Response);

      const request = createMockRequest();
      const reply = createMockReply();

      await workspaceAuthorizationMiddleware(request, reply);

      expect(reply.status).not.toHaveBeenCalled();
      expect(request.workspaceMembership).toEqual({
        role: 'ADMIN',
        workspaceId: '22222222-2222-4222-8222-222222222222',
      });
    });
  });

  describe('OperationService Boundary Role Verification', () => {
    const mockAuthPort = {
      authorize: vi.fn(),
    };
    const opService = new OperationService(mockAuthPort);

    it('enforces role rank hierarchy when verified membership is passed', async () => {
      // ADMIN should satisfy MEMBER requirement
      const context = await opService.authorize({
        actorId: 'user-1',
        workspaceId: 'ws-1',
        verifiedMembership: {
          userId: 'user-1',
          workspaceId: 'ws-1',
          role: 'ADMIN',
        },
        requiredRole: 'MEMBER',
      });

      expect(context.role).toBe('ADMIN');
      expect(context.userId).toBe('user-1');
      expect(mockAuthPort.authorize).not.toHaveBeenCalled();
    });

    it('fails closed when verified role has lower rank than required', async () => {
      // VIEWER cannot satisfy MEMBER requirement
      await expect(
        opService.authorize({
          actorId: 'user-1',
          workspaceId: 'ws-1',
          verifiedMembership: {
            userId: 'user-1',
            workspaceId: 'ws-1',
            role: 'VIEWER',
          },
          requiredRole: 'MEMBER',
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
    });

    it('fails closed when verified role is unrecognized or invalid', async () => {
      await expect(
        opService.authorize({
          actorId: 'user-1',
          workspaceId: 'ws-1',
          verifiedMembership: {
            userId: 'user-1',
            workspaceId: 'ws-1',
            role: 'SUPERUSER' as unknown as import('../application/ports/workspace-authorization.port').WorkspaceRole,
          },
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
    });

    it('fails closed when verified membership userId or workspaceId does not match requested actor', async () => {
      await expect(
        opService.authorize({
          actorId: 'user-1',
          workspaceId: 'ws-1',
          verifiedMembership: {
            userId: 'user-imposter',
            workspaceId: 'ws-1',
            role: 'ADMIN',
          },
        })
      ).rejects.toThrow(UnauthorizedExpenseAccessError);
    });

    it('does not trust raw caller-supplied role string and calls remote workspaceAuth', async () => {
      mockAuthPort.authorize.mockResolvedValueOnce({
        userId: 'user-1',
        workspaceId: 'ws-1',
        role: 'MEMBER',
      });

      const context = await opService.authorize({
        actorId: 'user-1',
        workspaceId: 'ws-1',
        role: 'ADMIN', // Unverified claimed role string
        authToken: 'Bearer test-token',
      });

      expect(mockAuthPort.authorize).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          workspaceId: 'ws-1',
          authToken: 'Bearer test-token',
        })
      );
      expect(context.role).toBe('MEMBER');
    });
  });
});
