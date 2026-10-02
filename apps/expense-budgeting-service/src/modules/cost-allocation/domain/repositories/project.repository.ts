import { Project } from "../entities/project.entity";
import { ProjectId } from "../value-objects/project-id";
import {  WorkspaceId  } from '@core/domain/value-objects';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IProjectRepository {
  save(project: Project): Promise<void>;
  /** Includes inactive projects so they can be reactivated. */
  findById(id: ProjectId, workspaceId: WorkspaceId): Promise<Project | null>;
  /** Codes remain reserved while a project is inactive. */
  findByCode(code: string, workspaceId: WorkspaceId): Promise<Project | null>;
  /** Includes active and inactive projects in a deterministic order. */
  findAll(
    workspaceId: WorkspaceId,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Project>>;
}
