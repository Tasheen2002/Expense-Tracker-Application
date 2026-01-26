import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkspaceInvitationService } from "../application/services/workspace-invitation.service";
import { IWorkspaceInvitationRepository } from "../domain/repositories/workspace-invitation.repository";
import { IWorkspaceMembershipRepository } from "../domain/repositories/workspace-membership.repository";
import { IUserRepository } from "../domain/repositories/user.repository";
import { WorkspaceRole } from "../domain/entities/workspace-membership.entity";
import { WorkspaceInvitation } from "../domain/entities/workspace-invitation.entity";
import { WorkspaceMembership } from "../domain/entities/workspace-membership.entity";

// Valid UUIDs for testing
const WORKSPACE_ID = "123e4567-e89b-42d3-a456-426614174000";
const USER_ID = "123e4567-e89b-42d3-a456-426614174001";
const INVITATION_ID = "123e4567-e89b-42d3-a456-426614174002";
const EMAIL = "test@example.com";

// Mocks
const mockInvitationRepo = {
  save: vi.fn(),
  findPendingByWorkspaceAndEmail: vi.fn(),
  findById: vi.fn(),
  findByToken: vi.fn(),
  findByWorkspaceId: vi.fn(),
  findByEmail: vi.fn(),
  delete: vi.fn(),
  deleteExpired: vi.fn(),
} as unknown as IWorkspaceInvitationRepository;

const mockMembershipRepo = {
  save: vi.fn(),
  findByUserAndWorkspace: vi.fn(),
} as unknown as IWorkspaceMembershipRepository;

const mockUserRepo = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
} as unknown as IUserRepository;

describe("WorkspaceInvitationService", () => {
  let service: WorkspaceInvitationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkspaceInvitationService(
      mockInvitationRepo,
      mockMembershipRepo,
      mockUserRepo,
    );
  });

  describe("createInvitation", () => {
    it("should create an invitation successfully when all conditions are met", async () => {
      // Setup mocks
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null); // User might not exist yet
      vi.mocked(
        mockInvitationRepo.findPendingByWorkspaceAndEmail,
      ).mockResolvedValue(null);

      const data = {
        workspaceId: WORKSPACE_ID,
        email: EMAIL,
        role: WorkspaceRole.MEMBER,
        invitedBy: USER_ID,
        expiryHours: 168,
      };

      const result = await service.createInvitation(data);

      expect(result).toBeInstanceOf(WorkspaceInvitation);
      expect(result.getEmail()).toBe(EMAIL);
      expect(mockInvitationRepo.save).toHaveBeenCalledTimes(1);
    });

    it("should throw error if user is already a member", async () => {
      // Mock existing user and membership
      const mockUser = { getId: () => ({ getValue: () => USER_ID }) };
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(mockMembershipRepo.findByUserAndWorkspace).mockResolvedValue(
        {} as any,
      );

      const data = {
        workspaceId: WORKSPACE_ID,
        email: EMAIL,
        role: WorkspaceRole.MEMBER,
        invitedBy: USER_ID,
        expiryHours: 168,
      };

      await expect(service.createInvitation(data)).rejects.toThrow(
        "User is already a member",
      );
    });

    it("should throw error if pending invitation exists", async () => {
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(
        mockInvitationRepo.findPendingByWorkspaceAndEmail,
      ).mockResolvedValue({} as any);

      const data = {
        workspaceId: WORKSPACE_ID,
        email: EMAIL,
        role: WorkspaceRole.MEMBER,
        invitedBy: USER_ID,
        expiryHours: 168,
      };

      await expect(service.createInvitation(data)).rejects.toThrow(
        "pending invitation already exists",
      );
    });
  });

  describe("acceptInvitation", () => {
    it("should accept invitation and create membership", async () => {
      const token = "valid-token";

      // Mock valid invitation
      const mockInvitation = {
        isExpired: () => false,
        isAccepted: () => false,
        getEmail: () => EMAIL,
        getWorkspaceId: () => ({ getValue: () => WORKSPACE_ID }),
        getRole: () => WorkspaceRole.MEMBER,
        accept: vi.fn(),
      };
      vi.mocked(mockInvitationRepo.findByToken).mockResolvedValue(
        mockInvitation as any,
      );

      // Mock user finding
      const mockUser = {
        getId: () => ({ getValue: () => USER_ID }),
        getEmail: () => ({ getValue: () => EMAIL }),
      };
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser as any);

      // Mock no existing membership
      vi.mocked(mockMembershipRepo.findByUserAndWorkspace).mockResolvedValue(
        null,
      );

      await service.acceptInvitation(token, USER_ID);

      expect(mockMembershipRepo.save).toHaveBeenCalled();
      expect(mockInvitation.accept).toHaveBeenCalled();
      expect(mockInvitationRepo.save).toHaveBeenCalledWith(mockInvitation);
    });

    it("should throw error if invitation not found", async () => {
      vi.mocked(mockInvitationRepo.findByToken).mockResolvedValue(null);
      await expect(service.acceptInvitation("token", USER_ID)).rejects.toThrow(
        "Invitation not found",
      );
    });

    it("should throw error if invitation expired", async () => {
      const mockInvitation = {
        isExpired: () => true,
      };
      vi.mocked(mockInvitationRepo.findByToken).mockResolvedValue(
        mockInvitation as any,
      );
      await expect(service.acceptInvitation("token", USER_ID)).rejects.toThrow(
        "Invitation has expired",
      );
    });

    it("should throw error if invitation already accepted", async () => {
      const mockInvitation = {
        isExpired: () => false,
        isAccepted: () => true,
      };
      vi.mocked(mockInvitationRepo.findByToken).mockResolvedValue(
        mockInvitation as any,
      );
      await expect(service.acceptInvitation("token", USER_ID)).rejects.toThrow(
        "already been accepted",
      );
    });
  });
});
