import { IWorkspaceRepository } from '../../domain/repositories/workspace.repository';
import { IWorkspaceMembershipRepository } from '../../domain/repositories/workspace-membership.repository';
import {
  Workspace,
  WorkspaceDTO,
  CreateWorkspaceData,
} from '../../domain/entities/workspace.entity';
import {
  WorkspaceMembership,
  WorkspaceRole,
} from '../../domain/entities/workspace-membership.entity';
import { WorkspaceId } from '../../domain/value-objects/workspace-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import {
  WorkspaceNotFoundError,
  WorkspaceAlreadyExistsError,
} from '../../domain/errors/identity.errors';
import { MembershipNotFoundError, InsufficientPermissionsError } from '../../domain/errors/identity.errors';
import { PaginationOptions, PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface WorkspaceManagementServiceOptions {
  page?: number;
  limit?: number;
  isActive?: boolean;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export class WorkspaceManagementService {
  constructor(
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly membershipRepository: IWorkspaceMembershipRepository
  ) {}

  async createWorkspaceDTO(data: CreateWorkspaceData): Promise<WorkspaceDTO> {
    const workspace = await this.createWorkspace(data);
    return Workspace.toDTO(workspace);
  }

  async getWorkspaceDTOById(id: string): Promise<WorkspaceDTO> {
    const workspace = await this.getWorkspaceById(id);
    if (!workspace) throw new WorkspaceNotFoundError(id);
    return Workspace.toDTO(workspace);
  }

  async updateWorkspaceDTO(
    id: string,
    updateData: Partial<CreateWorkspaceData>
  ): Promise<WorkspaceDTO> {
    const workspace = await this.updateWorkspace(id, updateData);
    return Workspace.toDTO(workspace);
  }

  async deactivateWorkspaceDTO(id: string): Promise<WorkspaceDTO> {
    const workspace = await this.deactivateWorkspace(id);
    return Workspace.toDTO(workspace);
  }

  async activateWorkspaceDTO(id: string): Promise<WorkspaceDTO> {
    const workspace = await this.activateWorkspace(id);
    return Workspace.toDTO(workspace);
  }

  async getWorkspacesDTOByMembership(
    userId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<WorkspaceDTO>> {
    const result = await this.getWorkspacesByMembership(userId, options);
    return { ...result, items: result.items.map((w) => Workspace.toDTO(w)) };
  }

  async createWorkspace(data: CreateWorkspaceData): Promise<Workspace> {
    const slug = Workspace.generateSlug(data.name);

    // Check if workspace with same slug already exists
    const existingWorkspace = await this.workspaceRepository.findBySlug(slug);
    if (existingWorkspace) {
      throw new WorkspaceAlreadyExistsError(slug);
    }

    // Create the workspace
    const workspace = Workspace.create(data);

    // Save workspace
    await this.workspaceRepository.save(workspace);

    // Create membership for the owner (as OWNER role)
    const membership = WorkspaceMembership.create({
      userId: data.ownerId,
      workspaceId: workspace.id.getValue(),
      role: WorkspaceRole.OWNER,
    });

    await this.membershipRepository.save(membership);

    return workspace;
  }

  async getWorkspaceById(id: string): Promise<Workspace | null> {
    const workspaceId = WorkspaceId.fromString(id);
    return await this.workspaceRepository.findById(workspaceId);
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    return await this.workspaceRepository.findBySlug(slug);
  }

  async getWorkspacesByOwnerId(ownerId: string): Promise<Workspace[]> {
    const ownerUserId = UserId.fromString(ownerId);
    const result = await this.workspaceRepository.findByOwnerId(ownerUserId);
    return result.items;
  }

  async getWorkspacesByMembership(
    userId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Workspace>> {
    const userIdVO = UserId.fromString(userId);

    return this.workspaceRepository.findByMemberId(userIdVO, options);
  }

  async getWorkspaces(
    options: WorkspaceManagementServiceOptions = {}
  ): Promise<Workspace[]> {
    const {
      page = 1,
      limit = 50,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const repositoryOptions = {
      limit,
      offset: (page - 1) * limit,
      isActive,
      sortBy,
      sortOrder,
    };

    const result = await this.workspaceRepository.findAll(repositoryOptions);
    return result.items;
  }

  async updateWorkspace(
    id: string,
    updateData: Partial<CreateWorkspaceData>
  ): Promise<Workspace> {
    const workspaceId = WorkspaceId.fromString(id);
    const workspace = await this.workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new WorkspaceNotFoundError(id);
    }

    // Update name if provided
    if (updateData.name !== undefined) {
      const newSlug = Workspace.generateSlug(updateData.name);
      const existingWorkspace =
        await this.workspaceRepository.findBySlug(newSlug);
      if (existingWorkspace && !existingWorkspace.id.equals(workspaceId)) {
        throw new WorkspaceAlreadyExistsError(newSlug);
      }
      workspace.updateName(updateData.name);
    }

    await this.workspaceRepository.save(workspace);
    return workspace;
  }

  async deactivateWorkspace(id: string): Promise<Workspace> {
    const workspaceId = WorkspaceId.fromString(id);
    const workspace = await this.workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new WorkspaceNotFoundError(id);
    }

    workspace.deactivate();
    await this.workspaceRepository.save(workspace);
    return workspace;
  }

  async activateWorkspace(id: string): Promise<Workspace> {
    const workspaceId = WorkspaceId.fromString(id);
    const workspace = await this.workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new WorkspaceNotFoundError(id);
    }

    workspace.activate();
    await this.workspaceRepository.save(workspace);
    return workspace;
  }

  async deleteWorkspace(id: string): Promise<void> {
    const workspaceId = WorkspaceId.fromString(id);
    const workspace = await this.workspaceRepository.findById(workspaceId);

    if (!workspace) {
      throw new WorkspaceNotFoundError(id);
    }

    workspace.markAsDeleted();
    await this.workspaceRepository.save(workspace);
    await this.workspaceRepository.delete(workspaceId);
  }

  async transferOwnership(workspaceId: string, newOwnerId: string): Promise<WorkspaceDTO> {
    const id = WorkspaceId.fromString(workspaceId);
    const workspace = await this.workspaceRepository.findById(id);
    if (!workspace) throw new WorkspaceNotFoundError(workspaceId);
    if (workspace.ownerId.getValue() === newOwnerId) throw new InsufficientPermissionsError('transfer ownership to yourself');
    const previous = await this.membershipRepository.findByUserAndWorkspace(workspace.ownerId, id);
    const nextOwner = await this.membershipRepository.findByUserAndWorkspace(UserId.fromString(newOwnerId), id);
    if (!previous || !nextOwner) throw new MembershipNotFoundError(newOwnerId, workspaceId);
    previous.transferOwnershipRole(WorkspaceRole.ADMIN);
    nextOwner.transferOwnershipRole(WorkspaceRole.OWNER);
    workspace.transferOwnership(newOwnerId);
    // Release the old owner before acquiring the unique owner role.
    await this.membershipRepository.save(previous);
    await this.membershipRepository.save(nextOwner);
    await this.workspaceRepository.save(workspace);
    return Workspace.toDTO(workspace);
  }

  async getWorkspaceCount(): Promise<number> {
    return await this.workspaceRepository.count();
  }
}
