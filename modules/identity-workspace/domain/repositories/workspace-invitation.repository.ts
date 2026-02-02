import { WorkspaceInvitation } from "../entities/workspace-invitation.entity";
import { WorkspaceMembership } from "../entities/workspace-membership.entity";
import { InvitationId } from "../value-objects/invitation-id.vo";
import { WorkspaceId } from "../value-objects/workspace-id.vo";

export interface IWorkspaceInvitationRepository {
  save(invitation: WorkspaceInvitation): Promise<void>;
  findById(id: InvitationId): Promise<WorkspaceInvitation | null>;
  findByToken(token: string): Promise<WorkspaceInvitation | null>;
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceInvitation[]>;
  findByEmail(email: string): Promise<WorkspaceInvitation[]>;
  findPendingByWorkspaceAndEmail(
    workspaceId: WorkspaceId,
    email: string,
  ): Promise<WorkspaceInvitation | null>;
  delete(id: InvitationId): Promise<void>;
  deleteExpired(): Promise<number>;

  // Transactional operations
  acceptInvitationTransaction(
    invitation: WorkspaceInvitation,
    membership: WorkspaceMembership,
  ): Promise<void>;
}
