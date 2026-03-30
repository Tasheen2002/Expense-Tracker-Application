import { WorkspaceMembership } from "../entities/workspace-membership.entity";
import { MembershipId } from "../value-objects/membership-id.vo";
import { UserId } from "../value-objects/user-id.vo";
import { WorkspaceId } from "../value-objects/workspace-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IWorkspaceMembershipRepository {
  save(membership: WorkspaceMembership): Promise<void>;
  findById(id: MembershipId): Promise<WorkspaceMembership | null>;
  findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId,
  ): Promise<WorkspaceMembership | null>;
  findByUserId(
    userId: UserId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceMembership>>;
  findByWorkspaceId(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<WorkspaceMembership>>;
  delete(id: MembershipId): Promise<void>;
  exists(userId: UserId, workspaceId: WorkspaceId): Promise<boolean>;
  countByWorkspaceId(workspaceId: WorkspaceId): Promise<number>;
}
