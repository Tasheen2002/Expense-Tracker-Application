import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceInvitationService } from '../application/services/workspace-invitation.service';
import { IWorkspaceInvitationRepository } from '../domain/repositories/workspace-invitation.repository';
import { IWorkspaceMembershipRepository } from '../domain/repositories/workspace-membership.repository';
import { IUserRepository } from '../domain/repositories/user.repository';
import { IWorkspaceRepository } from '../domain/repositories/workspace.repository';
import { WorkspaceRole } from '../domain/entities/workspace-membership.entity';
import { WorkspaceInvitation } from '../domain/entities/workspace-invitation.entity';

// Valid UUIDs for testing
const WORKSPACE_ID = '123e4567-e89b-42d3-a456-426614174000';
const USER_ID = '123e4567-e89b-42d3-a456-426614174001';
const EMAIL = 'test@example.com';

// Mocks
const mockInvitationRepo = {
  save: vi.fn(),
  findPendingByWorkspaceAndEmail: vi.fn(),
  findPendingByWorkspaceId: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  findById: vi.fn(),
  findByToken: vi.fn(),
  findByWorkspaceId: vi.fn(),
  findByEmail: vi.fn(),
  delete: vi.fn(),
  deleteExpired: vi.fn(),
  acceptInvitationTransaction: vi.fn(),
} as unknown as IWorkspaceInvitationRepository;

const mockMembershipRepo = {
  save: vi.fn(),
  findByUserAndWorkspace: vi.fn(),
} as unknown as IWorkspaceMembershipRepository;

const mockUserRepo = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
} as unknown as IUserRepository;

const mockWorkspaceRepo = {
  save: vi.fn(),
  findById: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
} as unknown as IWorkspaceRepository;

describe('WorkspaceInvitationService', () => {
  let service: WorkspaceInvitationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkspaceInvitationService(
      mockInvitationRepo,
      mockMembershipRepo,
      mockUserRepo,
      mockWorkspaceRepo
    );
    vi.mocked(mockWorkspaceRepo.findById).mockResolvedValue({
      isActive: true,
    } as any);
  });

  describe('createInvitation', () => {
    it('should create an invitation successfully when all conditions are met', async () => {
      // Setup mocks
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null); // User might not exist yet
      vi.mocked(
        mockInvitationRepo.findPendingByWorkspaceAndEmail
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
      expect(result.email).toBe(EMAIL);
      expect(result.role).toBe(WorkspaceRole.MEMBER);
      expect(mockInvitationRepo.save).toHaveBeenCalled();
    });

    it('should throw error if user is already a member', async () => {
      // Setup mocks: User exists and is already a member
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
        id: { getValue: () => USER_ID },
      } as any);
      vi.mocked(mockMembershipRepo.findByUserAndWorkspace).mockResolvedValue({
        id: 'existing-membership',
      } as any);

      const data = {
        workspaceId: WORKSPACE_ID,
        email: EMAIL,
        role: WorkspaceRole.MEMBER,
        invitedBy: USER_ID,
        expiryHours: 168,
      };

      await expect(service.createInvitation(data)).rejects.toThrow(
        /already a member/
      );
    });

    it('should throw error if pending invitation exists', async () => {
      // Setup mocks: User is not a member, but pending invitation exists
      vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
      vi.mocked(
        mockInvitationRepo.findPendingByWorkspaceAndEmail
      ).mockResolvedValue({
        id: 'existing-invitation',
      } as any);

      const data = {
        workspaceId: WORKSPACE_ID,
        email: EMAIL,
        role: WorkspaceRole.MEMBER,
        invitedBy: USER_ID,
        expiryHours: 168,
      };

      await expect(service.createInvitation(data)).rejects.toThrow(
        /Pending invitation already exists/i
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and create membership', async () => {
      const token = 'valid-token';

      // Mock valid invitation
      const mockInvitation = {
        isExpired: () => false,
        isAccepted: () => false,
        isCancelled: () => false,
        email: EMAIL,
        workspaceId: { getValue: () => WORKSPACE_ID },
        role: WorkspaceRole.MEMBER,
        accept: vi.fn(),
      };
      vi.mocked(mockInvitationRepo.findByToken).mockResolvedValue(
        mockInvitation as any
      );

      // Mock user finding
      const mockUser = {
        id: { getValue: () => USER_ID },
        email: { getValue: () => EMAIL },
        isActive: true,
      };
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser as any);

      // Mock no existing membership
      vi.mocked(mockMembershipRepo.findByUserAndWorkspace).mockResolvedValue(
        null
      );

      await service.acceptInvitation(token, USER_ID);

      expect(mockInvitation.accept).toHaveBeenCalled();
      expect(mockInvitationRepo.acceptInvitationTransaction).toHaveBeenCalled();
    });

    it('should throw error if invitation not found', async () => {
      vi.mocked(mockInvitationRepo.findByToken).mockResolvedValue(null);
      await expect(service.acceptInvitation('token', USER_ID)).rejects.toThrow(
        /not found/
      );
    });

    it('should throw error if invitation expired', async () => {
      const mockInvitation = {
        isExpired: () => true,
        isAccepted: () => false,
        isCancelled: () => false,
      };
      vi.mocked(mockInvitationRepo.findByToken).mockResolvedValue(
        mockInvitation as any
      );
      await expect(service.acceptInvitation('token', USER_ID)).rejects.toThrow(
        /expired/
      );
    });

    it('should throw error if invitation already accepted', async () => {
      const mockInvitation = {
        isExpired: () => false,
        isAccepted: () => true,
        isCancelled: () => false,
      };
      vi.mocked(mockInvitationRepo.findByToken).mockResolvedValue(
        mockInvitation as any
      );
      await expect(service.acceptInvitation('token', USER_ID)).rejects.toThrow(
        /already been accepted/
      );
    });
  });
});
