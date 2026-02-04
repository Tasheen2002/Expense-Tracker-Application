import { Workspace } from "../entities/workspace.entity";
import { WorkspaceId } from "../value-objects/workspace-id.vo";
import { UserId } from "../value-objects/user-id.vo";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IWorkspaceRepository {
  save(workspace: Workspace): Promise<void>;
  findById(id: WorkspaceId): Promise<Workspace | null>;
  findBySlug(slug: string): Promise<Workspace | null>;
  findByOwnerId(ownerId: UserId): Promise<Workspace[]>;
  findAll(options?: WorkspaceQueryOptions): Promise<PaginatedResult<Workspace>>;
  update(workspace: Workspace): Promise<void>;
  delete(id: WorkspaceId): Promise<void>;
  exists(id: WorkspaceId): Promise<boolean>;
  existsBySlug(slug: string): Promise<boolean>;
  count(): Promise<number>;
}

export interface WorkspaceQueryOptions extends PaginationOptions {
  isActive?: boolean;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}
