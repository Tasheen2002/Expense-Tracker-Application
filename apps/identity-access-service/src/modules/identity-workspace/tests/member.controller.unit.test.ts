import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberController } from '../infrastructure/http/controllers/member.controller';
import { WorkspaceAuthHelper } from '../infrastructure/http/middleware/workspace-auth.helper';
import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '@shared/interfaces/authenticated-request.interface';
import { CommandResult } from '@core/application/command-result';

// Mock handlers
const mockListMembersHandler = {
  handle: vi.fn(),
};

const mockRemoveMemberHandler = {
  handle: vi.fn(),
};

const mockChangeMemberRoleHandler = {
  handle: vi.fn(),
};

const mockAuthHelper = {
  getUserFromRequest: vi.fn(),
  verifyMembership: vi.fn(),
  verifyCanManageMembers: vi.fn(),
  verifyCanDelete: vi.fn(),
  verifyCanEdit: vi.fn(),
} as unknown as WorkspaceAuthHelper;

// Mock Reply
const mockReply = {
  status: vi.fn().mockReturnThis(),
  send: vi.fn(),
} as unknown as FastifyReply;

describe('MemberController (Unit)', () => {
  let controller: MemberController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MemberController(
      mockListMembersHandler as any,
      mockRemoveMemberHandler as any,
      mockChangeMemberRoleHandler as any,
      mockAuthHelper
    );
  });

  describe('removeMember', () => {
    it('should successfully remove a member', async () => {
      const req = {
        params: { workspaceId: 'ws-1', userId: 'user-2' },
        user: {
          id: 'user-1',
          userId: 'user-1',
          email: 'test@example.com',
          workspaceId: 'ws-1',
        },
      } as unknown as AuthenticatedRequest<{
        Params: { workspaceId: string; userId: string };
      }>;

      // Mock Auth - can manage members
      vi.mocked(mockAuthHelper.verifyCanManageMembers).mockResolvedValue(true);

      // Mock handler success
      mockRemoveMemberHandler.handle.mockResolvedValue(
        CommandResult.success(undefined)
      );

      await controller.removeMember(req, mockReply);

      expect(mockRemoveMemberHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-2',
      });
    });

    it('should handle member not found', async () => {
      const req = {
        params: { workspaceId: 'ws-1', userId: 'user-unknown' },
        user: {
          id: 'user-1',
          userId: 'user-1',
          email: 'test@example.com',
          workspaceId: 'ws-1',
        },
      } as unknown as AuthenticatedRequest<{
        Params: { workspaceId: string; userId: string };
      }>;

      vi.mocked(mockAuthHelper.verifyCanManageMembers).mockResolvedValue(true);

      // Handler returns a failed CommandResult (handler has try/catch)
      const notFoundError = new Error('Member not found');
      (notFoundError as any).statusCode = 404;
      mockRemoveMemberHandler.handle.mockResolvedValue(
        CommandResult.fromError(notFoundError)
      );

      await controller.removeMember(req, mockReply);

      // ResponseHelper.fromCommand handles failed results
      expect(mockReply.status).toHaveBeenCalledWith(404);
    });
  });
});
