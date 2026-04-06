import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberController } from '../infrastructure/http/controllers/member.controller';
import { ListWorkspaceMembersHandler } from '../application/queries/list-workspace-members.query';
import { RemoveMemberHandler } from '../application/commands/remove-member.command';
import { ChangeMemberRoleHandler } from '../application/commands/change-member-role.command';
import { WorkspaceAuthHelper } from '../infrastructure/http/middleware/workspace-auth.helper';
import { WorkspaceRole } from '../domain/entities/workspace-membership.entity';
import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { CommandResult } from '../../../packages/core/src/application/command-result';

// Mock CQRS handlers
const mockListMembersHandler = {
  handle: vi.fn(),
} as unknown as ListWorkspaceMembersHandler;

const mockRemoveMemberHandler = {
  handle: vi.fn(),
} as unknown as RemoveMemberHandler;

const mockChangeMemberRoleHandler = {
  handle: vi.fn(),
} as unknown as ChangeMemberRoleHandler;

const mockAuthHelper = {
  getUserFromRequest: vi.fn(),
  verifyMembership: vi.fn(),
  verifyCanManageMembers: vi.fn(),
  verifyCanDelete: vi.fn(),
} as unknown as WorkspaceAuthHelper;

// Mock Request/Reply
const mockReply = {
  status: vi.fn().mockReturnThis(),
  send: vi.fn(),
} as unknown as FastifyReply;

describe('MemberController (Unit)', () => {
  let controller: MemberController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MemberController(
      mockListMembersHandler,
      mockRemoveMemberHandler,
      mockChangeMemberRoleHandler,
      mockAuthHelper
    );
  });

  describe('removeMember', () => {
    it('should successfully remove a member after name lookup', async () => {
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

      // Mock Auth
      vi.mocked(mockAuthHelper.verifyCanManageMembers).mockResolvedValue(true);

      // Mock handler returning success
      vi.mocked(mockRemoveMemberHandler.handle).mockResolvedValue(
        CommandResult.success(undefined)
      );

      // Execute
      await controller.removeMember(req, mockReply);

      // Verify handler was called with correct CQRS command
      expect(mockRemoveMemberHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-2',
      });
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });

    it('should fail if member not found', async () => {
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

      // Handler returns failure when member not found
      vi.mocked(mockRemoveMemberHandler.handle).mockResolvedValue(
        CommandResult.failure('Member not found in this workspace')
      );

      await controller.removeMember(req, mockReply);

      expect(mockRemoveMemberHandler.handle).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-unknown',
      });
      // fromCommand maps failure to 400
      expect(mockReply.status).toHaveBeenCalledWith(400);
    });
  });
});
