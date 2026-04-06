import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemberController } from '../infrastructure/http/controllers/member.controller';
import { WorkspaceMembershipService } from '../application/services/workspace-membership.service';
import { WorkspaceAuthHelper } from '../infrastructure/http/middleware/workspace-auth.helper';
import { WorkspaceMembership } from '../domain/entities/workspace-membership.entity';
import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../../../apps/api/src/shared/interfaces/authenticated-request.interface';
import { MembershipId } from '../domain/value-objects/membership-id.vo';

// Mock MembershipService
const mockMembershipService = {
  getUserMembership: vi.fn(),
  removeMember: vi.fn(),
  changeMemberRole: vi.fn(),
  getWorkspaceMembers: vi.fn(),
  isMember: vi.fn(),
} as unknown as WorkspaceMembershipService;

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
      mockMembershipService,
      mockAuthHelper
    );
  });

  describe('removeMember', () => {
    it('should successfully remove a member after lookup', async () => {
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

      // Mock membership lookup
      const testMembershipId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockMembership = {
        getId: () => MembershipId.fromString(testMembershipId),
      } as unknown as WorkspaceMembership;
      vi.mocked(mockMembershipService.getUserMembership).mockResolvedValue(mockMembership);
      vi.mocked(mockMembershipService.removeMember).mockResolvedValue(undefined);

      await controller.removeMember(req, mockReply);

      expect(mockMembershipService.getUserMembership).toHaveBeenCalledWith('user-2', 'ws-1');
      expect(mockMembershipService.removeMember).toHaveBeenCalledWith(testMembershipId);
      expect(mockReply.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 if member not found', async () => {
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
      vi.mocked(mockMembershipService.getUserMembership).mockResolvedValue(null);

      await controller.removeMember(req, mockReply);

      expect(mockMembershipService.getUserMembership).toHaveBeenCalledWith('user-unknown', 'ws-1');
      expect(mockMembershipService.removeMember).not.toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(404);
    });
  });
});
