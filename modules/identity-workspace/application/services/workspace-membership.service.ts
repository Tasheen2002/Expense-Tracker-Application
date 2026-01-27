import { IWorkspaceMembershipRepository } from '../../domain/repositories/workspace-membership.repository'
import {
  WorkspaceMembership,
  WorkspaceRole,
  CreateWorkspaceMembershipData,
} from '../../domain/entities/workspace-membership.entity'
import { UserId } from '../../domain/value-objects/user-id.vo'
import { WorkspaceId } from '../../domain/value-objects/workspace-id.vo'
import { MembershipId } from '../../domain/value-objects/membership-id.vo'
import {
  MembershipNotFoundError,
  MembershipAlreadyExistsError,
  CannotRemoveOwnerError,
} from '../../domain/errors/identity.errors'

export class WorkspaceMembershipService {
  constructor(private readonly membershipRepository: IWorkspaceMembershipRepository) {}

  async addMember(data: CreateWorkspaceMembershipData): Promise<WorkspaceMembership> {
    const userId = UserId.fromString(data.userId)
    const workspaceId = WorkspaceId.fromString(data.workspaceId)

    // Check if membership already exists
    const existing = await this.membershipRepository.findByUserAndWorkspace(userId, workspaceId)
    if (existing) {
      throw new MembershipAlreadyExistsError(data.userId, data.workspaceId)
    }

    const membership = WorkspaceMembership.create(data)
    await this.membershipRepository.save(membership)
    return membership
  }

  async getMembershipById(id: string): Promise<WorkspaceMembership | null> {
    const membershipId = MembershipId.fromString(id)
    return await this.membershipRepository.findById(membershipId)
  }

  async getUserMembership(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceMembership | null> {
    const userIdVO = UserId.fromString(userId)
    const workspaceIdVO = WorkspaceId.fromString(workspaceId)
    return await this.membershipRepository.findByUserAndWorkspace(userIdVO, workspaceIdVO)
  }

  async getUserMemberships(userId: string): Promise<WorkspaceMembership[]> {
    const userIdVO = UserId.fromString(userId)
    return await this.membershipRepository.findByUserId(userIdVO)
  }

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMembership[]> {
    const workspaceIdVO = WorkspaceId.fromString(workspaceId)
    return await this.membershipRepository.findByWorkspaceId(workspaceIdVO)
  }

  async changeMemberRole(
    membershipId: string,
    newRole: WorkspaceRole
  ): Promise<WorkspaceMembership> {
    const id = MembershipId.fromString(membershipId)
    const membership = await this.membershipRepository.findById(id)

    if (!membership) {
      throw new MembershipNotFoundError(membershipId)
    }

    membership.changeRole(newRole)
    await this.membershipRepository.save(membership)
    return membership
  }

  async removeMember(membershipId: string): Promise<void> {
    const id = MembershipId.fromString(membershipId)
    const membership = await this.membershipRepository.findById(id)

    if (!membership) {
      throw new MembershipNotFoundError(membershipId)
    }

    if (membership.isOwner()) {
      throw new CannotRemoveOwnerError()
    }

    await this.membershipRepository.delete(id)
  }

  async isMember(userId: string, workspaceId: string): Promise<boolean> {
    const userIdVO = UserId.fromString(userId)
    const workspaceIdVO = WorkspaceId.fromString(workspaceId)
    return await this.membershipRepository.exists(userIdVO, workspaceIdVO)
  }

  async hasRole(
    userId: string,
    workspaceId: string,
    requiredRole: WorkspaceRole
  ): Promise<boolean> {
    const membership = await this.getUserMembership(userId, workspaceId)
    if (!membership) {
      return false
    }

    const role = membership.getRole()

    // Owner has all privileges
    if (role === WorkspaceRole.OWNER) {
      return true
    }

    // Admin has admin and member privileges
    if (role === WorkspaceRole.ADMIN && requiredRole !== WorkspaceRole.OWNER) {
      return true
    }

    // Exact role match
    return role === requiredRole
  }

  async canEditWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    const membership = await this.getUserMembership(userId, workspaceId)
    return membership ? membership.canEditWorkspace() : false
  }

  async canManageMembers(userId: string, workspaceId: string): Promise<boolean> {
    const membership = await this.getUserMembership(userId, workspaceId)
    return membership ? membership.canManageMembers() : false
  }

  async canDeleteWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    const membership = await this.getUserMembership(userId, workspaceId)
    return membership ? membership.canDeleteWorkspace() : false
  }

  async getMemberCount(workspaceId: string): Promise<number> {
    const workspaceIdVO = WorkspaceId.fromString(workspaceId)
    return await this.membershipRepository.countByWorkspaceId(workspaceIdVO)
  }
}
