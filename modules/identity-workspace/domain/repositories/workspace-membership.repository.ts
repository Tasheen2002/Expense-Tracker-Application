import { WorkspaceMembership } from '../entities/workspace-membership.entity'
import { MembershipId } from '../value-objects/membership-id.vo'
import { UserId } from '../value-objects/user-id.vo'
import { WorkspaceId } from '../value-objects/workspace-id.vo'

export interface IWorkspaceMembershipRepository {
  save(membership: WorkspaceMembership): Promise<void>
  findById(id: MembershipId): Promise<WorkspaceMembership | null>
  findByUserAndWorkspace(
    userId: UserId,
    workspaceId: WorkspaceId
  ): Promise<WorkspaceMembership | null>
  findByUserId(userId: UserId): Promise<WorkspaceMembership[]>
  findByWorkspaceId(workspaceId: WorkspaceId): Promise<WorkspaceMembership[]>
  delete(id: MembershipId): Promise<void>
  exists(userId: UserId, workspaceId: WorkspaceId): Promise<boolean>
  countByWorkspaceId(workspaceId: WorkspaceId): Promise<number>
}
