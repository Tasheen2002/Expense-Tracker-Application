import { WorkspaceInvitation } from "../entities/workspace-invitation.entity";
import { WorkspaceMembership } from "../entities/workspace-membership.entity";
import { InvitationId } from "../value-objects/invitation-id.vo";
import { WorkspaceId } from "../value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IWorkspaceInvitationRepository {
  save(invitation: WorkspaceInvitation): Promise<void>;
  findById(id: InvitationId): Promise<WorkspaceInvitation | null>;
  findByToken(token: string): Promise<WorkspaceInvitation | null>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceInvitation>>;
  findByEmail(
    email: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceInvitation>>;
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
