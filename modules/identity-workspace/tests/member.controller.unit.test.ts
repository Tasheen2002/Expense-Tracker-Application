import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemberController } from "../infrastructure/http/controllers/member.controller";
import { WorkspaceMembershipService } from "../application/services/workspace-membership.service";
import { WorkspaceAuthHelper } from "../infrastructure/http/middleware/workspace-auth.helper";
import { WorkspaceRole } from "../domain/entities/workspace-membership.entity";
import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../../../apps/api/src/shared/interfaces/authenticated-request.interface";

// Mock dependencies
const mockMembershipService = {
  getUserMembership: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(), // If this is the method name in the service
  changeMemberRole: vi.fn(), // Current service method name
  getWorkspaceMembers: vi.fn(),
} as unknown as WorkspaceMembershipService;

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

describe("MemberController (Unit)", () => {
  let controller: MemberController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new MemberController(mockMembershipService, mockAuthHelper);
  });

  describe("removeMember", () => {
    it("should successfully remove a member after name lookup", async () => {
      const req = {
        params: { workspaceId: "ws-1", userId: "user-2" },
        user: {
          id: "user-1",
          userId: "user-1",
          email: "test@example.com",
          workspaceId: "ws-1",
        },
      } as unknown as AuthenticatedRequest<{
        Params: { workspaceId: string; userId: string };
      }>;

      // Mock Auth
      vi.mocked(mockAuthHelper.verifyCanManageMembers).mockResolvedValue(true);

      // Mock Lookup
      const mockMembership = { getId: () => ({ getValue: () => "mem-123" }) };
      vi.mocked(mockMembershipService.getUserMembership).mockResolvedValue(
        mockMembership as any,
      );

      // Execute
      await controller.removeMember(req, mockReply);

      // Verify Logic
      expect(mockMembershipService.getUserMembership).toHaveBeenCalledWith(
        "user-2",
        "ws-1",
      );
      expect(mockMembershipService.removeMember).toHaveBeenCalledWith(
        "mem-123",
      );
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it("should fail if member not found", async () => {
      const req = {
        params: { workspaceId: "ws-1", userId: "user-unknown" },
        user: {
          id: "user-1",
          userId: "user-1",
          email: "test@example.com",
          workspaceId: "ws-1",
        },
      } as unknown as AuthenticatedRequest<{
        Params: { workspaceId: string; userId: string };
      }>;

      vi.mocked(mockAuthHelper.verifyCanManageMembers).mockResolvedValue(true);
      vi.mocked(mockMembershipService.getUserMembership).mockResolvedValue(
        null,
      );

      await controller.removeMember(req, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockMembershipService.removeMember).not.toHaveBeenCalled();
    });
  });
});
