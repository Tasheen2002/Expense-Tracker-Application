import { IWorkspaceRepository } from '../../domain/repositories/workspace.repository';
import {
  WorkspaceNotFoundError,
  WorkspaceInactiveError,
  UserInactiveError,
  InvitationCancelledError,
  WorkspaceInvitationLimitReachedError,
} from '../../domain/errors/identity.errors';
import { MAX_INVITATIONS_PER_WORKSPACE } from '../../domain/constants/identity.constants';
import { IWorkspaceInvitationRepository } from '../../domain/repositories/workspace-invitation.repository';
import { IWorkspaceMembershipRepository } from '../../domain/repositories/workspace-membership.repository';
import { IUserRepository } from '../../domain/repositories/user.repository';
import {
  WorkspaceInvitation,
  WorkspaceInvitationDTO,
  CreateWorkspaceInvitationData,
} from '../../domain/entities/workspace-invitation.entity';
import {
  WorkspaceMembership,
  WorkspaceMembershipDTO,
} from '../../domain/entities/workspace-membership.entity';
import { WorkspaceId } from '../../domain/value-objects/workspace-id.vo';
import { InvitationId } from '../../domain/value-objects/invitation-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { Email } from '../../domain/value-objects/email.vo';
import {
  MembershipAlreadyExistsError,
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyAcceptedError,
  UserNotFoundError,
  DuplicateInvitationError,
  InvitationEmailMismatchError,
} from '../../domain/errors/identity.errors';

