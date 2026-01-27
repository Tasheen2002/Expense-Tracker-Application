import { IWorkspaceRepository } from '../../domain/repositories/workspace.repository'
import { IWorkspaceMembershipRepository } from '../../domain/repositories/workspace-membership.repository'
import { Workspace, CreateWorkspaceData } from '../../domain/entities/workspace.entity'
import { WorkspaceMembership, WorkspaceRole } from '../../domain/entities/workspace-membership.entity'
import { WorkspaceId } from '../../domain/value-objects/workspace-id.vo'
import { UserId } from '../../domain/value-objects/user-id.vo'
import {
  WorkspaceNotFoundError,
  WorkspaceAlreadyExistsError,
} from '../../domain/errors/identity.errors'

export interface WorkspaceManagementServiceOptions {
  page?: number
  limit?: number
  isActive?: boolean
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export class WorkspaceManagementService {
  constructor(
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly membershipRepository: IWorkspaceMembershipRepository
  ) {}

  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    // Check if slug already exists
    const slug = Workspace['generateSlug'](data.name) // Access private static method for validation
    const existingWorkspace = await this.workspaceRepository.findBySlug(slug)
    if (existingWorkspace) {
      throw new WorkspaceAlreadyExistsError(slug)
    }

    // Create workspace
    const workspace = Workspace.create(data)
    await this.workspaceRepository.save(workspace)

    // CRITICAL: Automatically create owner membership
    const ownerMembership = WorkspaceMembership.create({
      userId: data.ownerId,
      workspaceId: workspace.getId().getValue(),
      role: WorkspaceRole.OWNER,
    })
    await this.membershipRepository.save(ownerMembership)

    return workspace
  }

  async getWorkspaceById(id: string): Promise<Workspace | null> {
    const workspaceId = WorkspaceId.fromString(id)
    return await this.workspaceRepository.findById(workspaceId)
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    return await this.workspaceRepository.findBySlug(slug)
  }

  async getWorkspacesByOwnerId(ownerId: string): Promise<Workspace[]> {
    const ownerUserId = UserId.fromString(ownerId)
    return await this.workspaceRepository.findByOwnerId(ownerUserId)
  }

  async getWorkspacesByMembership(userId: string): Promise<Workspace[]> {
    const userIdVO = UserId.fromString(userId)

    // Get all memberships for the user
    const memberships = await this.membershipRepository.findByUserId(userIdVO)

    // Get workspaces for each membership
    const workspacePromises = memberships.map((membership) =>
      this.workspaceRepository.findById(membership.getWorkspaceId())
    )

    const workspaces = await Promise.all(workspacePromises)

    // Filter out null values (in case workspace was deleted)
    return workspaces.filter((workspace): workspace is Workspace => workspace !== null)
  }

  async getWorkspaces(options: WorkspaceManagementServiceOptions = {}): Promise<Workspace[]> {
    const { page = 1, limit = 50, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = options

    const repositoryOptions = {
      limit,
      offset: (page - 1) * limit,
      isActive,
      sortBy,
      sortOrder,
    }

    return await this.workspaceRepository.findAll(repositoryOptions)
  }

  async updateWorkspace(
    id: string,
    updateData: Partial<CreateWorkspaceData>
  ): Promise<Workspace | null> {
    const workspaceId = WorkspaceId.fromString(id)
    const workspace = await this.workspaceRepository.findById(workspaceId)

    if (!workspace) {
      throw new WorkspaceNotFoundError(id)
    }

    // Update name if provided
    if (updateData.name !== undefined) {
      const newSlug = Workspace['generateSlug'](updateData.name)
      const existingWorkspace = await this.workspaceRepository.findBySlug(newSlug)
      if (existingWorkspace && !existingWorkspace.getId().equals(workspaceId)) {
        throw new WorkspaceAlreadyExistsError(newSlug)
      }
      workspace.updateName(updateData.name)
    }

    await this.workspaceRepository.update(workspace)
    return workspace
  }

  async deactivateWorkspace(id: string): Promise<Workspace | null> {
    const workspaceId = WorkspaceId.fromString(id)
    const workspace = await this.workspaceRepository.findById(workspaceId)

    if (!workspace) {
      throw new WorkspaceNotFoundError(id)
    }

    workspace.deactivate()
    await this.workspaceRepository.update(workspace)
    return workspace
  }

  async activateWorkspace(id: string): Promise<Workspace | null> {
    const workspaceId = WorkspaceId.fromString(id)
    const workspace = await this.workspaceRepository.findById(workspaceId)

    if (!workspace) {
      throw new WorkspaceNotFoundError(id)
    }

    workspace.activate()
    await this.workspaceRepository.update(workspace)
    return workspace
  }

  async deleteWorkspace(id: string): Promise<boolean> {
    const workspaceId = WorkspaceId.fromString(id)
    const workspace = await this.workspaceRepository.findById(workspaceId)

    if (!workspace) {
      return false
    }

    await this.workspaceRepository.delete(workspaceId)
    return true
  }

  async getWorkspaceCount(): Promise<number> {
    return await this.workspaceRepository.count()
  }
}
