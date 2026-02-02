import { IWorkspaceInvitationRepository } from "../../domain/repositories/workspace-invitation.repository";
import { IWorkspaceMembershipRepository } from "../../domain/repositories/workspace-membership.repository";
import { IUserRepository } from "../../domain/repositories/user.repository";
import {
  WorkspaceInvitation,
  CreateWorkspaceInvitationData,
} from "../../domain/entities/workspace-invitation.entity";
import {
  WorkspaceMembership,
  WorkspaceRole,
} from "../../domain/entities/workspace-membership.entity";
import { WorkspaceId } from "../../domain/value-objects/workspace-id.vo";
import { InvitationId } from "../../domain/value-objects/invitation-id.vo";
import { UserId } from "../../domain/value-objects/user-id.vo";
import { Email } from "../../domain/value-objects/email.vo";
import {
  MembershipAlreadyExistsError,
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyAcceptedError,
  UserNotFoundError,
} from "../../domain/errors/identity.errors";

export class WorkspaceInvitationService {
  constructor(
    private readonly invitationRepository: IWorkspaceInvitationRepository,
    private readonly membershipRepository: IWorkspaceMembershipRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async createInvitation(
    data: CreateWorkspaceInvitationData,
  ): Promise<WorkspaceInvitation> {
    const workspaceId = WorkspaceId.fromString(data.workspaceId);
    const email = Email.fromString(data.email);

    // Check if user is already a member
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      const membership = await this.membershipRepository.findByUserAndWorkspace(
        existingUser.getId(),
        workspaceId,
      );
      if (membership) {
        throw new MembershipAlreadyExistsError(
          existingUser.getId().getValue(),
          data.workspaceId,
        );
      }
    }

    // Check if there's already a pending invitation
    const pendingInvitation =
      await this.invitationRepository.findPendingByWorkspaceAndEmail(
        workspaceId,
        data.email,
      );
    if (pendingInvitation) {
      throw new MembershipAlreadyExistsError(data.email, data.workspaceId);
    }

    // Create invitation with default 7-day expiry
    const invitation = WorkspaceInvitation.create({
      ...data,
      expiryHours: data.expiryHours || 168, // 7 days
    });

    await this.invitationRepository.save(invitation);
    return invitation;
  }

  async getInvitationById(id: string): Promise<WorkspaceInvitation | null> {
    const invitationId = InvitationId.fromString(id);
    return await this.invitationRepository.findById(invitationId);
  }

  async getInvitationByToken(
    token: string,
  ): Promise<WorkspaceInvitation | null> {
    return await this.invitationRepository.findByToken(token);
  }

  async getWorkspaceInvitations(
    workspaceId: string,
  ): Promise<WorkspaceInvitation[]> {
    const workspaceIdVO = WorkspaceId.fromString(workspaceId);
    return await this.invitationRepository.findByWorkspaceId(workspaceIdVO);
  }

  async getPendingInvitations(
    workspaceId: string,
  ): Promise<WorkspaceInvitation[]> {
    const invitations = await this.getWorkspaceInvitations(workspaceId);
    return invitations.filter((inv) => inv.isPending());
  }

  async getUserInvitations(email: string): Promise<WorkspaceInvitation[]> {
    return await this.invitationRepository.findByEmail(email);
  }

  async acceptInvitation(
    token: string,
    userId: string,
  ): Promise<WorkspaceMembership> {
    const invitation = await this.invitationRepository.findByToken(token);

    if (!invitation) {
      throw new InvitationNotFoundError(token);
    }

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

    if (
      user.getEmail().getValue().toLowerCase() !==
      invitation.getEmail().toLowerCase()
    ) {
      throw new MembershipAlreadyExistsError(
        userId,
        invitation.getWorkspaceId().getValue(),
      );
    }

    // Check if already a member
    const existingMembership =
      await this.membershipRepository.findByUserAndWorkspace(
        user.getId(),
        invitation.getWorkspaceId(),
      );
    if (existingMembership) {
      throw new MembershipAlreadyExistsError(
        userId,
        invitation.getWorkspaceId().getValue(),
      );
    }

    // Create membership
    const membership = WorkspaceMembership.create({
      userId: userId,
      workspaceId: invitation.getWorkspaceId().getValue(),
      role: invitation.getRole(),
    });

    // Mark invitation as accepted
    invitation.accept();

    // Execute atomic transaction
    await this.invitationRepository.acceptInvitationTransaction(
      invitation,
      membership,
    );

    return membership;
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const id = InvitationId.fromString(invitationId);
    const invitation = await this.invitationRepository.findById(id);

    if (!invitation) {
      throw new InvitationNotFoundError(invitationId);
    }

    if (invitation.isAccepted()) {
      throw new InvitationAlreadyAcceptedError();
    }

    await this.invitationRepository.delete(id);
  }

  async cleanupExpiredInvitations(): Promise<number> {
    return await this.invitationRepository.deleteExpired();
  }
}