import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export class WorkspaceInvitationService {
  constructor(
    private readonly invitationRepository: IWorkspaceInvitationRepository,
    private readonly membershipRepository: IWorkspaceMembershipRepository,
    private readonly userRepository: IUserRepository,
    private readonly workspaceRepository: IWorkspaceRepository
  ) {}

  async createInvitation(
    data: CreateWorkspaceInvitationData
  ): Promise<WorkspaceInvitation> {
    const workspaceId = WorkspaceId.fromString(data.workspaceId);
    const email = Email.fromString(data.email);
    const workspace = await this.workspaceRepository.findById(workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(data.workspaceId);
    if (!workspace.isActive) throw new WorkspaceInactiveError(data.workspaceId);
    const pending = await this.invitationRepository.findPendingByWorkspaceId(workspaceId, { limit: 1 });
    if (pending.total >= MAX_INVITATIONS_PER_WORKSPACE) {
      throw new WorkspaceInvitationLimitReachedError(MAX_INVITATIONS_PER_WORKSPACE);
    }

    // Check if user is already a member
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      const membership = await this.membershipRepository.findByUserAndWorkspace(
        existingUser.id,
        workspaceId
      );
      if (membership) {
        throw new MembershipAlreadyExistsError(
          existingUser.id.getValue(),
          data.workspaceId
        );
      }
    }

    // Check if there's already a pending invitation
    const pendingInvitation =
      await this.invitationRepository.findPendingByWorkspaceAndEmail(
        workspaceId,
        email.getValue()
      );
    if (pendingInvitation) {
      throw new DuplicateInvitationError(data.email, data.workspaceId);
    }

    const invitation = WorkspaceInvitation.create({ ...data, email: email.getValue() });
    await this.invitationRepository.save(invitation);
    return invitation;
  }

  async getInvitationById(id: string): Promise<WorkspaceInvitation | null> {
    const invitationId = InvitationId.fromString(id);
    return await this.invitationRepository.findById(invitationId);
  }

  async getInvitationByToken(
    token: string
  ): Promise<WorkspaceInvitation | null> {
    return await this.invitationRepository.findByToken(token);
  }

  async getWorkspaceInvitations(
    workspaceId: string
  ): Promise<WorkspaceInvitation[]> {
    const workspaceIdVO = WorkspaceId.fromString(workspaceId);
    const result =
      await this.invitationRepository.findByWorkspaceId(workspaceIdVO);
    return result.items;
  }

  async getPendingInvitations(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<WorkspaceInvitation>> {
    const workspaceIdVO = WorkspaceId.fromString(workspaceId);
    return await this.invitationRepository.findPendingByWorkspaceId(
      workspaceIdVO,
      options
    );
  }

  async getUserInvitations(email: string): Promise<WorkspaceInvitation[]> {
    const result = await this.invitationRepository.findByEmail(email);
    return result.items;
  }

  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<WorkspaceMembership> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      throw new InvitationNotFoundError(token);
    }

    if (invitation.isCancelled()) throw new InvitationCancelledError();
    const workspace = await this.workspaceRepository.findById(invitation.workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(invitation.workspaceId.getValue());
    if (!workspace.isActive) throw new WorkspaceInactiveError(invitation.workspaceId.getValue());
    if (invitation.isExpired()) {
      throw new InvitationExpiredError();
    }

    if (invitation.isAccepted()) {
      throw new InvitationAlreadyAcceptedError();
    }

    // Verify the user's email matches the invitation
    const user = await this.userRepository.findById(UserId.fromString(userId));
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!user.isActive) throw new UserInactiveError();
    if (
      user.email.getValue().toLowerCase() !==
      invitation.email.toLowerCase()
    ) {
      throw new InvitationEmailMismatchError();
    }

    // Check if already a member
    const existingMembership =
      await this.membershipRepository.findByUserAndWorkspace(
        user.id,
        invitation.workspaceId
      );
    if (existingMembership) {
      throw new MembershipAlreadyExistsError(
        userId,
        invitation.workspaceId.getValue()
      );
    }

    // Create membership
    const membership = WorkspaceMembership.create({
      userId: userId,
      workspaceId: invitation.workspaceId.getValue(),
      role: invitation.role,
    });

    // Mark invitation as accepted
    invitation.accept();

    // Execute atomic transaction
    await this.invitationRepository.acceptInvitationTransaction(
      invitation,
      membership
    );

    return membership;
  }

  async cancelInvitation(invitationId: string, workspaceId: string): Promise<void> {
    const id = InvitationId.fromString(invitationId);
    const invitation = await this.invitationRepository.findById(id);

    if (!invitation || invitation.workspaceId.getValue() !== workspaceId) {
      throw new InvitationNotFoundError('requested resource');
    }

    if (invitation.isAccepted()) {
      throw new InvitationAlreadyAcceptedError();
    }

    invitation.markAsCancelled();
    await this.invitationRepository.save(invitation);

  }

  async cleanupExpiredInvitations(): Promise<number> {
    return await this.invitationRepository.deleteExpired();
  }

  async createInvitationDTO(
    data: CreateWorkspaceInvitationData
  ): Promise<WorkspaceInvitationDTO> {
    const invitation = await this.createInvitation(data);
    return WorkspaceInvitation.toDTO(invitation);
  }

  async acceptInvitationDTO(
    token: string,
    userId: string
  ): Promise<WorkspaceMembershipDTO> {
    const membership = await this.acceptInvitation(token, userId);
    return WorkspaceMembership.toDTO(membership);
  }

  async getInvitationDTOByToken(
    token: string
  ): Promise<WorkspaceInvitationDTO | null> {
    const invitation = await this.getInvitationByToken(token);
    return invitation ? WorkspaceInvitation.toDTO(invitation) : null;
  }

  async getWorkspaceInvitationDTOs(
    workspaceId: string
  ): Promise<WorkspaceInvitationDTO[]> {
    const invitations = await this.getWorkspaceInvitations(workspaceId);
    return invitations.map((inv) => WorkspaceInvitation.toDTO(inv));
  }

  async getPendingInvitationDTOs(
    workspaceId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<WorkspaceInvitationDTO>> {
    const result = await this.getPendingInvitations(workspaceId, options);
    return {
      ...result,
      items: result.items.map((inv) => WorkspaceInvitation.toDTO(inv)),
    };
  }

  async getUserInvitationDTOs(
    email: string
  ): Promise<WorkspaceInvitationDTO[]> {
    const invitations = await this.getUserInvitations(email);
    return invitations.map((inv) => WorkspaceInvitation.toDTO(inv));
  }
}
