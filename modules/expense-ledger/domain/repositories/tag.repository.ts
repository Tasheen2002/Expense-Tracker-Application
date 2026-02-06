import { Tag } from "../entities/tag.entity";
import { TagId } from "../value-objects/tag-id";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface TagRepository {
  save(tag: Tag): Promise<void>;

  update(tag: Tag): Promise<void>;

  findById(id: TagId, workspaceId: string): Promise<Tag | null>;

  findByName(name: string, workspaceId: string): Promise<Tag | null>;

  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Tag>>;

  findByIds(ids: TagId[], workspaceId: string): Promise<Tag[]>;

  delete(id: TagId, workspaceId: string): Promise<void>;

  exists(id: TagId, workspaceId: string): Promise<boolean>;

  existsByName(name: string, workspaceId: string): Promise<boolean>;
}
